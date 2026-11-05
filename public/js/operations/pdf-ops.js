/**
 * Unfumble PDF Operations Module
 * Pure client-side & server-compatible PDF manipulation powered by PDF-Lib.
 */

// Helper to get PDFLib instance (from window.PDFLib or global require)
function getPDFLib() {
  if (typeof window !== 'undefined' && window.PDFLib) {
    return window.PDFLib;
  }
  if (typeof global !== 'undefined' && global.PDFLib) {
    return global.PDFLib;
  }
  try {
    return require('pdf-lib');
  } catch (e) {
    throw new Error('PDF-Lib library is not loaded. Please ensure pdf-lib.min.js is included.');
  }
}

/**
 * Converts File, Blob, ArrayBuffer, or Uint8Array into Uint8Array
 */
export async function toUint8Array(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const buffer = await input.arrayBuffer();
    return new Uint8Array(buffer);
  }
  if (input && input.buffer instanceof ArrayBuffer) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new Error('Unsupported input type for PDF conversion: ' + typeof input);
}

/**
 * Parses page range string like "1-3, 5, 7-9" into an array of 1-based page numbers.
 */
export function parsePageRangeString(rangeStr, maxPages) {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }

  const pages = new Set();
  const parts = rangeStr.split(',').map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(maxPages, parseInt(endStr, 10) || maxPages);
      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const p = parseInt(part, 10);
      if (p >= 1 && p <= maxPages) {
        pages.add(p);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Merge multiple PDF documents into a single document.
 * @param {Array<{ data: Uint8Array|File|Blob, name?: string }>} pdfFiles
 * @param {Array<number>} [order] Custom indices order (0-indexed)
 * @returns {Promise<Uint8Array>} Merged PDF bytes
 */
export async function mergePdfs(pdfFiles, order = null) {
  const { PDFDocument } = getPDFLib();
  if (!pdfFiles || pdfFiles.length === 0) {
    throw new Error('At least one PDF file must be provided to merge.');
  }

  const mergedDoc = await PDFDocument.create();
  const filesToProcess = Array.isArray(order) && order.length === pdfFiles.length
    ? order.map(idx => pdfFiles[idx])
    : pdfFiles;

  for (const item of filesToProcess) {
    const bytes = await toUint8Array(item.data || item);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }

  return await mergedDoc.save();
}

/**
 * Split a PDF into individual pages or specific ranges.
 * @param {Uint8Array|File|Blob} pdfInput
 * @param {Object} options { mode: 'all'|'range', ranges: '1-3, 5' }
 * @returns {Promise<Array<{ name: string, data: Uint8Array }>>}
 */
export async function splitPdf(pdfInput, options = { mode: 'all' }) {
  const { PDFDocument } = getPDFLib();
  const bytes = await toUint8Array(pdfInput);
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const results = [];

  if (options.mode === 'range' && options.ranges) {
    const pagesToExtract = parsePageRangeString(options.ranges, totalPages);
    if (pagesToExtract.length === 0) {
      throw new Error(`Invalid page range "${options.ranges}". Document has ${totalPages} pages.`);
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pagesToExtract.map(p => p - 1));
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }
    const outputBytes = await newDoc.save();
    results.push({
      name: `split_pages_${options.ranges.replace(/[\s,]+/g, '_')}.pdf`,
      data: outputBytes,
      pageCount: pagesToExtract.length
    });
  } else {
    // Mode 'all': Extract every single page into separate PDF
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const outputBytes = await newDoc.save();
      results.push({
        name: `page_${i + 1}.pdf`,
        data: outputBytes,
        pageCount: 1
      });
    }
  }

  return results;
}

/**
 * Rotate pages of a PDF by a given angle (90, 180, 270 degrees clockwise).
 */
export async function rotatePdf(pdfInput, { angle = 90, pages = 'all' } = {}) {
  const { PDFDocument, degrees } = getPDFLib();
  const bytes = await toUint8Array(pdfInput);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  const targetPages = parsePageRangeString(pages, totalPages);
  const normalizedAngle = ((parseInt(angle, 10) % 360) + 360) % 360;

  for (const pageNum of targetPages) {
    const page = doc.getPage(pageNum - 1);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + normalizedAngle) % 360));
  }

  return await doc.save();
}

/**
 * Delete specified pages from a PDF document.
 */
export async function deletePdfPages(pdfInput, { pages = '' } = {}) {
  const { PDFDocument } = getPDFLib();
  const bytes = await toUint8Array(pdfInput);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (!pages || !pages.trim()) {
    return bytes; // nothing to delete
  }

  const pagesToDelete = parsePageRangeString(pages, totalPages);
  if (pagesToDelete.length >= totalPages) {
    throw new Error('Cannot delete all pages in the PDF document.');
  }

  // Remove pages from highest index to lowest so remaining indices don't shift
  const sortedDesc = [...pagesToDelete].sort((a, b) => b - a);
  for (const pageNum of sortedDesc) {
    doc.removePage(pageNum - 1);
  }

  return await doc.save();
}

/**
 * Extract selected pages into a new PDF document.
 */
export async function extractPdfPages(pdfInput, { pages = '1' } = {}) {
  const { PDFDocument } = getPDFLib();
  const bytes = await toUint8Array(pdfInput);
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const targetPages = parsePageRangeString(pages, totalPages);
  if (targetPages.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, targetPages.map(p => p - 1));
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return await newDoc.save();
}

/**
 * Reorder pages according to a new index order (0-based array of indices).
 */
