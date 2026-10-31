/**
 * FileFix Workflow Engine
 * Executes validated file processing workflows sequentially or as pipelines.
 */

import { getOperation } from '../operations/registry.js';
import * as pdfOps from '../operations/pdf-ops.js';
import * as imageOps from '../operations/image-ops.js';
import * as fileOps from '../operations/file-ops.js';
import * as dataOps from '../operations/data-ops.js';

/**
 * Dispatches an operation by ID with specified parameters and input data.
 */
export async function executeOperation(operationId, inputData, params = {}) {
  switch (operationId) {
    // PDF Operations
    case 'merge_pdf':
      return await pdfOps.mergePdfs(inputData, params.order);
    case 'split_pdf':
      return await pdfOps.splitPdf(inputData, params);
    case 'rotate_pdf':
      return await pdfOps.rotatePdf(inputData, params);
    case 'delete_pdf_pages':
      return await pdfOps.deletePdfPages(inputData, params);
    case 'extract_pdf_pages':
      return await pdfOps.extractPdfPages(inputData, params);
    case 'reorder_pdf':
      return await pdfOps.reorderPdf(inputData, params.indices);
    case 'convert_images_to_pdf':
      return await pdfOps.convertImagesToPdf(inputData, params);
    case 'compress_pdf':
      const compRes = await pdfOps.compressPdf(inputData, params);
      return compRes.data;

    // Image Operations
    case 'resize_image':
      return await imageOps.resizeImage(inputData, params);
    case 'convert_image':
      return await imageOps.convertImage(inputData, params);
    case 'compress_image':
      return await imageOps.compressImage(inputData, params);

    // Utility & Batch
    case 'rename_file':
      return fileOps.renameFiles(inputData, params);
    case 'create_zip':
      return await fileOps.createZip(inputData, params.archiveName);
    case 'find_duplicates':
      return await fileOps.findDuplicateFiles(inputData);

    // Data
    case 'convert_csv':
      if (params.targetFormat === 'json') {
        const text = typeof inputData === 'string' ? inputData : new TextDecoder().decode(inputData);
        return JSON.stringify(dataOps.csvToJson(text), null, 2);
      } else if (params.targetFormat === 'tsv') {
        const text = typeof inputData === 'string' ? inputData : new TextDecoder().decode(inputData);
        const { headers, rows } = dataOps.parseCSV(text);
        return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      }
      return inputData;

    default:
      throw new Error(`Unsupported or unknown operation: "${operationId}"`);
  }
}

/**
 * Executes a full multi-step workflow on a list of input files.
 * @param {Object} workflow Validated workflow specification
 * @param {Array<File|Blob|{name: string, data: any}>} inputFiles
 * @param {Function} [onProgress] Callback for progress updates: ({ stepIndex, totalSteps, stepName, fileIndex, totalFiles, percent })
 * @returns {Promise<{ outputs: Array<{ name: string, data: any, size: number, originalSize: number }>, summary: Object }>}
 */
