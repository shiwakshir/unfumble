/**
 * Unfumble Smart Fix Module
 * Intelligent file rejection diagnostic & automatic repair engine.
 */

import { inspectFile, formatBytes } from '../operations/file-ops.js';
import { inspectImage, resizeImage, convertImage, compressImage } from '../operations/image-ops.js';
import { inspectPdf, extractPdfPages } from '../operations/pdf-ops.js';

export const SMARTFIX_PRESETS = {
  passport_visa: {
    id: 'passport_visa',
    name: 'US / Schengen Visa & Passport Photo',
    description: 'JPG only, exactly 600×600 px (square 1:1), maximum 240 KB',
    rules: {
      allowedFormats: ['image/jpeg'],
      allowedExtensions: ['jpg', 'jpeg'],
      maxSizeKB: 240,
      exactWidth: 600,
      exactHeight: 600,
      aspectRatio: '1:1'
    }
  },
  job_portal: {
    id: 'job_portal',
    name: 'Job Application Portal (Resume / CV)',
    description: 'PDF only, maximum 2 MB (2048 KB), maximum 3 pages',
    rules: {
      allowedFormats: ['application/pdf'],
      allowedExtensions: ['pdf'],
      maxSizeKB: 2048,
      maxPages: 3
    }
  },
  gov_portal: {
    id: 'gov_portal',
    name: 'Government Submission Portal',
    description: 'PDF or JPG, maximum 1 MB (1024 KB)',
    rules: {
      allowedFormats: ['application/pdf', 'image/jpeg'],
      allowedExtensions: ['pdf', 'jpg', 'jpeg'],
      maxSizeKB: 1024
    }
  },
  academic_paper: {
    id: 'academic_paper',
    name: 'Academic Journal Submission',
    description: 'PDF only, maximum 10 MB (10240 KB)',
    rules: {
      allowedFormats: ['application/pdf'],
      allowedExtensions: ['pdf'],
      maxSizeKB: 10240
    }
  }
};

/**
 * Parses freeform error text or website upload instructions into structured validation rules.
 */
export function parseRequirementsText(text) {
  if (!text || typeof text !== 'string') return {};

  const t = text.toLowerCase();
  const rules = {};

  // Formats
  const formats = [];
  const exts = [];
  if (t.includes('pdf')) { formats.push('application/pdf'); exts.push('pdf'); }
  if (t.includes('jpg') || t.includes('jpeg')) { formats.push('image/jpeg'); exts.push('jpg', 'jpeg'); }
  if (t.includes('png')) { formats.push('image/png'); exts.push('png'); }
  if (t.includes('webp')) { formats.push('image/webp'); exts.push('webp'); }
  if (formats.length > 0) {
    rules.allowedFormats = formats;
    rules.allowedExtensions = exts;
  }

  // File size: "max 2mb", "smaller than 500 kb", "not exceed 10 mb"
  const sizeMatch = text.match(/(?:max|maximum|smaller than|under|below|not exceed|limit of)?\s*(\d+(?:\.\d+)?)\s*(kb|mb)/i);
  if (sizeMatch) {
    const val = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toLowerCase();
    rules.maxSizeKB = unit === 'mb' ? Math.round(val * 1024) : Math.round(val);
  }

  // Dimensions: 600x600, 800 by 600, 1920x1080
  const dimMatch = text.match(/(\d{2,5})\s*(?:x|by|\*|×)\s*(\d{2,5})/i);
  if (dimMatch) {
    rules.exactWidth = parseInt(dimMatch[1], 10);
    rules.exactHeight = parseInt(dimMatch[2], 10);
  }

  // Page limit: max 2 pages, up to 5 pages
  const pageMatch = text.match(/(?:max|maximum|up to|limit of)?\s*(\d+)\s*pages?/i);
  if (pageMatch) {
    rules.maxPages = parseInt(pageMatch[1], 10);
  }

  return rules;
}

/**
 * Inspects a file and diagnoses compliance against validation rules.
 * @param {File|Blob|{name: string, data: any}} file
 * @param {Object} rules
 * @returns {Promise<Object>} Diagnostic result with checklist of Pass / Fail / Cannot Verify
 */
