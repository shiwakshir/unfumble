/**
 * FileFix Image Operations Module
 * Dual-environment architecture:
 * - Uses native HTML5 Canvas / OffscreenCanvas in the browser (100% client-side privacy)
 * - Uses Sharp in Node.js (for backend API & automated test suite)
 */

const isNode = typeof window === 'undefined' && typeof process !== 'undefined';

// Lazy loader for Sharp in Node
let sharpLib = null;
function getSharp() {
  if (!sharpLib && isNode) {
    if (typeof global !== 'undefined' && global.sharp) {
      sharpLib = global.sharp;
    } else if (typeof require !== 'undefined') {
      sharpLib = require('sharp');
    } else if (typeof global !== 'undefined' && global.require) {
      sharpLib = global.require('sharp');
    }
  }
  return sharpLib;
}

/**
 * Loads an image from Blob, File, ArrayBuffer, or Buffer into an ImageBitmap or HTMLImageElement
 */
async function loadBrowserImage(input) {
  let blob = input;
  if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
    blob = new Blob([input]);
  }
  if (typeof createImageBitmap !== 'undefined') {
    try {
      return await createImageBitmap(blob);
    } catch (e) {
      // Fallback to Image element
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image: corrupted or unsupported format.'));
    };
    img.src = url;
  });
}

/**
 * Convert canvas to Blob with quality parameter
 */
function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(blob => {
        if (!blob) reject(new Error('Canvas export failed'));
        else resolve(blob);
      }, mimeType, quality);
    } else if (canvas.convertToBlob) {
      // OffscreenCanvas
      canvas.convertToBlob({ type: mimeType, quality }).then(resolve).catch(reject);
    } else {
      reject(new Error('Canvas toBlob is not supported'));
    }
  });
}

/**
 * Inspect image metadata (width, height, aspect ratio, type, size)
 */
export async function inspectImage(input) {
  if (isNode) {
    const sharp = getSharp();
    const meta = await sharp(input).metadata();
    const size = input.byteLength || input.length || 0;
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(meta.width, meta.height);
    return {
      width: meta.width,
      height: meta.height,
      aspectRatio: `${meta.width / divisor}:${meta.height / divisor}`,
      format: meta.format,
      mimeType: `image/${meta.format === 'jpg' ? 'jpeg' : meta.format}`,
      sizeBytes: size,
      hasAlpha: meta.hasAlpha || false
    };
  } else {
    const img = await loadBrowserImage(input);
    const width = img.width;
    const height = img.height;
    const size = input.size || (input.byteLength ? input.byteLength : 0);
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height) || 1;
    return {
      width,
      height,
      aspectRatio: `${Math.round(width / divisor)}:${Math.round(height / divisor)}`,
      format: input.type ? input.type.replace('image/', '') : 'image',
      mimeType: input.type || 'image/jpeg',
      sizeBytes: size
    };
  }
}

/**
 * Resize image using Fit, Fill, or Pad (contain with background color)
 * @param {Blob|File|Buffer|Uint8Array} input
 * @param {Object} options { width: 800, height: 600, mode: 'pad'|'fit'|'fill', padColor: '#FFFFFF', format: 'image/jpeg', quality: 0.9 }
 * @returns {Promise<Blob|Buffer>}
 */
