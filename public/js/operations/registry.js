/**
 * FileFix Operations Registry
 * Structured, typed definitions of all supported file processing operations.
 */

export const OPERATIONS_REGISTRY = {
  // --- PDF Operations ---
  merge_pdf: {
    id: 'merge_pdf',
    name: 'Merge PDFs',
    category: 'pdf',
    description: 'Combine multiple PDF documents into a single sequential PDF.',
    supportedInputs: ['application/pdf'],
    outputType: 'application/pdf',
    multipleInputs: true,
    parameters: [
      {
        name: 'order',
        type: 'array',
        label: 'File Order',
        description: 'Sequence in which the PDFs should be combined.',
        default: []
      }
    ]
  },

  split_pdf: {
    id: 'split_pdf',
    name: 'Split PDF',
    category: 'pdf',
    description: 'Split a PDF document into individual pages or specific page ranges.',
    supportedInputs: ['application/pdf'],
    outputType: 'application/pdf',
    multipleInputs: false,
    parameters: [
      {
        name: 'mode',
        type: 'select',
        label: 'Split Mode',
        options: [
          { value: 'all', label: 'Every page to separate file' },
          { value: 'range', label: 'Specific page ranges (e.g. 1-3, 5)' }
        ],
        default: 'all'
      },
      {
        name: 'ranges',
        type: 'string',
        label: 'Page Ranges',
        placeholder: 'e.g. 1-3, 5, 8-10',
        default: '1'
      }
    ]
  },

  rotate_pdf: {
    id: 'rotate_pdf',
    name: 'Rotate PDF Pages',
    category: 'pdf',
    description: 'Rotate specific or all pages in a PDF document.',
    supportedInputs: ['application/pdf'],
    outputType: 'application/pdf',
    parameters: [
      {
        name: 'angle',
        type: 'select',
        label: 'Rotation Angle',
        options: [
          { value: 90, label: '90° Clockwise' },
          { value: 180, label: '180° Flip' },
          { value: 270, label: '90° Counter-Clockwise' }
        ],
        default: 90
      },
      {
        name: 'pages',
        type: 'string',
        label: 'Target Pages',
        placeholder: 'all or e.g. 1, 3, 5',
        default: 'all'
      }
    ]
  },

  delete_pdf_pages: {
    id: 'delete_pdf_pages',
    name: 'Delete PDF Pages',
    category: 'pdf',
    description: 'Remove unwanted or blank pages from a PDF document.',
    supportedInputs: ['application/pdf'],
    outputType: 'application/pdf',
    parameters: [
      {
        name: 'pages',
        type: 'string',
        label: 'Pages to Delete',
        placeholder: 'e.g. 2, 4-6',
        default: ''
      }
    ]
  },

  extract_pdf_pages: {
    id: 'extract_pdf_pages',
    name: 'Extract PDF Pages',
    category: 'pdf',
    description: 'Extract selected pages into a new clean PDF document.',
    supportedInputs: ['application/pdf'],
    outputType: 'application/pdf',
    parameters: [
      {
        name: 'pages',
        type: 'string',
        label: 'Pages to Extract',
        placeholder: 'e.g. 1, 3, 5-7',
        default: '1'
      }
    ]
  },

  convert_images_to_pdf: {
    id: 'convert_images_to_pdf',
    name: 'Convert Images to PDF',
    category: 'pdf',
    description: 'Combine multiple photos, scans or graphics into a clean PDF document.',
    supportedInputs: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
    outputType: 'application/pdf',
    multipleInputs: true,
    parameters: [
      {
        name: 'pageSize',
        type: 'select',
        label: 'Page Size',
        options: [
          { value: 'fit_image', label: 'Fit to Image Dimensions' },
          { value: 'a4', label: 'Standard A4' },
          { value: 'letter', label: 'US Letter' }
        ],
        default: 'fit_image'
      },
      {
        name: 'margin',
        type: 'number',
        label: 'Page Margin (px)',
        default: 0
      }
    ]
  },

  compress_pdf: {
    id: 'compress_pdf',
    name: 'Compress PDF',
    category: 'pdf',
    description: 'Optimize PDF structure and compress streams to reduce file size.',
    supportedInputs: ['application/pdf'],
    outputType: 'application/pdf',
    parameters: [
      {
        name: 'level',
        type: 'select',
        label: 'Compression Level',
        options: [
          { value: 'lossless', label: 'Lossless (Structure optimization)' },
          { value: 'balanced', label: 'Balanced' }
        ],
        default: 'lossless'
      }
    ]
  },

  // --- Image Operations ---
  resize_image: {
    id: 'resize_image',
    name: 'Resize Image',
    category: 'image',
    description: 'Resize image dimensions using Fit, Fill, or Pad modes.',
    supportedInputs: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
    outputType: 'match_input',
    parameters: [
      {
        name: 'width',
        type: 'number',
        label: 'Width (px)',
        default: 800
      },
      {
        name: 'height',
        type: 'number',
        label: 'Height (px)',
        default: 600
      },
      {
        name: 'mode',
        type: 'select',
        label: 'Resizing Mode',
        options: [
          { value: 'pad', label: 'Pad (Add background space, no cropping)' },
          { value: 'fit', label: 'Fit (Scale inside dimensions, preserve ratio)' },
          { value: 'fill', label: 'Fill (Crop to exactly fill dimensions)' },
          { value: 'stretch', label: 'Exact (Stretch to dimensions)' }
        ],
        default: 'pad'
      },
      {
        name: 'padColor',
        type: 'color',
        label: 'Padding Background Color',
        default: '#FFFFFF'
      }
    ]
  },

  convert_image: {
    id: 'convert_image',
    name: 'Convert Image Format',
    category: 'image',
    description: 'Convert image to JPG, PNG, WebP or other formats.',
    supportedInputs: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
    outputType: 'dynamic',
    parameters: [
      {
        name: 'format',
        type: 'select',
        label: 'Target Format',
        options: [
          { value: 'image/jpeg', label: 'JPG / JPEG (.jpg)' },
          { value: 'image/png', label: 'PNG (.png)' },
          { value: 'image/webp', label: 'WebP (.webp)' }
        ],
        default: 'image/jpeg'
      },
      {
        name: 'quality',
        type: 'slider',
        label: 'Output Quality (%)',
        min: 10,
        max: 100,
        default: 90
      }
    ]
  },

  compress_image: {
    id: 'compress_image',
    name: 'Compress Image',
    category: 'image',
    description: 'Reduce image file size to meet a strict maximum KB target or quality level.',
    supportedInputs: ['image/jpeg', 'image/png', 'image/webp'],
    outputType: 'match_input',
    parameters: [
      {
        name: 'maxSizeKB',
        type: 'number',
        label: 'Target Max File Size (KB)',
        placeholder: 'e.g. 200',
        default: 200
      },
      {
        name: 'mode',
        type: 'select',
        label: 'Strategy',
        options: [
          { value: 'target_size', label: 'Target File Size (KB limit)' },
          { value: 'quality_preset', label: 'Quality Preset' }
        ],
        default: 'target_size'
      },
      {
        name: 'qualityPreset',
        type: 'select',
        label: 'Preset',
        options: [
          { value: 0.85, label: 'High Quality (85%)' },
          { value: 0.70, label: 'Balanced (70%)' },
          { value: 0.50, label: 'Aggressive (50%)' }
        ],
        default: 0.85
      }
    ]
  },

  crop_image: {
    id: 'crop_image',
    name: 'Crop Image',
    category: 'image',
    description: 'Crop image to specific coordinates or aspect ratios.',
    supportedInputs: ['image/jpeg', 'image/png', 'image/webp'],
    outputType: 'match_input',
    parameters: [
      {
        name: 'aspectRatio',
        type: 'select',
        label: 'Aspect Ratio',
        options: [
          { value: '1:1', label: 'Square (1:1)' },
          { value: '4:3', label: 'Standard (4:3)' },
          { value: '16:9', label: 'Widescreen (16:9)' },
          { value: '3:4', label: 'Portrait (3:4)' }
        ],
        default: '1:1'
      }
    ]
  },

  // --- Utility & Batch Operations ---
  rename_file: {
    id: 'rename_file',
    name: 'Rename Files',
    category: 'utility',
    description: 'Rename files using patterns, numbering, prefixes, suffixes, or character cleaning.',
    supportedInputs: ['*/*'],
    outputType: 'match_input',
    parameters: [
      {
        name: 'pattern',
        type: 'string',
        label: 'Filename Pattern',
        placeholder: 'e.g. Photo_{n} or Image_{index}',
        default: 'Photo_{n}'
      },
      {
        name: 'startNumber',
        type: 'number',
        label: 'Start Number',
        default: 1
      },
      {
        name: 'padZeros',
        type: 'number',
        label: 'Zero Padding (e.g. 1 vs 01 vs 001)',
        default: 1
      },
      {
        name: 'replaceSpaces',
        type: 'select',
        label: 'Space Replacement',
        options: [
          { value: 'keep', label: 'Keep spaces' },
          { value: 'underscore', label: 'Replace with underscore (_)' },
          { value: 'hyphen', label: 'Replace with hyphen (-)' },
          { value: 'remove', label: 'Remove all spaces' }
        ],
        default: 'keep'
      },
      {
        name: 'casing',
        type: 'select',
        label: 'Case Modification',
        options: [
          { value: 'preserve', label: 'Preserve case' },
          { value: 'lowercase', label: 'all lowercase' },
          { value: 'uppercase', label: 'ALL UPPERCASE' }
        ],
        default: 'preserve'
      }
    ]
  },

  create_zip: {
    id: 'create_zip',
    name: 'Package as ZIP',
    category: 'utility',
    description: 'Compress processed files into a single downloadable ZIP archive.',
    supportedInputs: ['*/*'],
    outputType: 'application/zip',
    multipleInputs: true,
    parameters: [
      {
        name: 'archiveName',
        type: 'string',
        label: 'ZIP Archive Name',
        default: 'FileFix_Export.zip'
      }
    ]
  },

  convert_csv: {
    id: 'convert_csv',
    name: 'Convert CSV / Tabular Data',
    category: 'data',
    description: 'Convert CSV to JSON, TSV or structured tables.',
    supportedInputs: ['text/csv', 'text/plain', 'text/tab-separated-values', 'application/json'],
    outputType: 'dynamic',
    parameters: [
      {
        name: 'targetFormat',
        type: 'select',
        label: 'Target Format',
        options: [
          { value: 'json', label: 'JSON Data (.json)' },
          { value: 'csv', label: 'Comma Separated Values (.csv)' },
          { value: 'tsv', label: 'Tab Separated Values (.tsv)' }
        ],
        default: 'json'
      }
    ]
  }
};

/**
 * Validates that an operation ID exists in the registry.
 */
export function getOperation(id) {
  return OPERATIONS_REGISTRY[id] || null;
}

/**
 * Checks if a given MIME type is supported by an operation.
 */
export function isInputSupported(operationId, mimeType) {
  const op = getOperation(operationId);
  if (!op) return false;
  if (op.supportedInputs.includes('*/*')) return true;
  return op.supportedInputs.some(supported => {
    if (supported.endsWith('/*')) {
      const prefix = supported.split('/')[0];
      return mimeType.startsWith(prefix + '/');
    }
    return supported === mimeType;
  });
}