export async function diagnoseFile(file, rules = {}) {
  const fileRaw = file.data || file;
  const filename = file.name || 'unnamed_file';

  const baseInspection = await inspectFile(fileRaw, filename);
  const sizeKB = Math.round(baseInspection.sizeBytes / 1024);

  let imageInfo = null;
  let pdfInfo = null;

  if (baseInspection.mimeType.startsWith('image/')) {
    try {
      imageInfo = await inspectImage(fileRaw);
    } catch (e) {
      // Ignored if image parsing fails
    }
  } else if (baseInspection.mimeType === 'application/pdf') {
    try {
      pdfInfo = await inspectPdf(fileRaw);
    } catch (e) {
      // Ignored if pdf parsing fails
    }
  }

  const checklist = [];
  let overallPass = true;
  const suggestedFixes = [];

  // 1. Format & Extension Check
  if (rules.allowedFormats && rules.allowedFormats.length > 0) {
    const formatMatches = rules.allowedFormats.includes(baseInspection.mimeType);
    const extMatches = rules.allowedExtensions
      ? rules.allowedExtensions.includes(baseInspection.extension)
      : true;

    if (formatMatches && extMatches) {
      checklist.push({
        id: 'format',
        name: 'File Format & Extension',
        status: 'pass',
        details: `Current format: ${baseInspection.detectedType} (.${baseInspection.extension}) matches required.`
      });
    } else {
      checklist.push({
        id: 'format',
        name: 'File Format & Extension',
        status: 'fail',
        details: `File is ${baseInspection.detectedType} (.${baseInspection.extension}), but portal requires ${rules.allowedExtensions.join(' or ').toUpperCase()}.`
      });
      overallPass = false;
      const targetMime = rules.allowedFormats[0];
      suggestedFixes.push({
        type: 'convert_format',
        description: `Convert file to ${rules.allowedExtensions[0].toUpperCase()}`,
        targetFormat: targetMime
      });
    }
  }

  // 2. File Size Check
  if (rules.maxSizeKB) {
    if (sizeKB <= rules.maxSizeKB) {
      checklist.push({
        id: 'size',
        name: 'File Size Limit',
        status: 'pass',
        details: `Size ${formatBytes(baseInspection.sizeBytes)} is within the ${formatBytes(rules.maxSizeKB * 1024)} limit.`
      });
    } else {
      checklist.push({
        id: 'size',
        name: 'File Size Limit',
        status: 'fail',
        details: `Size ${formatBytes(baseInspection.sizeBytes)} exceeds maximum allowed ${formatBytes(rules.maxSizeKB * 1024)}.`
      });
      overallPass = false;
      suggestedFixes.push({
        type: 'compress',
        description: `Compress file below ${formatBytes(rules.maxSizeKB * 1024)}`,
        maxSizeKB: rules.maxSizeKB
      });
    }
  }

  // 3. Image Dimensions Check
  if (rules.exactWidth && rules.exactHeight) {
    if (imageInfo) {
      if (imageInfo.width === rules.exactWidth && imageInfo.height === rules.exactHeight) {
        checklist.push({
          id: 'dimensions',
          name: 'Image Dimensions',
          status: 'pass',
          details: `Dimensions are exactly ${imageInfo.width}×${imageInfo.height} px.`
        });
      } else {
        checklist.push({
          id: 'dimensions',
          name: 'Image Dimensions',
          status: 'fail',
          details: `Current dimensions are ${imageInfo.width}×${imageInfo.height} px. Portal requires ${rules.exactWidth}×${rules.exactHeight} px.`
        });
        overallPass = false;
        suggestedFixes.push({
          type: 'resize',
          description: `Resize & pad image to ${rules.exactWidth}×${rules.exactHeight} px`,
          width: rules.exactWidth,
          height: rules.exactHeight,
          mode: 'pad'
        });
      }
    } else {
      checklist.push({
        id: 'dimensions',
        name: 'Image Dimensions',
        status: 'cannot_verify',
        details: 'Cannot verify pixel dimensions on this file type.'
      });
    }
  }

  // 4. PDF Page Count Check
  if (rules.maxPages) {
    if (pdfInfo) {
      if (pdfInfo.pageCount <= rules.maxPages) {
        checklist.push({
          id: 'page_count',
          name: 'PDF Page Count',
          status: 'pass',
          details: `Document has ${pdfInfo.pageCount} page(s), within limit of ${rules.maxPages}.`
        });
      } else {
        checklist.push({
          id: 'page_count',
          name: 'PDF Page Count',
          status: 'fail',
          details: `Document has ${pdfInfo.pageCount} pages, exceeding the maximum of ${rules.maxPages}.`
        });
        overallPass = false;
        suggestedFixes.push({
          type: 'split_pages',
          description: `Extract first ${rules.maxPages} pages`,
          maxPages: rules.maxPages
        });
      }
    } else if (baseInspection.mimeType === 'application/pdf') {
      checklist.push({
        id: 'page_count',
        name: 'PDF Page Count',
        status: 'cannot_verify',
        details: 'Unable to count pages (possibly password protected).'
      });
    }
  }

  return {
    file: baseInspection,
    imageInfo,
    pdfInfo,
    overallPass,
    checklist,
    suggestedFixes
  };
}

