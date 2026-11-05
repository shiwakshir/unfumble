/**
 * Unfumble Natural Language Workflow Parser & AI Systems Architect
 * Dual Engine:
 * 1. Semantic Deterministic NLP Engine (Works 100% offline with zero API key)
 * 2. Gemini Live API Integration (When user provides an API key in settings)
 */

import { OPERATIONS_REGISTRY } from '../operations/registry.js';

/**
 * Parses user natural language request into a validated workflow specification.
 * @param {string} prompt User prompt describing the desired file tool
 * @param {Object} [existingWorkflow] If refining an existing workflow
 * @param {string} [geminiApiKey] Optional Gemini API key
 * @returns {Promise<Object>} Validated workflow specification
 */
export async function parseWorkflowRequest(prompt, existingWorkflow = null, geminiApiKey = null) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error('Please describe what you would like your custom file tool to do.');
  }

  // If Gemini API key is provided, attempt live LLM generation with fallback
  if (geminiApiKey) {
    try {
      return await generateWorkflowWithGemini(prompt, existingWorkflow, geminiApiKey);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local NLP engine:', err.message);
    }
  }

  // Local semantic NLP engine
  return parseLocally(prompt, existingWorkflow);
}

/**
 * Local Deterministic Semantic NLP Engine
 */