export async function reorderPdf(pdfInput, newIndices) {
  const { PDFDocument } = getPDFLib();
  const bytes = await toUint8Array(pdfInput);
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (!Array.isArray(newIndices) || newIndices.length !== totalPages) {
    throw new Error(`Invalid reorder indices. Expected array of length ${totalPages}.`);
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, newIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return await newDoc.save();
}

/**
 * Convert multiple images into a single PDF document.
 * @param {Array<{ data: Uint8Array|File|Blob, type?: string, name?: string }>} images
 * @param {Object} options { pageSize: 'fit_image'|'a4'|'letter', margin: 0 }
 */
export async function convertImagesToPdf(images, options = {}) {
  const { PDFDocument, PageSizes } = getPDFLib();
  if (!images || images.length === 0) {
    throw new Error('Please provide at least one image to convert to PDF.');
  }

  const pageSizeOpt = options.pageSize || 'fit_image';
  const margin = Number(options.margin) || 0;

  const pdfDoc = await PDFDocument.create();

  for (const imgItem of images) {
    const rawBytes = await toUint8Array(imgItem.data || imgItem);
    let embeddedImg;

    // Detect format from bytes or mime
    const isPng = rawBytes[0] === 0x89 && rawBytes[1] === 0x50 && rawBytes[2] === 0x4E && rawBytes[3] === 0x47;
    try {
      if (isPng) {
        embeddedImg = await pdfDoc.embedPng(rawBytes);
      } else {
        embeddedImg = await pdfDoc.embedJpg(rawBytes);
      }
    } catch (err) {
      // If embed failed (e.g. was WebP or unrecognized), we inform the user
      throw new Error(`Could not embed image "${imgItem.name || 'unnamed'}": ${err.message}. Ensure images are valid JPG or PNG format.`);
    }

    const { width: imgW, height: imgH } = embeddedImg;

    if (pageSizeOpt === 'fit_image') {
      const page = pdfDoc.addPage([imgW + margin * 2, imgH + margin * 2]);
      page.drawImage(embeddedImg, {
        x: margin,
        y: margin,
        width: imgW,
        height: imgH
      });
    } else {
      const standardSize = pageSizeOpt === 'letter' ? PageSizes.Letter : PageSizes.A4;
      const [pageW, pageH] = standardSize;
      const page = pdfDoc.addPage(standardSize);

      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const scale = Math.min(usableW / imgW, usableH / imgH, 1);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const posX = margin + (usableW - drawW) / 2;
      const posY = margin + (usableH - drawH) / 2;

      page.drawImage(embeddedImg, {
        x: posX,
        y: posY,
        width: drawW,
        height: drawH
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Compress and optimize a PDF document.
 * Defragments the document, strips unreferenced objects, and enables object streams.
 * @param {Uint8Array|File|Blob} pdfInput
 * @param {Object} options { level: 'lossless'|'balanced' }
 * @returns {Promise<{ data: Uint8Array, originalSize: number, compressedSize: number, reductionPercent: number }>}
 */
export async function compressPdf(pdfInput, options = { level: 'balanced' }) {
  const { PDFDocument } = getPDFLib();
  const bytes = await toUint8Array(pdfInput);
  const originalSize = bytes.byteLength || bytes.length;

  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  // Create a clean new document and copy pages to defragment and discard orphaned objects
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  // Handle metadata according to compression level
  const level = options.level || 'balanced';
  if (level === 'lossless') {
    if (srcDoc.getTitle()) newDoc.setTitle(srcDoc.getTitle());
    if (srcDoc.getAuthor()) newDoc.setAuthor(srcDoc.getAuthor());
    if (srcDoc.getSubject()) newDoc.setSubject(srcDoc.getSubject());
    if (srcDoc.getKeywords()) newDoc.setKeywords(srcDoc.getKeywords());
    if (srcDoc.getProducer()) newDoc.setProducer(srcDoc.getProducer());
    if (srcDoc.getCreator()) newDoc.setCreator(srcDoc.getCreator());
  } else if (level === 'balanced') {
    if (srcDoc.getTitle()) newDoc.setTitle(srcDoc.getTitle());
    if (srcDoc.getAuthor()) newDoc.setAuthor(srcDoc.getAuthor());
  }
  // If 'extreme', strip all metadata to maximize compression

  // Save with object streams compression enabled
  const compressedBytes = await newDoc.save({
    useObjectStreams: true,
    addDefaultPage: false
  });

  const compressedSize = compressedBytes.byteLength || compressedBytes.length;
  const reduction = originalSize > compressedSize ? originalSize - compressedSize : 0;
  const reductionPercent = originalSize > 0 ? Math.round((reduction / originalSize) * 100) : 0;

  return {
    data: compressedBytes,
    originalSize,
    compressedSize,
    reductionPercent,
    pageCount: totalPages
  };
}

/**
 * Inspect PDF metadata and structural information.
 */
export async function inspectPdf(pdfInput) {
  const { PDFDocument } = getPDFLib();
  const bytes = await toUint8Array(pdfInput);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const pageCount = doc.getPageCount();
  const pages = [];
  for (let i = 0; i < pageCount; i++) {
    const p = doc.getPage(i);
    const { width, height } = p.getSize();
    const rotation = p.getRotation().angle;
    pages.push({
      pageNumber: i + 1,
      width: Math.round(width),
      height: Math.round(height),
      rotation
    });
  }

  return {
    pageCount,
    title: doc.getTitle() || 'Untitled',
    author: doc.getAuthor() || 'Unknown',
    subject: doc.getSubject() || '',
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    creationDate: doc.getCreationDate() ? doc.getCreationDate().toISOString() : null,
    modificationDate: doc.getModificationDate() ? doc.getModificationDate().toISOString() : null,
    pages
  };
}