/**
 * "Fix Everything Possible"
 * Automatically executes necessary repairs and re-validates the result!
 */
export async function repairFile(file, rules = {}) {
  const diagnosis = await diagnoseFile(file, rules);
  if (diagnosis.overallPass) {
    return {
      success: true,
      modified: false,
      message: 'File already complies with all portal requirements!',
      repairedFile: file.data || file,
      repairedName: file.name,
      before: diagnosis,
      after: diagnosis
    };
  }

  let currentData = file.data || file;
  let currentName = file.name || 'repaired_file';
  let isImage = diagnosis.file.mimeType.startsWith('image/');
  let isPdf = diagnosis.file.mimeType === 'application/pdf';

  // Step 1: Format Conversion if requested
  const formatFix = diagnosis.suggestedFixes.find(f => f.type === 'convert_format');
  if (formatFix && isImage) {
    const targetFormat = formatFix.targetFormat;
    currentData = await convertImage(currentData, { format: targetFormat, quality: 0.95 });
    const ext = targetFormat === 'image/jpeg' ? 'jpg' : (targetFormat === 'image/png' ? 'png' : 'webp');
    currentName = currentName.replace(/\.[^/.]+$/, `.${ext}`);
  }

  // Step 2: Dimensions Resize & Pad if needed
  const resizeFix = diagnosis.suggestedFixes.find(f => f.type === 'resize');
  if (resizeFix && isImage) {
    currentData = await resizeImage(currentData, {
      width: resizeFix.width,
      height: resizeFix.height,
      mode: 'pad',
      padColor: '#FFFFFF',
      format: formatFix ? formatFix.targetFormat : 'image/jpeg',
      quality: 0.95
    });
  }

  // Step 3: PDF Page Reduction if needed
  const pageFix = diagnosis.suggestedFixes.find(f => f.type === 'split_pages');
  if (pageFix && isPdf) {
    const pagesRange = `1-${pageFix.maxPages}`;
    currentData = await extractPdfPages(currentData, { pages: pagesRange });
  }

  // Step 4: Compression if size exceeds target
  const compressFix = diagnosis.suggestedFixes.find(f => f.type === 'compress');
  if (compressFix) {
    if (isImage) {
      currentData = await compressImage(currentData, {
        maxSizeKB: compressFix.maxSizeKB,
        format: formatFix ? formatFix.targetFormat : 'image/jpeg'
      });
    } else if (isPdf) {
      // Re-save PDF structure
      currentData = await extractPdfPages(currentData, { pages: 'all' });
    }
  }

  // Re-diagnose repaired file to verify compliance
  const afterDiagnosis = await diagnoseFile({ data: currentData, name: currentName }, rules);

  return {
    success: true,
    modified: true,
    repairedFile: currentData,
    repairedName: currentName,
    before: diagnosis,
    after: afterDiagnosis
  };
}
