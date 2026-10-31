/**
 * FileFix Automated Test Suite
 * Verifies all Phase 1 core operations, workflow engine, Smart Fix, and security safeguards.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

global.require = require;
global.PDFLib = require('pdf-lib');
global.JSZip = require('jszip');
global.sharp = require('sharp');

const { PDFDocument, rgb } = require('pdf-lib');
const sharp = require('sharp');
const JSZip = require('jszip');
const crypto = require('crypto');

import * as pdfOps from '../public/js/operations/pdf-ops.js';
import * as imageOps from '../public/js/operations/image-ops.js';
import * as fileOps from '../public/js/operations/file-ops.js';
import * as dataOps from '../public/js/operations/data-ops.js';
import { runWorkflow } from '../public/js/workflow/engine.js';
import { parseLocally } from '../public/js/workflow/nlp-parser.js';
import { diagnoseFile, repairFile } from '../public/js/smartfix/smartfix.js';
import { encodeWorkflowToHash, decodeWorkflowFromHash } from '../public/js/workflow/share.js';

// --- Test Helpers ---
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

/**
 * Creates a valid synthetic PDF with specified page count and text
 */
async function createSyntheticPdf(pages = 2, label = 'TestDoc') {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`${label} - Page ${i}`, {
      x: 50,
      y: 550,
      size: 24,
      color: rgb(0.1, 0.5, 0.5)
    });
  }
  return await doc.save();
}

/**
 * Creates a valid synthetic PNG image
 */
async function createSyntheticPng(width = 400, height = 300, color = { r: 100, g: 150, b: 200, alpha: 1 }) {
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color
    }
  }).png().toBuffer();
}

