/**
 * FileFix File & Batch Operations Module
 * Renaming, duplicate detection (SHA-256), ZIP packaging, and file inspection.
 */

// Helper to get JSZip (window.JSZip or require)
function getJSZip() {
  if (typeof window !== 'undefined' && window.JSZip) {
    return window.JSZip;
  }
  if (typeof global !== 'undefined' && global.JSZip) {
    return global.JSZip;
  }
  try {
    if (typeof require !== 'undefined') return require('jszip');
    if (typeof global !== 'undefined' && global.require) return global.require('jszip');
  } catch (e) {
    // continue
  }
  throw new Error('JSZip library is not loaded. Please ensure jszip.min.js is included.');
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sanitizes filenames to eliminate Zip Slip / path traversal and illegal filesystem characters.
 * @param {string} name
 * @returns {string} Safe filename
 */
export function sanitizeFileName(name) {
  if (typeof name !== 'string') return 'file';
  let safe = name.replace(/\0/g, ''); // strip null bytes
  safe = safe.replace(/\.\.[\/\\]/g, ''); // remove directory traversal
  safe = safe.replace(/[\/\\]/g, '_'); // flatten any directory paths
  safe = safe.replace(/[<>:"|?*]/g, '_'); // strip illegal chars
  safe = safe.trim().replace(/^\.+/, '').replace(/\.+$/, '');
  if (safe.length > 255) safe = safe.substring(0, 255);
  return safe.length > 0 ? safe : 'file';
}

/**
 * Rename a list of files using a template pattern and options.
 * Detects and automatically resolves filename collisions!
 */
export function renameFiles(files, options = {}) {
  const pattern = options.pattern || 'Photo_{n}';
  const startNumber = parseInt(options.startNumber, 10) || 1;
  const padZeros = parseInt(options.padZeros, 10) || 1;
  const replaceSpaces = options.replaceSpaces || 'keep';
  const casing = options.casing || 'preserve';
  const prefix = options.prefix || '';
  const suffix = options.suffix || '';
  const findText = options.findText || '';
  const replaceText = options.replaceText || '';

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

  const usedNames = new Set();
  const results = [];

  files.forEach((file, idx) => {
    const rawName = file.name || `file_${idx + 1}`;
    const dotIdx = rawName.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? rawName.slice(0, dotIdx) : rawName;
    const ext = dotIdx !== -1 ? rawName.slice(dotIdx + 1) : '';

    const num = startNumber + idx;
    const numStr = String(num).padStart(padZeros, '0');

    // Replace pattern tokens
    let newBase = pattern
      .replace(/\{name\}/gi, baseName)
      .replace(/\{n\}/gi, numStr)
      .replace(/\{index\}/gi, numStr)
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{time\}/gi, timeStr)
      .replace(/\{ext\}/gi, ext);

    // Apply prefix & suffix
    newBase = `${prefix}${newBase}${suffix}`;

    // Find and replace text
    if (findText) {
      newBase = newBase.split(findText).join(replaceText);
    }

    // Space replacement
    if (replaceSpaces === 'underscore') {
      newBase = newBase.replace(/\s+/g, '_');
    } else if (replaceSpaces === 'hyphen') {
      newBase = newBase.replace(/\s+/g, '-');
    } else if (replaceSpaces === 'remove') {
      newBase = newBase.replace(/\s+/g, '');
    }

    // Casing
    if (casing === 'lowercase') {
      newBase = newBase.toLowerCase();
    } else if (casing === 'uppercase') {
      newBase = newBase.toUpperCase();
    }

    // Build final name with extension
    let targetExt = file.newExt || ext;
    let finalName = targetExt ? `${newBase}.${targetExt}` : newBase;

    // Collision detection & prevention
    if (usedNames.has(finalName)) {
      let counter = 1;
      let candidate = `${newBase}_${counter}.${targetExt}`;
      while (usedNames.has(candidate)) {
        counter++;
        candidate = `${newBase}_${counter}.${targetExt}`;
      }
      finalName = candidate;
    }
    usedNames.add(finalName);

    results.push({
      originalName: rawName,
      newName: finalName,
      file: file.data || file
    });
  });

  return results;
}

/**
 * Creates a ZIP file containing all the provided files.
 * @param {Array<{ name: string, data: Blob|Buffer|Uint8Array|string }>} files
 * @param {string} archiveName
 * @returns {Promise<Blob|Buffer>}
 */
export async function createZip(files, archiveName = 'FileFix_Export.zip') {
  const JSZip = getJSZip();
  const zip = new JSZip();

  for (const item of files) {
    const fileName = sanitizeFileName(item.name || 'file');
    let content = item.data;

    if (typeof Blob !== 'undefined' && content instanceof Blob) {
      content = await content.arrayBuffer();
    }
    zip.file(fileName, content);
  }

  if (typeof window !== 'undefined') {
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  } else {
    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}

/**
 * Calculates SHA-256 hash of a file or buffer.
 */
export async function calculateHash(input) {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    let buffer;
    if (input instanceof ArrayBuffer) {
      buffer = input;
    } else if (input instanceof Uint8Array) {
      buffer = input.buffer;
    } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
      buffer = await input.arrayBuffer();
    } else {
      throw new Error('Unsupported input for browser crypto hashing');
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js crypto
  const cryptoLib = typeof require !== 'undefined' ? require('crypto') : (typeof global !== 'undefined' && global.require ? global.require('crypto') : null);
  if (!cryptoLib) throw new Error('Crypto module unavailable');
  const hash = cryptoLib.createHash('sha256');
  if (input instanceof Buffer || input instanceof Uint8Array) {
    hash.update(input);
  } else {
    hash.update(Buffer.from(input));
  }
  return hash.digest('hex');
}

/**
 * Finds exact duplicate files using SHA-256 hash comparison.
 */
export async function findDuplicateFiles(fileList) {
  const groups = new Map();

  for (const fileItem of fileList) {
    const rawData = fileItem.data || fileItem;
    const hash = await calculateHash(rawData);
    const size = rawData.size || rawData.byteLength || rawData.length || 0;

    if (!groups.has(hash)) {
      groups.set(hash, {
        hash,
        size,
        files: []
      });
    }

    groups.get(hash).files.push({
      name: fileItem.name || 'unnamed',
      size,
      data: rawData
    });
  }

  const duplicates = [];
  let totalWastedBytes = 0;

  for (const [hash, group] of groups.entries()) {
    if (group.files.length > 1) {
      const wasted = group.size * (group.files.length - 1);
      totalWastedBytes += wasted;
      duplicates.push({
        hash,
        size: group.size,
        wastedBytes: wasted,
        count: group.files.length,
        files: group.files
      });
    }
  }

  return {
    totalChecked: fileList.length,
    duplicateGroupsCount: duplicates.length,
    totalWastedBytes,
    duplicateGroups: duplicates
  };
}

/**
 * Inspects a file's format, magic bytes, MIME type and size.
 */
export async function inspectFile(input, filename = '') {
  let bytes;
  let size = 0;

  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    size = input.size;
    const slice = input.slice(0, 16);
    bytes = new Uint8Array(await slice.arrayBuffer());
  } else if (input instanceof Uint8Array || (typeof Buffer !== 'undefined' && input instanceof Buffer)) {
    size = input.length;
    bytes = input.subarray(0, 16);
  } else if (input instanceof ArrayBuffer) {
    size = input.byteLength;
    bytes = new Uint8Array(input, 0, Math.min(16, size));
  } else {
    throw new Error('Unsupported input for file inspection');
  }

  const dotIdx = filename.lastIndexOf('.');
  const extension = dotIdx !== -1 ? filename.slice(dotIdx + 1).toLowerCase() : '';

  // Detect signature from magic bytes
  let detectedType = 'Unknown / Binary';
  let mimeType = 'application/octet-stream';

  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    detectedType = 'PDF Document';
    mimeType = 'application/pdf';
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    detectedType = 'PNG Image';
    mimeType = 'image/png';
  } else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    detectedType = 'JPEG Image';
    mimeType = 'image/jpeg';
  } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
             bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    detectedType = 'WebP Image';
    mimeType = 'image/webp';
  } else if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    detectedType = 'ZIP Archive';
    mimeType = 'application/zip';
  } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    detectedType = 'GIF Image';
    mimeType = 'image/gif';
  }

  return {
    filename,
    extension,
    detectedType,
    mimeType,
    sizeBytes: size,
    sizeFormatted: formatBytes(size),
    magicHex: Array.from(bytes.subarray(0, 8)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  };
}