export async function resizeImage(input, options = {}) {
  // Safety guardrail: Clamp dimensions to prevent browser canvas memory exhaustion (1 to 10,000 px)
  const targetW = Math.max(1, Math.min(10000, parseInt(options.width, 10) || 800));
  const targetH = Math.max(1, Math.min(10000, parseInt(options.height, 10) || 600));
  const mode = options.mode || 'pad';
  const padColor = options.padColor || '#FFFFFF';
  const format = options.format || 'image/jpeg';
  const quality = typeof options.quality === 'number' ? Math.max(0.1, Math.min(1.0, options.quality)) : 0.9;

  if (isNode) {
    const sharp = getSharp();
    let pipeline = sharp(input);

    if (mode === 'pad') {
      pipeline = pipeline.resize(targetW, targetH, {
        fit: 'contain',
        background: padColor
      });
    } else if (mode === 'fit') {
      pipeline = pipeline.resize(targetW, targetH, {
        fit: 'inside'
      });
    } else if (mode === 'fill') {
      pipeline = pipeline.resize(targetW, targetH, {
        fit: 'cover',
        position: 'center'
      });
    } else {
      pipeline = pipeline.resize(targetW, targetH, {
        fit: 'fill'
      });
    }

    if (format === 'image/png') {
      pipeline = pipeline.png({ quality: Math.round(quality * 100) });
    } else if (format === 'image/webp') {
      pipeline = pipeline.webp({ quality: Math.round(quality * 100) });
    } else {
      pipeline = pipeline.jpeg({ quality: Math.round(quality * 100) });
    }

    return await pipeline.toBuffer();
  }

  // Browser implementation using HTML5 Canvas
  const img = await loadBrowserImage(input);
  const srcW = img.width;
  const srcH = img.height;

  let canvasW = targetW;
  let canvasH = targetH;
  let drawX = 0;
  let drawY = 0;
  let drawW = targetW;
  let drawH = targetH;

  const srcRatio = srcW / srcH;
  const targetRatio = targetW / targetH;

  if (mode === 'pad') {
    // Pad: keep whole image inside target canvas, pad rest with color
    canvasW = targetW;
    canvasH = targetH;
    if (srcRatio > targetRatio) {
      drawW = targetW;
      drawH = Math.round(targetW / srcRatio);
      drawX = 0;
      drawY = Math.round((targetH - drawH) / 2);
    } else {
      drawH = targetH;
      drawW = Math.round(targetH * srcRatio);
      drawX = Math.round((targetW - drawW) / 2);
      drawY = 0;
    }
  } else if (mode === 'fit') {
    // Fit: canvas itself shrinks to fit aspect ratio
    if (srcRatio > targetRatio) {
      canvasW = targetW;
      canvasH = Math.round(targetW / srcRatio);
    } else {
      canvasH = targetH;
      canvasW = Math.round(targetH * srcRatio);
    }
    drawX = 0;
    drawY = 0;
    drawW = canvasW;
    drawH = canvasH;
  } else if (mode === 'fill') {
    // Fill: crop overflow
    canvasW = targetW;
    canvasH = targetH;
    if (srcRatio > targetRatio) {
      drawH = targetH;
      drawW = Math.round(targetH * srcRatio);
      drawX = Math.round((targetW - drawW) / 2);
      drawY = 0;
    } else {
      drawW = targetW;
      drawH = Math.round(targetW / srcRatio);
      drawX = 0;
      drawY = Math.round((targetH - drawH) / 2);
    }
  }

  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(canvasW, canvasH)
    : document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d');
  // Fill background
  if (mode === 'pad' || format === 'image/jpeg') {
    ctx.fillStyle = padColor;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Draw image
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  return await canvasToBlob(canvas, format, quality);
}

/**
 * Convert image format (e.g. PNG to JPG, WebP to JPG)
 */
export async function convertImage(input, options = {}) {
  const targetFormat = options.format || 'image/jpeg';
  const quality = typeof options.quality === 'number' ? options.quality : 0.9;
  const padColor = options.padColor || '#FFFFFF';

  if (isNode) {
    const sharp = getSharp();
    let pipeline = sharp(input);
    if (targetFormat === 'image/jpeg') {
      pipeline = pipeline.flatten({ background: padColor }).jpeg({ quality: Math.round(quality * 100) });
    } else if (targetFormat === 'image/png') {
      pipeline = pipeline.png();
    } else if (targetFormat === 'image/webp') {
      pipeline = pipeline.webp({ quality: Math.round(quality * 100) });
    }
    return await pipeline.toBuffer();
  }

  const img = await loadBrowserImage(input);
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(img.width, img.height)
    : document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = padColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  return await canvasToBlob(canvas, targetFormat, quality);
}

/**
 * Compress an image to meet a maximum target file size (e.g. 200 KB)
 * Uses iterative binary search over JPEG/WebP quality.
 */
export async function compressImage(input, options = {}) {
  // Safety guardrail: Minimum target size 1 KB
  const maxSizeBytes = Math.max(1 * 1024, (options.maxSizeKB || 100) * 1024);
  let targetFormat = options.format || 'image/jpeg';

  if (isNode) {
    const sharp = getSharp();
    let low = 10;
    let high = 95;
    let bestBuffer = null;

    for (let i = 0; i < 6; i++) {
      const mid = Math.round((low + high) / 2);
      const buf = await sharp(input)
        .flatten({ background: '#FFFFFF' })
        .jpeg({ quality: mid })
        .toBuffer();

      if (buf.length <= maxSizeBytes) {
        bestBuffer = buf;
        low = mid + 1; // Try higher quality
      } else {
        high = mid - 1; // Needs lower quality
      }
    }

    if (!bestBuffer) {
      // Fallback: at lowest acceptable quality
      bestBuffer = await sharp(input).flatten({ background: '#FFFFFF' }).jpeg({ quality: 15 }).toBuffer();
    }
    return bestBuffer;
  }

  // Browser implementation
  const img = await loadBrowserImage(input);
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(img.width, img.height)
    : document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  let low = 0.10;
  let high = 0.95;
  let bestBlob = null;

  for (let i = 0; i < 6; i++) {
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(canvas, targetFormat, mid);
    if (blob.size <= maxSizeBytes) {
      bestBlob = blob;
      low = mid + 0.05;
    } else {
      high = mid - 0.05;
    }
  }

  // If lowest quality is still above target byte limit, scale dimensions progressively to reach target KB
  if (!bestBlob || bestBlob.size > maxSizeBytes) {
    let scale = 0.8;
    while (scale >= 0.1) {
      const sw = Math.max(1, Math.round(img.width * scale));
      const sh = Math.max(1, Math.round(img.height * scale));
      const scaledCanvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(sw, sh)
        : document.createElement('canvas');
      scaledCanvas.width = sw;
      scaledCanvas.height = sh;
      const sCtx = scaledCanvas.getContext('2d');
      sCtx.fillStyle = '#FFFFFF';
      sCtx.fillRect(0, 0, sw, sh);
      sCtx.drawImage(img, 0, 0, sw, sh);

      const scaledBlob = await canvasToBlob(scaledCanvas, targetFormat, 0.70);
      if (scaledBlob.size <= maxSizeBytes) {
        bestBlob = scaledBlob;
        break;
      }
      scale -= 0.15;
    }
  }

  if (!bestBlob) {
    bestBlob = await canvasToBlob(canvas, targetFormat, 0.15);
  }

  return bestBlob;
}