async function runAllTests() {
  console.log(`\n======================================================`);
  console.log(`  FileFix Automated Test Suite`);
  console.log(`======================================================\n`);

  // --- TEST 1: Merge three PDFs preserving page order ---
  console.log(`[Suite 1] PDF Operations:`);
  try {
    const pdf1 = await createSyntheticPdf(2, 'DocA');
    const pdf2 = await createSyntheticPdf(1, 'DocB');
    const pdf3 = await createSyntheticPdf(3, 'DocC');

    const merged = await pdfOps.mergePdfs([
      { data: pdf1, name: 'DocA.pdf' },
      { data: pdf2, name: 'DocB.pdf' },
      { data: pdf3, name: 'DocC.pdf' }
    ]);

    const inspect = await pdfOps.inspectPdf(merged);
    assert(inspect.pageCount === 6, `Merged PDF has exactly 6 pages (2+1+3), got ${inspect.pageCount}`);
  } catch (err) {
    assert(false, `Merge three PDFs threw error: ${err.message}`);
  }

  // --- TEST 2: Split a PDF at selected pages ---
  try {
    const doc5 = await createSyntheticPdf(5, 'Doc5');
    const splitResults = await pdfOps.splitPdf(doc5, { mode: 'range', ranges: '1-2, 4' });
    assert(splitResults.length === 1, 'Split range produced result');
    const inspectSplit = await pdfOps.inspectPdf(splitResults[0].data);
    assert(inspectSplit.pageCount === 3, `Split extracted exactly 3 pages (1-2, 4), got ${inspectSplit.pageCount}`);

    const splitAll = await pdfOps.splitPdf(doc5, { mode: 'all' });
    assert(splitAll.length === 5, `Split 'all' produced 5 individual files, got ${splitAll.length}`);
  } catch (err) {
    assert(false, `Split PDF threw error: ${err.message}`);
  }

  // --- TEST 3: Delete and rotate PDF pages ---
  try {
    const doc4 = await createSyntheticPdf(4, 'Doc4');
    const withDeleted = await pdfOps.deletePdfPages(doc4, { pages: '2' });
    const inspDeleted = await pdfOps.inspectPdf(withDeleted);
    assert(inspDeleted.pageCount === 3, `Page 2 deleted, 3 pages remain, got ${inspDeleted.pageCount}`);

    const rotated = await pdfOps.rotatePdf(doc4, { angle: 90, pages: '1' });
    const inspRotated = await pdfOps.inspectPdf(rotated);
    assert(inspRotated.pages[0].rotation === 90, `Page 1 rotated by 90 degrees, got ${inspRotated.pages[0].rotation}`);

    // Test PDF Compression / stream optimization
    const compressed = await pdfOps.compressPdf(doc4, { level: 'balanced' });
    assert(compressed.data && compressed.data.length > 0, 'PDF compression produced valid byte buffer');
    assert(compressed.pageCount === 4, `Compressed PDF preserved page count, got ${compressed.pageCount}`);
  } catch (err) {
    assert(false, `Delete and rotate pages threw error: ${err.message}`);
  }

  // --- TEST 4: Image Resizing with Fit, Fill, and Pad modes ---
  console.log(`\n[Suite 2] Image Operations:`);
  try {
    const srcPng = await createSyntheticPng(400, 200); // 2:1 aspect ratio

    // Test Pad mode to 600x800
    const padded = await imageOps.resizeImage(srcPng, {
      width: 600,
      height: 800,
      mode: 'pad',
      padColor: '#FFFFFF',
      format: 'image/jpeg'
    });
    const metaPadded = await sharp(padded).metadata();
    assert(metaPadded.width === 600 && metaPadded.height === 800, `Padded image dimensions match 600×800 exactly, got ${metaPadded.width}×${metaPadded.height}`);

    // Test Fit mode
    const fitted = await imageOps.resizeImage(srcPng, {
      width: 600,
      height: 800,
      mode: 'fit'
    });
    const metaFitted = await sharp(fitted).metadata();
    assert(metaFitted.width <= 600 && metaFitted.height <= 800, `Fitted image fits inside boundary, got ${metaFitted.width}×${metaFitted.height}`);

    // Test Fill mode
    const filled = await imageOps.resizeImage(srcPng, {
      width: 500,
      height: 500,
      mode: 'fill'
    });
    const metaFilled = await sharp(filled).metadata();
    assert(metaFilled.width === 500 && metaFilled.height === 500, `Filled image cropped to exactly 500×500, got ${metaFilled.width}×${metaFilled.height}`);
  } catch (err) {
    assert(false, `Resize operations threw error: ${err.message}`);
  }

  // --- TEST 5: Image Compression targeting max file size ---
  try {
    const largePng = await createSyntheticPng(1200, 1000);
    const compressed = await imageOps.compressImage(largePng, { maxSizeKB: 100, format: 'image/jpeg' });
    const sizeKB = compressed.length / 1024;
    assert(sizeKB <= 100, `Image compressed below 100 KB target, got ${sizeKB.toFixed(1)} KB`);
  } catch (err) {
    assert(false, `Compress image threw error: ${err.message}`);
  }

  // --- TEST 6: Format conversion PNG to genuine JPG ---
  try {
    const srcPng = await createSyntheticPng(300, 300);
    const convertedJpg = await imageOps.convertImage(srcPng, { format: 'image/jpeg', quality: 0.9 });
    const metaJpg = await sharp(convertedJpg).metadata();
    assert(metaJpg.format === 'jpeg', `Converted image is genuine JPEG format, got ${metaJpg.format}`);
  } catch (err) {
    assert(false, `Convert image threw error: ${err.message}`);
  }

  // --- TEST 7: Convert images to PDF ---
  try {
    const img1 = await createSyntheticPng(300, 200);
    const img2 = await createSyntheticPng(400, 400);
    const pdfDocBytes = await pdfOps.convertImagesToPdf([
      { data: img1, name: 'img1.png' },
      { data: img2, name: 'img2.png' }
    ], { pageSize: 'a4', margin: 10 });

    const inspPdf = await pdfOps.inspectPdf(pdfDocBytes);
    assert(inspPdf.pageCount === 2, `Images converted into 2-page PDF, got ${inspPdf.pageCount}`);
  } catch (err) {
    assert(false, `Convert images to PDF threw error: ${err.message}`);
  }

  // --- TEST 8: Rename files with pattern & collision avoidance ---
  console.log(`\n[Suite 3] Batch & Utility Operations:`);
  try {
    const filesToRename = [
      { name: 'My Photo A.jpg', data: Buffer.from('a') },
      { name: 'My Photo B.jpg', data: Buffer.from('b') },
      { name: 'My Photo C.jpg', data: Buffer.from('c') }
    ];

    const renamed = fileOps.renameFiles(filesToRename, {
      pattern: 'Photo_{n}',
      startNumber: 1,
      padZeros: 1,
      replaceSpaces: 'keep'
    });

    assert(renamed[0].newName === 'Photo_1.jpg', `First file renamed to Photo_1.jpg, got ${renamed[0].newName}`);
    assert(renamed[1].newName === 'Photo_2.jpg', `Second file renamed to Photo_2.jpg, got ${renamed[1].newName}`);
    assert(renamed[2].newName === 'Photo_3.jpg', `Third file renamed to Photo_3.jpg, got ${renamed[2].newName}`);

    // Collision prevention test
    const collisionInputs = [
      { name: 'document.pdf', data: Buffer.from('1') },
      { name: 'document.pdf', data: Buffer.from('2') }
    ];
    const collisionResolved = fileOps.renameFiles(collisionInputs, { pattern: 'Report' });
    assert(collisionResolved[0].newName !== collisionResolved[1].newName, 'Duplicate names resolved without collision');
  } catch (err) {
    assert(false, `Rename files threw error: ${err.message}`);
  }

  // --- TEST 9: Create valid ZIP package ---
  try {
    const items = [
      { name: 'test1.txt', data: 'Hello World' },
      { name: 'test2.txt', data: 'FileFix Package' }
    ];
    const zipBuffer = await fileOps.createZip(items, 'Test.zip');
    const zip = await JSZip.loadAsync(zipBuffer);
    assert(zip.file('test1.txt') !== null && zip.file('test2.txt') !== null, 'ZIP contains all packaged files');
  } catch (err) {
    assert(false, `Create ZIP threw error: ${err.message}`);
  }

  // --- TEST 10: Duplicate File Detection via SHA-256 ---
  try {
    const bufA = Buffer.from('identical content 123');
    const bufB = Buffer.from('identical content 123');
    const bufC = Buffer.from('different content 456');

    const dupeReport = await fileOps.findDuplicateFiles([
      { name: 'copy1.txt', data: bufA },
      { name: 'copy2.txt', data: bufB },
      { name: 'unique.txt', data: bufC }
    ]);

    assert(dupeReport.duplicateGroupsCount === 1, `Detected exactly 1 duplicate group, got ${dupeReport.duplicateGroupsCount}`);
    assert(dupeReport.duplicateGroups[0].files.length === 2, `Duplicate group contains 2 matching files`);
  } catch (err) {
    assert(false, `Duplicate detection threw error: ${err.message}`);
  }

  // --- TEST 11: Tabular CSV & JSON conversions ---
  try {
    const csvData = `id,name,role\n1,Alice,Engineer\n2,Bob,Designer`;
    const jsonResult = dataOps.csvToJson(csvData);
    assert(jsonResult.length === 2 && jsonResult[0].name === 'Alice', 'CSV parsed into JSON correctly');

    const backToCsv = dataOps.jsonToCsv(jsonResult);
    assert(backToCsv.includes('Alice') && backToCsv.includes('Engineer'), 'JSON converted back to CSV');
  } catch (err) {
    assert(false, `Tabular conversion threw error: ${err.message}`);
  }

  // --- TEST 12: Smart Fix Rejection Diagnosis & Repair ---
  console.log(`\n[Suite 4] Smart Fix & AI Custom Builder:`);
  try {
    // Rejected image: PNG, 400x200 (not 600x600), size exceeds 20 KB
    const rejectedPng = await createSyntheticPng(400, 200);
    const rules = {
      allowedFormats: ['image/jpeg'],
      allowedExtensions: ['jpg', 'jpeg'],
      maxSizeKB: 200,
      exactWidth: 600,
      exactHeight: 600
    };

    const initialDiag = await diagnoseFile({ data: rejectedPng, name: 'PassportPhoto.png' }, rules);
    assert(!initialDiag.overallPass, 'Initial file correctly diagnosed as failing portal requirements');
    assert(initialDiag.suggestedFixes.length >= 2, `Suggested fixes generated: ${initialDiag.suggestedFixes.map(f => f.type).join(', ')}`);

    // Run Auto Repair
    const repairRes = await repairFile({ data: rejectedPng, name: 'PassportPhoto.png' }, rules);
    assert(repairRes.success && repairRes.after.overallPass, 'Repaired file achieves 100% compliance with requirements');
    assert(repairRes.after.imageInfo.width === 600 && repairRes.after.imageInfo.height === 600, 'Repaired dimensions exactly 600×600 px');
  } catch (err) {
    assert(false, `Smart Fix test threw error: ${err.message}`);
  }

  // --- TEST 13 & 14: Master Acceptance Scenario: Natural-language custom workflow generation & execution ---
  try {
    const userPrompt = 'I have 5 photographs. Make them all 600 × 800 pixels without cropping anything, convert them to JPG, make each one smaller than 200 KB and rename them Image_1 through Image_5.';
    const workflow = parseLocally(userPrompt);

    assert(workflow.title === 'Custom Image Processor', `Workflow title: "${workflow.title}"`);
    assert(workflow.operations.length === 4, `Workflow assembled 4 pipeline operations, got ${workflow.operations.length}`);
    assert(workflow.operations[0].operationId === 'resize_image' && workflow.operations[0].params.mode === 'pad', 'Operation 1: resize_image with mode "pad"');
    assert(workflow.operations[1].operationId === 'convert_image', 'Operation 2: convert_image to JPG');
    assert(workflow.operations[2].operationId === 'compress_image', 'Operation 3: compress_image');
    assert(workflow.operations[3].operationId === 'rename_file', 'Operation 4: rename_file with pattern Image_{n}');

    // Execute the generated workflow on 5 synthetic images!
    const sampleImages = [];
    for (let i = 1; i <= 5; i++) {
      sampleImages.push({
        name: `Original_Photo_${i}.png`,
        data: await createSyntheticPng(450, 300, { r: 50 * i, g: 30 * i, b: 200, alpha: 1 })
      });
    }

    const execResult = await runWorkflow(workflow, sampleImages);
    assert(execResult.outputs.length === 5, `Workflow produced 5 output files, got ${execResult.outputs.length}`);
    assert(execResult.outputs[0].name === 'Image_1.jpg', `First output renamed to Image_1.jpg, got ${execResult.outputs[0].name}`);
    assert(execResult.outputs[4].name === 'Image_5.jpg', `Fifth output renamed to Image_5.jpg, got ${execResult.outputs[4].name}`);

    // Verify dimensions of output
    const metaOut = await sharp(execResult.outputs[0].data).metadata();
    assert(metaOut.width === 600 && metaOut.height === 800, `Output image has exact 600×800 padded dimensions, got ${metaOut.width}×${metaOut.height}`);
    assert(metaOut.format === 'jpeg', 'Output format is genuine JPEG');
  } catch (err) {
    assert(false, `Acceptance scenario 1 threw error: ${err.message}`);
  }

  // --- TEST 15: Second Acceptance Scenario (PDF Workflow) ---
  try {
    const pdfPrompt = 'Merge these PDFs in this order, delete page 3, rotate page 5 and save the final file as MyDocuments.pdf';
    const pdfWorkflow = parseLocally(pdfPrompt);

    assert(pdfWorkflow.operations.some(op => op.operationId === 'merge_pdf'), 'PDF workflow includes merge_pdf');
    assert(pdfWorkflow.operations.some(op => op.operationId === 'delete_pdf_pages'), 'PDF workflow includes delete_pdf_pages');
    assert(pdfWorkflow.operations.some(op => op.operationId === 'rotate_pdf'), 'PDF workflow includes rotate_pdf');

    // Test execution
    const pdfA = await createSyntheticPdf(3, 'DocA');
    const pdfB = await createSyntheticPdf(3, 'DocB');
    const pdfResults = await runWorkflow(pdfWorkflow, [
      { name: 'DocA.pdf', data: pdfA },
      { name: 'DocB.pdf', data: pdfB }
    ]);

    assert(pdfResults.outputs.length === 1, 'Merged result produced single output');
    const inspectRes = await pdfOps.inspectPdf(pdfResults.outputs[0].data);
    // 3 + 3 = 6 pages, delete page 3 => 5 pages remain!
    assert(inspectRes.pageCount === 5, `Output PDF has 5 pages after deleting page 3 (6 - 1 = 5), got ${inspectRes.pageCount}`);
  } catch (err) {
    assert(false, `Acceptance scenario 2 threw error: ${err.message}`);
  }

  // --- TEST 15B: File Size (KB) vs Dimension (Pixels) NLP Disambiguation ---
  try {
    const compOnlyPrompt = 'Reduce file size of my jpeg';
    const compWorkflow = parseLocally(compOnlyPrompt);
    assert(compWorkflow.title.includes('Compressor'), `Title is "${compWorkflow.title}"`);
    assert(compWorkflow.operations.some(op => op.operationId === 'compress_image'), 'Includes compress_image operation');
    assert(!compWorkflow.operations.some(op => op.operationId === 'resize_image'), 'Does NOT include resize_image when only file size was requested');
    assert(compWorkflow.configurableFields.maxSizeKB !== undefined, 'Exposes Max File Size (KB) control');
    assert(compWorkflow.configurableFields.width === undefined, 'Does NOT expose pixel width control');

    const tinyKbPrompt = 'make it 1kb 2kb etc';
    const tinyKbWorkflow = parseLocally(tinyKbPrompt);
    assert(tinyKbWorkflow.operations.some(op => op.operationId === 'compress_image'), 'make it 1kb parsed as compression');
    assert(!tinyKbWorkflow.operations.some(op => op.operationId === 'resize_image'), 'make it 1kb does NOT force resize');
    assert(tinyKbWorkflow.configurableFields.maxSizeKB === 1, `maxSizeKB parsed as 1, got ${tinyKbWorkflow.configurableFields.maxSizeKB}`);
  } catch (err) {
    assert(false, `Disambiguation test threw error: ${err.message}`);
  }

  // --- TEST 16: Error handling & security safeguards ---
  console.log(`\n[Suite 5] Security & Safeguards:`);
  try {
    let errorCaught = false;
    try {
      await pdfOps.inspectPdf(Buffer.from('not a pdf corrupted bytes'));
    } catch (e) {
      errorCaught = true;
    }
    assert(errorCaught, 'Corrupted file safely rejected with clear exception');

    let deleteExCaught = false;
    try {
      const doc1 = await createSyntheticPdf(1, 'Doc1');
      await pdfOps.deletePdfPages(doc1, { pages: '1' });
    } catch (e) {
      deleteExCaught = true;
    }
    assert(deleteExCaught, 'Safeguard prevents deleting all pages from a document');

    // Security Test: Zip Slip / Path Traversal sanitization
    const sanitizedTraverse = fileOps.sanitizeFileName('../../../etc/passwd');
    assert(!sanitizedTraverse.includes('..') && !sanitizedTraverse.includes('/'), `Zip Slip path traversal stripped: got "${sanitizedTraverse}"`);
    const sanitizedNullByte = fileOps.sanitizeFileName('invoice\0.pdf');
    assert(!sanitizedNullByte.includes('\0'), 'Null byte stripped from filename');

    // Security Test: Unauthorized operation rejection
    let unregOpCaught = false;
    try {
      await runWorkflow({ operations: [{ operationId: 'arbitrary_eval_cmd' }] }, [{ name: 'test.pdf', data: 'test' }]);
    } catch (e) {
      if (e.message.includes('Security Exception')) unregOpCaught = true;
    }
    assert(unregOpCaught, 'Workflow Engine blocks unregistered or malicious operation IDs');

    // Security Test: Excessive operation chain bounding
    let maxStepsCaught = false;
    try {
      const longOps = Array.from({ length: 25 }, (_, i) => ({ operationId: 'rotate_pdf' }));
      await runWorkflow({ operations: longOps }, [{ name: 'test.pdf', data: 'test' }]);
    } catch (e) {
      if (e.message.includes('Security Exception')) maxStepsCaught = true;
    }
    assert(maxStepsCaught, 'Workflow Engine enforces maximum operation steps boundary');

    // Security Test: Filename length boundary capping (255 chars)
    const longName = 'a'.repeat(300) + '.pdf';
    const sanitizedLong = fileOps.sanitizeFileName(longName);
    assert(sanitizedLong.length <= 255, `Filename length bounded to 255 chars (got ${sanitizedLong.length})`);

    // Security Test: Oversized URL hash payload rejection
    const hugeHash = 'a'.repeat(60000);
    assert(decodeWorkflowFromHash(hugeHash) === null, 'Oversized URL hash payload rejected');

    // Security Test: Prototype pollution safeguard in URL decode
    const maliciousHash = encodeURIComponent(btoa(JSON.stringify({
      t: 'Safe Title',
      ops: [{ id: 'nonexistent_hack_op', n: 'Hack' }],
      __proto__: { polluted: true }
    })));
    const decodedMalicious = decodeWorkflowFromHash(maliciousHash);
    assert(decodedMalicious === null, 'Malicious workflow with unauthorized operations safely rejected');
    assert(Object.prototype.polluted === undefined, 'Prototype pollution strictly prevented');
  } catch (err) {
    assert(false, `Security test threw error: ${err.message}`);
  }

  // --- TEST 17: Sharable Tool URL encoding & decoding ---
  console.log(`\n[Suite 6] Public Deployment & Deep Linking:`);
  try {
    const originalWf = {
      title: 'Passport Photo 600x600 Maker',
      description: 'Padded square photo',
      inputTypes: ['image/jpeg'],
      multiple: false,
      operations: [
        { operationId: 'resize_image', name: 'Resize to 600x600', params: { width: 600, height: 600, mode: 'pad' } }
      ],
      configurableFields: { width: 600, height: 600 }
    };

    const hash = encodeWorkflowToHash(originalWf);
    assert(typeof hash === 'string' && hash.length > 10, 'Workflow encoded to URL-safe hash string');

    const restored = decodeWorkflowFromHash(hash);
    assert(restored.title === originalWf.title, `Decoded workflow preserved title: "${restored.title}"`);
    assert(restored.operations[0].operationId === 'resize_image', 'Decoded operations matched original');
    assert(restored.operations[0].params.width === 600, 'Decoded parameters preserved');
  } catch (err) {
    assert(false, `Deep link sharing test threw error: ${err.message}`);
  }

  // --- SUMMARY ---
  console.log(`\n======================================================`);
  console.log(`  Test Results Summary:`);
  console.log(`  Total Tests:  ${totalTests}`);
  console.log(`  Passed Tests: ${passedTests}`);
  console.log(`  Failed Tests: ${failedTests}`);
  console.log(`======================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();