export function parseLocally(prompt, existingWorkflow = null) {
  const p = prompt.toLowerCase();
  const operations = existingWorkflow ? [...existingWorkflow.operations] : [];
  const configurableFields = existingWorkflow ? { ...existingWorkflow.configurableFields } : {};

  let title = existingWorkflow ? existingWorkflow.title : 'Custom File Processor';
  let description = existingWorkflow ? existingWorkflow.description : '';
  let inputTypes = existingWorkflow ? [...existingWorkflow.inputTypes] : ['*/*'];
  let multiple = existingWorkflow ? existingWorkflow.multiple : true;

  // --- Dimension extraction: 600 by 800, 600x800, 1920 x 1080 ---
  const dimMatch = prompt.match(/(\d{2,5})\s*(?:x|by|\*|×)\s*(\d{2,5})/i);
  let targetWidth = dimMatch ? parseInt(dimMatch[1], 10) : (configurableFields.width || 800);
  let targetHeight = dimMatch ? parseInt(dimMatch[2], 10) : (configurableFields.height || 600);

  // --- Max file size extraction: 200 KB, 5 MB, smaller than 2MB, make it 1kb 2kb ---
  const sizeMatch = prompt.match(/(?:smaller\s+than|below|under|max|maximum|make\s+it|to)?\s*(\d+(?:\.\d+)?)\s*(kb|mb)/i);
  let maxSizeKB = null;
  if (sizeMatch) {
    const val = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toLowerCase();
    maxSizeKB = unit === 'mb' ? Math.round(val * 1024) : Math.round(val);
  }

  // --- Target format extraction: JPG, PNG, WebP, PDF ---
  let targetImageFormat = null;
  if (p.includes('jpg') || p.includes('jpeg')) targetImageFormat = 'image/jpeg';
  else if (p.includes('png') || p.includes('transparent') || p.includes('background')) targetImageFormat = 'image/png';
  else if (p.includes('webp')) targetImageFormat = 'image/webp';

  // --- Filename pattern extraction: Photo_1, Photo_2, Image_{n}, Application.pdf ---
  let renamePattern = configurableFields.renamePattern || null;
  let customFilename = null;

  // Match e.g. "rename them Photo_1, Photo_2" or "Photo_1 through Photo_5"
  const renameSeqMatch = prompt.match(/rename\s+(?:them|files)?\s*([a-zA-Z0-9_\-]+?)[_\-\s]*(?:1|01|\{n\})/i);
  if (renameSeqMatch) {
    const basePrefix = renameSeqMatch[1].replace(/[_\-\s]+$/, '');
    renamePattern = `${basePrefix}_{n}`;
  } else if (p.includes('rename')) {
    const specificNameMatch = prompt.match(/rename\s+(?:it\s+)?(?:to\s+|as\s+)?['"]?([a-zA-Z0-9_\-\.]+)\.([a-zA-Z0-9]+)['"]?/i);
    if (specificNameMatch) {
      customFilename = `${specificNameMatch[1]}.${specificNameMatch[2]}`;
    } else if (p.includes("today's date") || p.includes('date')) {
      renamePattern = '{date}_{n}';
    } else if (p.includes('number')) {
      renamePattern = 'File_{n}';
    }
  }

  // --- Resizing mode extraction: pad, white padding, fit, crop/fill ---
  let resizeMode = 'pad'; // default to safe padding to avoid cropping
  let padColor = '#FFFFFF';
  if (p.includes('pad') || p.includes('padding') || p.includes('without crop') || p.includes("don't crop") || p.includes('no crop')) {
    resizeMode = 'pad';
    if (p.includes('black')) padColor = '#000000';
    if (p.includes('transparent') || p.includes('remove background') || p.includes('cutout')) padColor = 'transparent';
  } else if (p.includes('crop') || p.includes('fill')) {
    resizeMode = 'fill';
  } else if (p.includes('fit') || p.includes('inside') || p.includes('maintain aspect')) {
    resizeMode = 'fit';
  }

  // --- Compression / File Size Intent Detection ---
  const isCompressRequested = Boolean(
    maxSizeKB !== null ||
    p.includes('compress') ||
    p.includes('file size') ||
    p.includes('filesize') ||
    p.includes('make smaller') ||
    p.includes('smaller than') ||
    p.includes('reduce size') ||
    p.includes('reduce file') ||
    p.includes('shrink') ||
    p.includes('decrease size') ||
    p.includes('lower size') ||
    p.includes('cut size') ||
    /\b\d+\s*(kb|mb)\b/i.test(prompt)
  );

  if (isCompressRequested && !maxSizeKB) {
    maxSizeKB = configurableFields.maxSizeKB || 100; // sensible default 100 KB
  }

  // --- Dimension / Pixel Resize Intent Detection ---
  let isResizeRequested = Boolean(
    dimMatch !== null ||
    p.includes('pixel') ||
    p.includes('pixels') ||
    p.includes('px') ||
    p.includes('dimension') ||
    p.includes('resolution') ||
    p.includes('width') ||
    p.includes('height') ||
    p.includes('pad') ||
    p.includes('padding') ||
    p.includes('crop') ||
    p.includes('fill') ||
    p.includes('aspect') ||
    (p.includes('resize') && !p.includes('file size') && !p.includes('size of') && !p.includes('filesize')) ||
    (configurableFields.width && configurableFields.height)
  );

  // If user only asked for compression, format conversion, or rename, do NOT force pixel resize
  if (!isResizeRequested && !isCompressRequested && !targetImageFormat && !renamePattern) {
    // Default fallback when prompt is just generic "process image"
    isResizeRequested = true;
  }

  // --- Determine Tool Categories & Operations ---
  const isImageTask = p.includes('image') || p.includes('photo') || p.includes('jpg') || p.includes('jpeg') || p.includes('png') || p.includes('webp') || dimMatch !== null;
  const isPdfTask = p.includes('pdf') || p.includes('document') || p.includes('page');
  const isCsvTask = p.includes('csv') || p.includes('spreadsheet') || p.includes('tsv') || p.includes('json');

  if (isImageTask && !isPdfTask) {
    inputTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];

    // Contextual, human-friendly title & description
    if (isCompressRequested && !isResizeRequested) {
      title = targetImageFormat === 'image/jpeg' ? 'JPEG File Size Compressor' : 'Image File Size Compressor';
      description = `Compresses image file size to under ${maxSizeKB} KB while preserving original pixel dimensions.`;
    } else if (isResizeRequested && !isCompressRequested) {
      title = 'Image Dimension Resizer';
      description = `Resizes images to ${targetWidth}×${targetHeight} using ${resizeMode} mode.`;
    } else if (isResizeRequested && isCompressRequested) {
      title = 'Custom Image Processor';
      description = `Processes images with ${resizeMode} resize (${targetWidth}×${targetHeight}), format conversion, compression, and automated renaming.`;
    } else if (targetImageFormat) {
      title = 'Image Format Converter';
      description = `Converts images to ${targetImageFormat.replace('image/', '').toUpperCase()} format.`;
    } else {
      title = 'Custom Image Processor';
      description = 'Custom image processing pipeline.';
    }

    // 1. Resize step (ONLY if pixel resize was requested)
    if (isResizeRequested) {
      const resizeStepIdx = operations.findIndex(op => op.operationId === 'resize_image');
      const resizeParams = {
        width: targetWidth,
        height: targetHeight,
        mode: resizeMode,
        padColor: padColor
      };
      if (resizeStepIdx >= 0) {
        operations[resizeStepIdx].params = { ...operations[resizeStepIdx].params, ...resizeParams };
      } else {
        operations.push({
          stepId: 'step_resize',
          operationId: 'resize_image',
          name: 'Resize Image Dimensions',
          params: resizeParams
        });
      }
      configurableFields.width = targetWidth;
      configurableFields.height = targetHeight;
      configurableFields.resizeMode = resizeMode;
      configurableFields.padColor = padColor;
    } else {
      // Remove any leftover resize step and do not show dimension controls
      const existingResizeIdx = operations.findIndex(op => op.operationId === 'resize_image');
      if (existingResizeIdx >= 0) operations.splice(existingResizeIdx, 1);
      delete configurableFields.width;
      delete configurableFields.height;
      delete configurableFields.resizeMode;
      delete configurableFields.padColor;
    }

    // 2. Format conversion step
    if (targetImageFormat) {
      const convertStepIdx = operations.findIndex(op => op.operationId === 'convert_image');
      const convertParams = { format: targetImageFormat, quality: 0.9 };
      if (convertStepIdx >= 0) {
        operations[convertStepIdx].params = { ...operations[convertStepIdx].params, ...convertParams };
      } else {
        operations.push({
          stepId: 'step_convert',
          operationId: 'convert_image',
          name: 'Convert Format',
          params: convertParams
        });
      }
      configurableFields.format = targetImageFormat;
    }

    // 3. Compression step (KB file size reduction)
    if (isCompressRequested) {
      const compStepIdx = operations.findIndex(op => op.operationId === 'compress_image');
      const compParams = { maxSizeKB: maxSizeKB || 100, format: targetImageFormat || 'image/jpeg' };
      if (compStepIdx >= 0) {
        operations[compStepIdx].params = { ...operations[compStepIdx].params, ...compParams };
      } else {
        operations.push({
          stepId: 'step_compress',
          operationId: 'compress_image',
          name: 'Compress File Size (KB)',
          params: compParams
        });
      }
      configurableFields.maxSizeKB = maxSizeKB || 100;
    }

    // 4. Rename step
    if (renamePattern || p.includes('rename')) {
      const renameStepIdx = operations.findIndex(op => op.operationId === 'rename_file');
      const renameParams = {
        pattern: renamePattern || 'Photo_{n}',
        startNumber: 1,
        padZeros: 1,
        replaceSpaces: 'keep'
      };
      if (renameStepIdx >= 0) {
        operations[renameStepIdx].params = { ...operations[renameStepIdx].params, ...renameParams };
      } else {
        operations.push({
          stepId: 'step_rename',
          operationId: 'rename_file',
          name: 'Sequential Renaming',
          params: renameParams
        });
      }
      configurableFields.renamePattern = renamePattern || 'Photo_{n}';
    }

  } else if (isPdfTask) {
    inputTypes = ['application/pdf'];
    title = 'Custom PDF Workflow';
    description = 'Custom PDF pipeline: merge, page manipulation, compression, and renaming.';

    // Check merge
    if (p.includes('merge') || p.includes('combine')) {
      if (!operations.some(op => op.operationId === 'merge_pdf')) {
        operations.push({
          stepId: 'step_merge',
          operationId: 'merge_pdf',
          name: 'Merge PDFs',
          params: { outputName: customFilename || 'Merged_Application.pdf' }
        });
      }
    }

    // Check page deletion: "delete page 3", "remove blank pages", "delete page 2, 4"
    const deleteMatch = prompt.match(/delete\s+pages?\s*([0-9,\s\-]+)/i) || prompt.match(/remove\s+pages?\s*([0-9,\s\-]+)/i);
    if (deleteMatch) {
      const pagesToDelete = deleteMatch[1].trim();
      operations.push({
        stepId: 'step_delete_pages',
        operationId: 'delete_pdf_pages',
        name: `Delete Pages (${pagesToDelete})`,
        params: { pages: pagesToDelete }
      });
      configurableFields.deletePages = pagesToDelete;
    }

    // Check page rotation: "rotate page 5"
    const rotateMatch = prompt.match(/rotate\s+pages?\s*([0-9,\s\-]+)/i);
    if (rotateMatch) {
      const targetRotatePages = rotateMatch[1].trim();
      operations.push({
        stepId: 'step_rotate_pages',
        operationId: 'rotate_pdf',
        name: `Rotate Pages (${targetRotatePages})`,
        params: { angle: 90, pages: targetRotatePages }
      });
      configurableFields.rotatePages = targetRotatePages;
    }

    // Check compress
    if (p.includes('compress') || p.includes('smaller than') || maxSizeKB) {
      operations.push({
        stepId: 'step_compress_pdf',
        operationId: 'compress_pdf',
        name: 'Compress PDF',
        params: { level: 'lossless' }
      });
    }

    // Custom filename
    if (customFilename) {
      operations.push({
        stepId: 'step_rename_pdf',
        operationId: 'rename_file',
        name: `Rename to ${customFilename}`,
        params: { pattern: customFilename.replace(/\.pdf$/i, '') }
      });
      configurableFields.customFilename = customFilename;
    }

  } else if (isCsvTask) {
    inputTypes = ['text/csv', 'text/plain', 'text/tab-separated-values'];
    title = 'Custom Tabular Data Converter';
    description = 'Cleans, transforms, and converts CSV and tabular spreadsheets.';
    const targetFormat = p.includes('json') ? 'json' : 'tsv';
    operations.push({
      stepId: 'step_convert_csv',
      operationId: 'convert_csv',
      name: `Convert CSV to ${targetFormat.toUpperCase()}`,
      params: { targetFormat }
    });
    configurableFields.targetFormat = targetFormat;
  }

  // If no operations were identified, build a smart universal utility
  if (operations.length === 0) {
    operations.push({
      stepId: 'step_inspect',
      operationId: 'inspect_file',
      name: 'Inspect File Properties',
      params: {}
    });
    title = 'Custom File Utility';
    description = `Configured based on your request: "${prompt}".`;
  }

  return {
    id: existingWorkflow ? existingWorkflow.id : `tool_${Date.now()}`,
    title,
    description,
    inputTypes,
    multiple,
    operations,
    configurableFields,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Live Gemini API Integration for Advanced Tool Generation
 */
async function generateWorkflowWithGemini(prompt, existingWorkflow, apiKey) {
  const systemPrompt = `You are the Unfumble AI Architecture Engine.
Your task is to convert the user's natural language request into a valid JSON workflow specification based on available operations.

Available operations in Unfumble registry:
- resize_image: params { width: number, height: number, mode: 'pad'|'fit'|'fill', padColor: string }
- convert_image: params { format: 'image/jpeg'|'image/png'|'image/webp', quality: number }
- compress_image: params { maxSizeKB: number, mode: 'target_size' }
- merge_pdf: params { outputName: string }
- delete_pdf_pages: params { pages: string }
- rotate_pdf: params { angle: number, pages: string }
- extract_pdf_pages: params { pages: string }
- convert_images_to_pdf: params { pageSize: 'fit_image'|'a4', margin: number }
- rename_file: params { pattern: string, startNumber: number, padZeros: number }
- create_zip: params { archiveName: string }
- convert_csv: params { targetFormat: 'json'|'tsv' }

Return ONLY valid JSON with this exact structure:
{
  "title": "Short descriptive tool title",
  "description": "Clear explanation of what the tool accomplishes",
  "inputTypes": ["image/jpeg", "image/png"] or ["application/pdf"],
  "multiple": true,
  "operations": [
    {
      "stepId": "step_1",
      "operationId": "resize_image",
      "name": "Resize Image",
      "params": { "width": 600, "height": 800, "mode": "pad", "padColor": "#FFFFFF" }
    }
  ],
  "configurableFields": {
    "width": 600,
    "height": 800
  }
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nUser Request: ${prompt}\n${existingWorkflow ? `Existing Workflow: ${JSON.stringify(existingWorkflow)}` : ''}` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  const rawText = json.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(rawText);

  // Guardrail: Validate all operations against registered operations
  if (parsed.operations && Array.isArray(parsed.operations)) {
    parsed.operations = parsed.operations.filter(op => {
      return op && op.operationId && OPERATIONS_REGISTRY[op.operationId];
    });
  }

  // If LLM returned no valid operations from registry, fallback to trusted local parser
  if (!parsed.operations || parsed.operations.length === 0) {
    console.warn('Gemini returned no valid operations in registry, falling back to deterministic parser.');
    return parseLocally(prompt, existingWorkflow);
  }

  parsed.id = existingWorkflow ? existingWorkflow.id : `tool_${Date.now()}`;
  parsed.updatedAt = new Date().toISOString();
  return parsed;
}