export async function runWorkflow(workflow, inputFiles, onProgress = () => {}) {
  if (!workflow || !Array.isArray(workflow.operations) || workflow.operations.length === 0) {
    throw new Error('Invalid workflow: no operations specified.');
  }
  if (workflow.operations.length > 20) {
    throw new Error('Security Exception: Workflows cannot exceed 20 consecutive operations.');
  }
  if (!inputFiles || inputFiles.length === 0) {
    throw new Error('Please provide at least one input file to run this tool.');
  }
  if (inputFiles.length > 500) {
    throw new Error('Security Exception: Batch processing is limited to 500 files per run to protect browser memory.');
  }

  // Verify all operations against registered whitelist
  for (const step of workflow.operations) {
    if (!step.operationId || !getOperation(step.operationId)) {
      throw new Error(`Security Exception: Unregistered or unauthorized operation: "${step.operationId}"`);
    }
  }

  const startTime = Date.now();
  let currentItems = inputFiles.map(f => ({
    name: f.name || 'file',
    data: f.data || f,
    originalSize: f.size || (f.data ? f.data.length || f.data.byteLength : 0) || 0
  }));

  const totalSteps = workflow.operations.length;

  for (let sIdx = 0; sIdx < totalSteps; sIdx++) {
    const step = workflow.operations[sIdx];
    const opDef = getOperation(step.operationId);
    const stepName = opDef ? opDef.name : step.operationId;
    const params = step.params || {};

    onProgress({
      stepIndex: sIdx + 1,
      totalSteps,
      stepName,
      fileIndex: 0,
      totalFiles: currentItems.length,
      percent: Math.round((sIdx / totalSteps) * 100)
    });

    if (step.operationId === 'merge_pdf') {
      const mergedBytes = await executeOperation('merge_pdf', currentItems, params);
      const outputName = params.outputName || 'Merged_Document.pdf';
      currentItems = [{
        name: outputName,
        data: mergedBytes,
        originalSize: currentItems.reduce((acc, c) => acc + c.originalSize, 0)
      }];
    } else if (step.operationId === 'convert_images_to_pdf') {
      const pdfBytes = await executeOperation('convert_images_to_pdf', currentItems, params);
      const outputName = params.outputName || 'Combined_Images.pdf';
      currentItems = [{
        name: outputName,
        data: pdfBytes,
        originalSize: currentItems.reduce((acc, c) => acc + c.originalSize, 0)
      }];
    } else if (step.operationId === 'rename_file') {
      const renamed = fileOps.renameFiles(currentItems, params);
      currentItems = renamed.map(r => ({
        name: r.newName,
        data: r.file,
        originalSize: r.file.originalSize || (r.file.size || 0)
      }));
    } else if (step.operationId === 'create_zip') {
      const zipData = await fileOps.createZip(currentItems, params.archiveName);
      currentItems = [{
        name: params.archiveName || 'Archive.zip',
        data: zipData,
        originalSize: currentItems.reduce((acc, c) => acc + c.originalSize, 0)
      }];
    } else {
      // Per-item operation (e.g. resize_image, convert_image, compress_image, rotate_pdf, delete_pdf_pages)
      const newItems = [];
      for (let fIdx = 0; fIdx < currentItems.length; fIdx++) {
        const item = currentItems[fIdx];
        onProgress({
          stepIndex: sIdx + 1,
          totalSteps,
          stepName,
          fileIndex: fIdx + 1,
          totalFiles: currentItems.length,
          percent: Math.round(((sIdx + (fIdx / currentItems.length)) / totalSteps) * 100)
        });

        // Determine if target format alters extension
        let updatedName = item.name;
        if (step.operationId === 'convert_image' && params.format) {
          const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
          const newExt = extMap[params.format] || 'jpg';
          const dotIdx = updatedName.lastIndexOf('.');
          const base = dotIdx !== -1 ? updatedName.slice(0, dotIdx) : updatedName;
          updatedName = `${base}.${newExt}`;
        }

        const processedData = await executeOperation(step.operationId, item.data, params);

        newItems.push({
          name: updatedName,
          data: processedData,
          originalSize: item.originalSize
        });
      }
      currentItems = newItems;
    }
  }

  onProgress({
    stepIndex: totalSteps,
    totalSteps,
    stepName: 'Complete',
    fileIndex: currentItems.length,
    totalFiles: currentItems.length,
    percent: 100
  });

  const finalOutputs = currentItems.map(item => {
    let size = 0;
    if (item.data instanceof Uint8Array || (typeof Buffer !== 'undefined' && item.data instanceof Buffer)) {
      size = item.data.byteLength || item.data.length;
    } else if (typeof Blob !== 'undefined' && item.data instanceof Blob) {
      size = item.data.size;
    } else if (typeof item.data === 'string') {
      size = new Blob ? new Blob([item.data]).size : item.data.length;
    }

    return {
      name: item.name,
      data: item.data,
      size,
      originalSize: item.originalSize
    };
  });

  const durationMs = Date.now() - startTime;

  return {
    outputs: finalOutputs,
    summary: {
      totalProcessed: finalOutputs.length,
      durationMs,
      totalOriginalSize: finalOutputs.reduce((acc, f) => acc + f.originalSize, 0),
      totalFinalSize: finalOutputs.reduce((acc, f) => acc + f.size, 0)
    }
  };
}
