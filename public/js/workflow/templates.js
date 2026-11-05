/**
 * Unfumble Pre-built Custom Tool Templates
 * Ready-to-run workflow specifications designed for instant productivity and modification.
 */

export const WORKFLOW_TEMPLATES = [
  {
    id: 'template_reduce_jpeg_filesize',
    title: 'Reduce File Size of Images (KB)',
    badge: 'File Weight Reducer',
    description: 'Compresses JPEG, PNG, and WebP images down to your exact target file size (e.g. 100 KB, 50 KB, or 10 KB) without altering pixel dimensions.',
    inputTypes: ['image/jpeg', 'image/png', 'image/webp'],
    multiple: true,
    operations: [
      {
        stepId: 'step_compress',
        operationId: 'compress_image',
        name: 'Compress File Size (KB)',
        params: { maxSizeKB: 100, format: 'image/jpeg' }
      }
    ],
    configurableFields: {
      maxSizeKB: 100,
      format: 'image/jpeg'
    }
  },
  {
    id: 'template_resize_rename_images',
    title: 'Resize and Rename 100 Images',
    badge: 'Popular Image Tool',
    description: 'Resizes photos to 600×800 with clean padding, converts to JPG, compresses under 200 KB, and numbers them Photo_1, Photo_2...',
    inputTypes: ['image/jpeg', 'image/png', 'image/webp'],
    multiple: true,
    operations: [
      {
        stepId: 'step_resize',
        operationId: 'resize_image',
        name: 'Resize Image (600×800 Pad)',
        params: { width: 600, height: 800, mode: 'pad', padColor: '#FFFFFF' }
      },
      {
        stepId: 'step_convert',
        operationId: 'convert_image',
        name: 'Convert to JPG',
        params: { format: 'image/jpeg', quality: 0.9 }
      },
      {
        stepId: 'step_compress',
        operationId: 'compress_image',
        name: 'Compress Under 200 KB',
        params: { maxSizeKB: 200, format: 'image/jpeg' }
      },
      {
        stepId: 'step_rename',
        operationId: 'rename_file',
        name: 'Sequential Renaming',
        params: { pattern: 'Photo_{n}', startNumber: 1, padZeros: 1, replaceSpaces: 'keep' }
      }
    ],
    configurableFields: {
      width: 600,
      height: 800,
      resizeMode: 'pad',
      padColor: '#FFFFFF',
      maxSizeKB: 200,
      format: 'image/jpeg',
      renamePattern: 'Photo_{n}'
    }
  },
  {
    id: 'template_merge_compress_pdf',
    title: 'Merge and Compress Application PDFs',
    badge: 'Submission Ready',
    description: 'Combines multiple document PDFs into one continuous PDF and optimizes the internal structure for upload portals.',
    inputTypes: ['application/pdf'],
    multiple: true,
    operations: [
      {
        stepId: 'step_merge',
        operationId: 'merge_pdf',
        name: 'Merge Multiple PDFs',
        params: { outputName: 'Final_Application.pdf' }
      },
      {
        stepId: 'step_compress',
        operationId: 'compress_pdf',
        name: 'Optimize PDF Streams',
        params: { level: 'lossless' }
      }
    ],
    configurableFields: {
      customFilename: 'Final_Application.pdf'
    }
  },
  {
    id: 'template_receipts_to_pdf',
    title: 'Convert Receipts into One Submission PDF',
    badge: 'Expense Toolkit',
    description: 'Combines multiple receipt photos and invoice scans into an organized A4 PDF document with clean page margins.',
    inputTypes: ['image/jpeg', 'image/png'],
    multiple: true,
    operations: [
      {
        stepId: 'step_img_to_pdf',
        operationId: 'convert_images_to_pdf',
        name: 'Convert Receipts to A4 PDF',
        params: { pageSize: 'a4', margin: 20, outputName: 'Receipts_Pack.pdf' }
      }
    ],
    configurableFields: {
      pageSize: 'a4',
      margin: 20,
      outputName: 'Receipts_Pack.pdf'
    }
  },
  {
    id: 'template_passport_visa_photo',
    title: 'Prepare Visa & Passport Photo',
    badge: 'Official Specs',
    description: 'Resizes portrait photo to exact 600×600 px (2×2 inches), adds neutral white padding if needed, converts to JPG, and guarantees size under 240 KB.',
    inputTypes: ['image/jpeg', 'image/png', 'image/webp'],
    multiple: false,
    operations: [
      {
        stepId: 'step_resize_passport',
        operationId: 'resize_image',
        name: 'Resize to 600×600 (Square)',
        params: { width: 600, height: 600, mode: 'pad', padColor: '#FFFFFF' }
      },
      {
        stepId: 'step_convert_jpg',
        operationId: 'convert_image',
        name: 'Convert to JPG',
        params: { format: 'image/jpeg', quality: 0.92 }
      },
      {
        stepId: 'step_compress_limit',
        operationId: 'compress_image',
        name: 'Compress Under 240 KB',
        params: { maxSizeKB: 240, format: 'image/jpeg' }
      },
      {
        stepId: 'step_rename_passport',
        operationId: 'rename_file',
        name: 'Rename to PassportPhoto',
        params: { pattern: 'PassportPhoto', startNumber: 1 }
      }
    ],
    configurableFields: {
      width: 600,
      height: 600,
      maxSizeKB: 240,
      renamePattern: 'PassportPhoto'
    }
  },
  {
    id: 'template_square_social_pad',
    title: 'Square Social Images (with White Padding)',
    badge: 'Social Media',
    description: 'Converts any aspect ratio into a perfect 1080×1080 square without cropping any content by adding white padding.',
    inputTypes: ['image/jpeg', 'image/png', 'image/webp'],
    multiple: true,
    operations: [
      {
        stepId: 'step_square_pad',
        operationId: 'resize_image',
        name: '1080×1080 Square (Pad)',
        params: { width: 1080, height: 1080, mode: 'pad', padColor: '#FFFFFF' }
      },
      {
        stepId: 'step_webp_convert',
        operationId: 'convert_image',
        name: 'Save as WebP',
        params: { format: 'image/webp', quality: 0.9 }
      }
    ],
    configurableFields: {
      width: 1080,
      height: 1080,
      padColor: '#FFFFFF'
    }
  },
  {
    id: 'template_clean_convert_csv',
    title: 'Clean and Convert CSV to JSON',
    badge: 'Developer & Data',
    description: 'Parses tabular CSV files, auto-detects column delimiters, parses numeric and boolean fields, and exports formatted JSON.',
    inputTypes: ['text/csv', 'text/plain'],
    multiple: false,
    operations: [
      {
        stepId: 'step_csv_json',
        operationId: 'convert_csv',
        name: 'CSV to JSON Conversion',
        params: { targetFormat: 'json' }
      }
    ],
    configurableFields: {
      targetFormat: 'json'
    }
  }
];
