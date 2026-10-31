const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

// The replacement for initPdfToolsView through initBatchToolsView
const newImplementations = `// ================= PDF TOOLS VIEW =================
function initPdfToolsView() {
  const subtabs = document.querySelectorAll('.pdf-subtab');
  subtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => {
        t.classList.remove('btn-primary');
        t.classList.add('btn-secondary');
      });
      tab.classList.add('btn-primary');
      tab.classList.remove('btn-secondary');

      const target = tab.getAttribute('data-subtab');
      document.querySelectorAll('.pdf-subview').forEach(view => {
        if (view.id === \`\${target}-view\`) view.classList.remove('hidden');
        else view.classList.add('hidden');
      });
    });
  });

  // 1. Merge PDFs
  let mergeFiles = [];
  const mergeListContainer = document.getElementById('pdf-merge-list-container');
  const mergeItems = document.getElementById('pdf-merge-items');
  const mergeCountLabel = document.getElementById('pdf-merge-count-label');
  const btnClearMerge = document.getElementById('btn-clear-merge-files');
  const btnMerge = document.getElementById('btn-execute-pdf-merge');

  bindDropzone({
    dropzoneId: 'pdf-merge-dropzone',
    inputId: 'pdf-merge-file-input',
    acceptMultiple: true,
    onFilesSelected: (files) => {
      const pdfsOnly = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (pdfsOnly.length === 0) {
        alert('Please select valid PDF documents.');
        return;
      }
      mergeFiles = [...mergeFiles, ...pdfsOnly];
      updateMergeList();
    }
  });

  if (btnClearMerge) {
    btnClearMerge.addEventListener('click', () => {
      mergeFiles = [];
      updateMergeList();
    });
  }

  function updateMergeList() {
    if (mergeFiles.length === 0) {
      mergeListContainer.classList.add('hidden');
      return;
    }
    mergeListContainer.classList.remove('hidden');
    if (mergeCountLabel) {
      mergeCountLabel.textContent = \`Files to Merge (\${mergeFiles.length})\`;
    }
    mergeItems.innerHTML = mergeFiles.map((f, i) => \`
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <div class="flex items-center gap-2 truncate pr-2">
          <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">\${i + 1}</span>
          <span class="font-semibold text-slate-800 truncate">\${f.name}</span>
          <span class="text-slate-400 font-mono text-[11px] flex-shrink-0">\${fileOps.formatBytes(f.size)}</span>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button type="button" data-move-up="\${i}" class="p-1 hover:text-teal-600 \${i === 0 ? 'opacity-30 cursor-not-allowed' : ''}" title="Move up">&uarr;</button>
          <button type="button" data-move-down="\${i}" class="p-1 hover:text-teal-600 \${i === mergeFiles.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}" title="Move down">&darr;</button>
          <button type="button" data-remove-pdf="\${i}" class="p-1 text-rose-500 hover:text-rose-700" title="Remove">&times;</button>
        </div>
      </div>
    \`).join('');

    mergeItems.querySelectorAll('[data-move-up]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-move-up'), 10);
        if (i > 0) {
          const temp = mergeFiles[i];
          mergeFiles[i] = mergeFiles[i - 1];
          mergeFiles[i - 1] = temp;
          updateMergeList();
        }
      });
    });

    mergeItems.querySelectorAll('[data-move-down]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-move-down'), 10);
        if (i < mergeFiles.length - 1) {
          const temp = mergeFiles[i];
          mergeFiles[i] = mergeFiles[i + 1];
          mergeFiles[i + 1] = temp;
          updateMergeList();
        }
      });
    });

    mergeItems.querySelectorAll('[data-remove-pdf]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-remove-pdf'), 10);
        mergeFiles.splice(i, 1);
        updateMergeList();
      });
    });
  }

  if (btnMerge) {
    btnMerge.addEventListener('click', async () => {
      if (mergeFiles.length < 2) {
        alert('Please select at least 2 PDF files to merge.');
        return;
      }
      btnMerge.disabled = true;
      btnMerge.textContent = 'Merging documents...';
      try {
        const mergedBytes = await pdfOps.mergePdfs(mergeFiles);
        const outName = document.getElementById('pdf-merge-outname').value || 'Merged_Document.pdf';
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outName.endsWith('.pdf') ? outName : \`\${outName}.pdf\`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(\`Merge failed: \${err.message}\`);
      } finally {
        btnMerge.disabled = false;
        btnMerge.textContent = 'Merge Documents';
      }
    });
  }

  // 2. Split PDF
  let splitFile = null;
  const splitControls = document.getElementById('pdf-split-controls');
  const splitInfo = document.getElementById('pdf-split-info');
  const splitMode = document.getElementById('pdf-split-mode');
  const splitRangeBox = document.getElementById('pdf-split-range-box');
  const btnSplit = document.getElementById('btn-execute-pdf-split');

  bindDropzone({
    dropzoneId: 'pdf-split-dropzone',
    inputId: 'pdf-split-file-input',
    acceptMultiple: false,
    onFilesSelected: async (files) => {
      const f = files[0];
      if (!f) return;
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        return;
      }
      splitFile = f;
      try {
        const insp = await pdfOps.inspectPdf(splitFile);
        splitInfo.innerHTML = \`
          <span>Loaded: <strong class="text-slate-900">\${splitFile.name}</strong></span>
          <span class="badge badge-teal">\${insp.pageCount} page(s) • \${fileOps.formatBytes(splitFile.size)}</span>
        \`;
        splitControls.classList.remove('hidden');
      } catch (err) {
        alert(\`Unable to read PDF: \${err.message}\`);
      }
    }
  });

  if (splitMode) {
    splitMode.addEventListener('change', () => {
      if (splitMode.value === 'range') splitRangeBox.classList.remove('hidden');
      else splitRangeBox.classList.add('hidden');
    });
  }

  if (btnSplit) {
    btnSplit.addEventListener('click', async () => {
      if (!splitFile) {
        alert('Please upload a PDF file first.');
        return;
      }
      btnSplit.disabled = true;
      btnSplit.textContent = 'Splitting pages...';
      try {
        const ranges = document.getElementById('pdf-split-ranges').value;
        const results = await pdfOps.splitPdf(splitFile, {
          mode: splitMode.value,
          ranges: ranges
        });
        const zipBlob = await fileOps.createZip(results, 'Split_PDFs.zip');
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`Split_\${splitFile.name.replace(/\\.[^/.]+$/, '')}.zip\`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(\`Split failed: \${err.message}\`);
      } finally {
        btnSplit.disabled = false;
        btnSplit.textContent = 'Split & Download ZIP';
      }
    });
  }

  // 3. Organize & Rotate Pages
  let organizeFile = null;
  let organizePages = []; // [{ pageNum: 1, rotation: 0, deleted: false }]
  const orgWorkspace = document.getElementById('pdf-organize-workspace');
  const orgStats = document.getElementById('pdf-organize-stats');
  const orgGrid = document.getElementById('pdf-organize-grid');
  const btnRotateAll = document.getElementById('btn-rotate-all-90');
  const btnSaveOrganized = document.getElementById('btn-save-organized-pdf');

  bindDropzone({
    dropzoneId: 'pdf-organize-dropzone',
    inputId: 'pdf-organize-file-input',
    acceptMultiple: false,
    onFilesSelected: async (files) => {
      const f = files[0];
      if (!f) return;
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        return;
      }
      organizeFile = f;
      try {
        const insp = await pdfOps.inspectPdf(organizeFile);
        organizePages = Array.from({ length: insp.pageCount }, (_, i) => ({
          originalIndex: i,
          pageNum: i + 1,
          rotation: (insp.pages[i] && insp.pages[i].rotation) || 0,
          deleted: false
        }));
        renderOrganizeGrid();
      } catch (err) {
        alert(\`Unable to read PDF: \${err.message}\`);
      }
    }
  });

  function renderOrganizeGrid() {
    if (!organizeFile || organizePages.length === 0) return;
    orgWorkspace.classList.remove('hidden');

    const activeCount = organizePages.filter(p => !p.deleted).length;
    orgStats.textContent = \`\${organizeFile.name} — \${activeCount} of \${organizePages.length} page(s) included\`;

    orgGrid.innerHTML = organizePages.map((p, idx) => \`
      <div class="pdf-page-card \${p.deleted ? 'deleted' : ''} p-3 rounded-xl border border-slate-200 bg-white shadow-xs relative flex flex-col justify-between" style="min-height: 180px;">
        <div class="flex items-center justify-between text-[11px] mb-2">
          <span class="badge \${p.deleted ? 'badge-fail' : 'badge-teal'}">Page \${p.pageNum}</span>
          <span class="text-slate-400 font-mono">\${p.rotation}°</span>
        </div>

        <div class="flex-1 flex items-center justify-center bg-slate-50 border border-slate-150 rounded-lg my-1 p-2 transition-transform duration-200" style="transform: rotate(\${p.rotation}deg);">
          <div class="w-16 h-20 bg-white border border-slate-200 shadow-xs flex flex-col justify-between p-1.5 rounded text-[8px] text-slate-400 select-none">
            <div class="space-y-1">
              <div class="h-1 bg-slate-200 rounded w-3/4"></div>
              <div class="h-1 bg-slate-200 rounded w-full"></div>
              <div class="h-1 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div class="text-center font-bold text-slate-300">\${p.pageNum}</div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
          <button type="button" data-rot-page="\${idx}" title="Rotate 90° Clockwise" class="p-1.5 rounded-md hover:bg-teal-50 text-slate-600 hover:text-teal-700">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <div class="flex items-center gap-0.5">
            <button type="button" data-move-page-left="\${idx}" title="Move Page Left" class="p-1 hover:text-teal-600 \${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}">&larr;</button>
            <button type="button" data-move-page-right="\${idx}" title="Move Page Right" class="p-1 hover:text-teal-600 \${idx === organizePages.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}">&rarr;</button>
          </div>
          <button type="button" data-del-page="\${idx}" title="\${p.deleted ? 'Restore Page' : 'Delete Page'}" class="p-1.5 rounded-md hover:bg-rose-50 \${p.deleted ? 'text-teal-600' : 'text-rose-500'}">
            \${p.deleted ? '↶' : '✕'}
          </button>
        </div>
      </div>
    \`).join('');

    orgGrid.querySelectorAll('[data-rot-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-rot-page'), 10);
        organizePages[idx].rotation = (organizePages[idx].rotation + 90) % 360;
        renderOrganizeGrid();
      });
    });

    orgGrid.querySelectorAll('[data-del-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-page'), 10);
        organizePages[idx].deleted = !organizePages[idx].deleted;
        renderOrganizeGrid();
      });
    });

    orgGrid.querySelectorAll('[data-move-page-left]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-move-page-left'), 10);
        if (idx > 0) {
          const temp = organizePages[idx];
          organizePages[idx] = organizePages[idx - 1];
          organizePages[idx - 1] = temp;
          renderOrganizeGrid();
        }
      });
    });

    orgGrid.querySelectorAll('[data-move-page-right]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-move-page-right'), 10);
        if (idx < organizePages.length - 1) {
          const temp = organizePages[idx];
          organizePages[idx] = organizePages[idx + 1];
          organizePages[idx + 1] = temp;
          renderOrganizeGrid();
        }
      });
    });
  }

  if (btnRotateAll) {
    btnRotateAll.addEventListener('click', () => {
      organizePages.forEach(p => {
        p.rotation = (p.rotation + 90) % 360;
      });
      renderOrganizeGrid();
    });
  }

  if (btnSaveOrganized) {
    btnSaveOrganized.addEventListener('click', async () => {
      if (!organizeFile || organizePages.length === 0) return;
      const activePages = organizePages.filter(p => !p.deleted);
      if (activePages.length === 0) {
        alert('Cannot save a PDF with all pages deleted.');
        return;
      }
      btnSaveOrganized.disabled = true;
      btnSaveOrganized.textContent = 'Saving PDF...';

      try {
        const PDFLib = window.PDFLib || (typeof global !== 'undefined' ? global.PDFLib : null);
        if (!PDFLib) throw new Error('PDF-Lib not available');

        const arrayBuf = await organizeFile.arrayBuffer();
        const srcDoc = await PDFLib.PDFDocument.load(new Uint8Array(arrayBuf), { ignoreEncryption: true });
        const newDoc = await PDFLib.PDFDocument.create();

        for (const p of activePages) {
          const [copiedPage] = await newDoc.copyPages(srcDoc, [p.originalIndex]);
          copiedPage.setRotation(PDFLib.degrees(p.rotation));
          newDoc.addPage(copiedPage);
        }

        const outBytes = await newDoc.save();
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`Organized_\${organizeFile.name}\`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(\`Failed to save organized PDF: \${err.message}\`);
      } finally {
        btnSaveOrganized.disabled = false;
        btnSaveOrganized.textContent = 'Save New PDF';
      }
    });
  }

  // 4. Images to PDF
  let img2PdfFiles = [];
  const img2PdfControls = document.getElementById('pdf-img2pdf-controls');
  const img2PdfStatus = document.getElementById('pdf-img2pdf-status');
  const btnImg2Pdf = document.getElementById('btn-execute-img2pdf');

  bindDropzone({
    dropzoneId: 'pdf-img2pdf-dropzone',
    inputId: 'pdf-img2pdf-file-input',
    acceptMultiple: true,
    onFilesSelected: (files) => {
      const imagesOnly = files.filter(f => f.type.startsWith('image/'));
      if (imagesOnly.length === 0) {
        alert('Please select valid image files (JPG, PNG, WebP).');
        return;
      }
      img2PdfFiles = [...img2PdfFiles, ...imagesOnly];
      if (img2PdfStatus) {
        img2PdfStatus.innerHTML = \`Loaded <strong class="text-teal-700">\${img2PdfFiles.length}</strong> image(s) ready to assemble\`;
      }
      img2PdfControls.classList.remove('hidden');
    }
  });

  if (btnImg2Pdf) {
    btnImg2Pdf.addEventListener('click', async () => {
      if (img2PdfFiles.length === 0) {
        alert('Please upload images first.');
        return;
      }
      btnImg2Pdf.disabled = true;
      btnImg2Pdf.textContent = 'Generating PDF...';
      const pageSize = document.getElementById('pdf-img2pdf-pagesize').value;
      const margin = parseInt(document.getElementById('pdf-img2pdf-margin').value, 10) || 0;
      try {
        const pdfBytes = await pdfOps.convertImagesToPdf(img2PdfFiles, { pageSize, margin });
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Combined_Images.pdf';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(\`Conversion failed: \${err.message}\`);
      } finally {
        btnImg2Pdf.disabled = false;
        btnImg2Pdf.textContent = 'Create PDF Document';
      }
    });
  }

  // 5. Compress PDF
  let compressPdfFile = null;
  let compressedPdfResult = null;
  const compPdfFileCard = document.getElementById('pdf-compress-file-card');
  const compPdfControls = document.getElementById('pdf-compress-controls');
  const btnCompPdf = document.getElementById('btn-execute-pdf-compress');
  const compPdfResultCard = document.getElementById('pdf-compress-result-card');
  const compPdfSavingsBadge = document.getElementById('pdf-compress-savings-badge');
  const compPdfComparisonText = document.getElementById('pdf-compress-comparison-text');
  const btnDownloadCompressed = document.getElementById('btn-download-compressed-pdf');

  bindDropzone({
    dropzoneId: 'pdf-compress-dropzone',
    inputId: 'pdf-compress-file-input',
    acceptMultiple: false,
    onFilesSelected: async (files) => {
      const f = files[0];
      if (!f) return;
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        return;
      }
      compressPdfFile = f;
      compressedPdfResult = null;
      if (compPdfResultCard) compPdfResultCard.classList.add('hidden');

      try {
        const insp = await pdfOps.inspectPdf(compressPdfFile);
        if (compPdfFileCard) {
          compPdfFileCard.classList.remove('hidden');
          compPdfFileCard.innerHTML = \`
            <div class="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div class="truncate">
                  <div class="text-xs font-bold text-slate-900 truncate">\${compressPdfFile.name}</div>
                  <div class="text-[11px] text-slate-500 font-mono mt-0.5">\${fileOps.formatBytes(compressPdfFile.size)} • \${insp.pageCount} page(s)</div>
                </div>
              </div>
              <button type="button" id="btn-change-compress-pdf" class="btn btn-secondary btn-sm text-xs flex-shrink-0">Change</button>
            </div>
          \`;

          const btnChange = document.getElementById('btn-change-compress-pdf');
          if (btnChange) {
            btnChange.addEventListener('click', () => {
              const fileInput = document.getElementById('pdf-compress-file-input');
              if (fileInput) fileInput.click();
            });
          }
        }

        if (compPdfControls) compPdfControls.classList.remove('hidden');
      } catch (err) {
        alert(\`Unable to inspect PDF: \${err.message}\`);
      }
    }
  });

  if (btnCompPdf) {
    btnCompPdf.addEventListener('click', async () => {
      if (!compressPdfFile) {
        alert('Please drop or select a PDF document first.');
        return;
      }
      btnCompPdf.disabled = true;
      btnCompPdf.innerHTML = \`
        <svg class="w-4 h-4 animate-spin inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span>Optimizing PDF...</span>
      \`;

      try {
        const level = document.getElementById('pdf-compress-level') ? document.getElementById('pdf-compress-level').value : 'balanced';
        const result = await pdfOps.compressPdf(compressPdfFile, { level });
        compressedPdfResult = result;

        if (compPdfResultCard) compPdfResultCard.classList.remove('hidden');
        if (compPdfSavingsBadge) {
          compPdfSavingsBadge.textContent = result.reductionPercent > 0 
            ? \`Saved \${result.reductionPercent}%\` 
            : 'Streamlined (Optimal)';
        }
        if (compPdfComparisonText) {
          compPdfComparisonText.textContent = \`Original: \${fileOps.formatBytes(result.originalSize)} → Optimized: \${fileOps.formatBytes(result.compressedSize)} (\${result.pageCount} pages)\`;
        }

        // Automatically trigger download
        const blob = new Blob([result.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`Optimized_\${compressPdfFile.name}\`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(\`Compression failed: \${err.message}\`);
      } finally {
        btnCompPdf.disabled = false;
        btnCompPdf.innerHTML = \`
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
          <span>Optimize & Download</span>
        \`;
      }
    });
  }

  if (btnDownloadCompressed) {
    btnDownloadCompressed.addEventListener('click', () => {
      if (!compressedPdfResult || !compressPdfFile) return;
      const blob = new Blob([compressedPdfResult.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`Optimized_\${compressPdfFile.name}\`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// ================= IMAGE TOOLS VIEW =================
function initImageToolsView() {
  let images = [];
  let processedResults = [];
  const controls = document.getElementById('img-toolkit-controls');
  const btnProcess = document.getElementById('btn-execute-img-process');
  const resultsBox = document.getElementById('img-toolkit-results');
  const outputList = document.getElementById('img-toolkit-output-list');
  const btnZip = document.getElementById('btn-download-img-zip');

  bindDropzone({
    dropzoneId: 'img-toolkit-dropzone',
    inputId: 'img-toolkit-file-input',
    acceptMultiple: true,
    onFilesSelected: (files) => {
      const imagesOnly = files.filter(f => f.type.startsWith('image/'));
      if (imagesOnly.length === 0) {
        alert('Please select valid image files.');
        return;
      }
      images = [...images, ...imagesOnly];
      controls.classList.remove('hidden');
    }
  });

  if (btnProcess) {
    btnProcess.addEventListener('click', async () => {
      if (images.length === 0) {
        alert('Please drop or select images first.');
        return;
      }
      btnProcess.disabled = true;
      btnProcess.textContent = 'Processing Images...';

      const w = parseInt(document.getElementById('img-ctrl-w').value, 10) || 800;
      const h = parseInt(document.getElementById('img-ctrl-h').value, 10) || 600;
      const mode = document.getElementById('img-ctrl-mode').value;
      const padColor = document.getElementById('img-ctrl-padcolor').value;
      const format = document.getElementById('img-ctrl-format').value;
      const maxKB = parseInt(document.getElementById('img-ctrl-maxkb').value, 10);

      processedResults = [];

      try {
        for (const img of images) {
          let blob = await imageOps.resizeImage(img, { width: w, height: h, mode, padColor, format });
          if (maxKB) {
            blob = await imageOps.compressImage(blob, { maxSizeKB: maxKB, format });
          }

          const ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/png' ? 'png' : 'webp');
          const baseName = img.name.replace(/\\.[^/.]+$/, '');
          const newName = \`\${baseName}_processed.\${ext}\`;

          processedResults.push({
            name: newName,
            data: blob,
            size: blob.size,
            originalSize: img.size
          });
        }

        resultsBox.classList.remove('hidden');
        outputList.innerHTML = processedResults.map((item, idx) => \`
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
            <span class="font-medium text-slate-800">\${item.name} (\${fileOps.formatBytes(item.size)})</span>
            <button type="button" data-dl-img="\${idx}" class="btn btn-secondary btn-sm">Download</button>
          </div>
        \`).join('');

        outputList.querySelectorAll('[data-dl-img]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-dl-img'), 10);
            const itm = processedResults[idx];
            const url = URL.createObjectURL(itm.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = itm.name;
            a.click();
            URL.revokeObjectURL(url);
          });
        });

      } catch (err) {
        alert(\`Image processing error: \${err.message}\`);
      } finally {
        btnProcess.disabled = false;
        btnProcess.textContent = 'Process Images';
      }
    });
  }

  if (btnZip) {
    btnZip.addEventListener('click', async () => {
      if (processedResults.length === 0) return;
      const zip = await fileOps.createZip(processedResults, 'Images_Export.zip');
      const url = URL.createObjectURL(zip);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Images_Export.zip';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// ================= FILE CONVERTER VIEW =================
function initConverterView() {
  let file = null;
  const controls = document.getElementById('converter-controls');
  const sourceInfo = document.getElementById('converter-source-info');
  const targetSelect = document.getElementById('converter-target-select');
  const btnConvert = document.getElementById('btn-execute-convert');
  const downloadBox = document.getElementById('converter-download-box');
  const resultName = document.getElementById('converter-result-name');
  const btnDownload = document.getElementById('btn-download-converted');
  let convertedBlob = null;
  let convertedFileName = '';

  bindDropzone({
    dropzoneId: 'converter-dropzone',
    inputId: 'converter-file-input',
    acceptMultiple: false,
    onFilesSelected: async (files) => {
      const f = files[0];
      if (!f) return;
      file = f;
      const insp = await fileOps.inspectFile(file, file.name);
      sourceInfo.textContent = \`\${file.name} (\${insp.detectedType}, \${fileOps.formatBytes(file.size)})\`;
      controls.classList.remove('hidden');

      targetSelect.innerHTML = '';
      if (insp.mimeType.startsWith('image/')) {
        targetSelect.innerHTML = \`
          <option value="image/jpeg">JPG (.jpg)</option>
          <option value="image/png">PNG (.png)</option>
          <option value="image/webp">WebP (.webp)</option>
          <option value="pdf">PDF Document (.pdf)</option>
        \`;
      } else if (file.name.endsWith('.csv') || insp.mimeType === 'text/csv') {
        targetSelect.innerHTML = \`
          <option value="json">JSON Data (.json)</option>
          <option value="tsv">Tab Separated (.tsv)</option>
        \`;
      } else if (file.name.endsWith('.json')) {
        targetSelect.innerHTML = \`
          <option value="csv">Comma Separated CSV (.csv)</option>
        \`;
      } else {
        targetSelect.innerHTML = \`<option value="copy">Keep format</option>\`;
      }
    }
  });

  if (btnConvert) {
    btnConvert.addEventListener('click', async () => {
      if (!file) {
        alert('Please drop or select a file to convert.');
        return;
      }
      btnConvert.disabled = true;
      btnConvert.textContent = 'Converting...';
      const target = targetSelect.value;
      const base = file.name.replace(/\\.[^/.]+$/, '');

      try {
        if (target.startsWith('image/')) {
          convertedBlob = await imageOps.convertImage(file, { format: target });
          const ext = target === 'image/jpeg' ? 'jpg' : (target === 'image/png' ? 'png' : 'webp');
          convertedFileName = \`\${base}.\${ext}\`;
        } else if (target === 'pdf') {
          const pdfBytes = await pdfOps.convertImagesToPdf([file]);
          convertedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
          convertedFileName = \`\${base}.pdf\`;
        } else if (target === 'json') {
          const text = await file.text();
          const jsonArr = dataOps.csvToJson(text);
          convertedBlob = new Blob([JSON.stringify(jsonArr, null, 2)], { type: 'application/json' });
          convertedFileName = \`\${base}.json\`;
        } else if (target === 'tsv') {
          const text = await file.text();
          const { headers, rows } = dataOps.parseCSV(text);
          const tsv = [headers.join('\\t'), ...rows.map(r => r.join('\\t'))].join('\\n');
          convertedBlob = new Blob([tsv], { type: 'text/tab-separated-values' });
          convertedFileName = \`\${base}.tsv\`;
        } else if (target === 'csv') {
          const text = await file.text();
          const json = JSON.parse(text);
          const csv = dataOps.jsonToCsv(json);
          convertedBlob = new Blob([csv], { type: 'text/csv' });
          convertedFileName = \`\${base}.csv\`;
        }

        downloadBox.classList.remove('hidden');
        resultName.textContent = \`\${convertedFileName} (\${fileOps.formatBytes(convertedBlob.size)})\`;
      } catch (err) {
        alert(\`Conversion error: \${err.message}\`);
      } finally {
        btnConvert.disabled = false;
        btnConvert.textContent = 'Convert File';
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!convertedBlob) return;
      const url = URL.createObjectURL(convertedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = convertedFileName;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// ================= BATCH & UTILITIES VIEW =================
function initBatchToolsView() {
  const subtabs = document.querySelectorAll('.batch-subtab');
  subtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => {
        t.classList.remove('btn-primary');
        t.classList.add('btn-secondary');
      });
      tab.classList.add('btn-primary');
      tab.classList.remove('btn-secondary');

      const target = tab.getAttribute('data-subtab');
      document.querySelectorAll('.batch-subview').forEach(view => {
        if (view.id === \`\${target}-view\`) view.classList.remove('hidden');
        else view.classList.add('hidden');
      });
    });
  });

  // 1. Filename Fixer
  let renameFilesList = [];
  const renameControlsBox = document.getElementById('rename-controls-box');
  const renamePatternInput = document.getElementById('rename-pattern-input');
  const renameSpacesSelect = document.getElementById('rename-spaces-select');
  const renameCasingSelect = document.getElementById('rename-casing-select');
  const renamePreviewTbody = document.getElementById('rename-preview-tbody');
  const btnRenameZip = document.getElementById('btn-execute-rename-zip');

  bindDropzone({
    dropzoneId: 'rename-dropzone',
    inputId: 'rename-file-input',
    acceptMultiple: true,
    onFilesSelected: (files) => {
      renameFilesList = files;
      renameControlsBox.classList.remove('hidden');
      updateRenamePreview();
    }
  });

  function updateRenamePreview() {
    if (renameFilesList.length === 0) return;
    const renamed = fileOps.renameFiles(renameFilesList, {
      pattern: renamePatternInput.value,
      replaceSpaces: renameSpacesSelect.value,
      casing: renameCasingSelect.value
    });

    renamePreviewTbody.innerHTML = renamed.map(r => \`
      <tr class="hover:bg-slate-50">
        <td class="p-2.5 text-slate-500">\${r.originalName}</td>
        <td class="p-2.5 text-slate-400">&rarr;</td>
        <td class="p-2.5 font-bold text-teal-700">\${r.newName}</td>
      </tr>
    \`).join('');
  }

  [renamePatternInput, renameSpacesSelect, renameCasingSelect].forEach(input => {
    if (input) input.addEventListener('input', updateRenamePreview);
  });

  if (btnRenameZip) {
    btnRenameZip.addEventListener('click', async () => {
      if (renameFilesList.length === 0) return;
      btnRenameZip.disabled = true;
      btnRenameZip.textContent = 'Packaging ZIP...';
      try {
        const renamed = fileOps.renameFiles(renameFilesList, {
          pattern: renamePatternInput.value,
          replaceSpaces: renameSpacesSelect.value,
          casing: renameCasingSelect.value
        });
        const filesForZip = renamed.map(r => ({ name: r.newName, data: r.file }));
        const zipBlob = await fileOps.createZip(filesForZip, 'Renamed_Files.zip');
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Renamed_Files.zip';
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(\`Rename packaging failed: \${err.message}\`);
      } finally {
        btnRenameZip.disabled = false;
        btnRenameZip.textContent = 'Download Renamed Files (ZIP)';
      }
    });
  }

  // 2. Duplicate Finder
  let dupeFiles = [];
  const dupeResultsBox = document.getElementById('dupe-results-box');

  bindDropzone({
    dropzoneId: 'dupe-dropzone',
    inputId: 'dupe-file-input',
    acceptMultiple: true,
    onFilesSelected: async (files) => {
      dupeFiles = files;
      dupeResultsBox.classList.remove('hidden');
      dupeResultsBox.innerHTML = '<div class="text-xs text-slate-400 animate-pulse">Calculating cryptographic SHA-256 hashes...</div>';

      try {
        const dupes = await fileOps.findDuplicateFiles(dupeFiles);
        if (dupes.duplicateGroupsCount === 0) {
          dupeResultsBox.innerHTML = \`
            <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
              <strong>No exact duplicates detected!</strong> All \${dupes.totalChecked} files have unique cryptographic hashes.
            </div>
          \`;
        } else {
          dupeResultsBox.innerHTML = \`
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-3">
              Found <strong>\${dupes.duplicateGroupsCount} duplicate group(s)</strong>. Removing duplicates could reclaim <strong>\${fileOps.formatBytes(dupes.totalWastedBytes)}</strong> of wasted storage.
            </div>
            <div class="space-y-2">
              \${dupes.duplicateGroups.map((g, i) => \`
                <div class="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <div class="font-bold text-slate-800 mb-1">Group \${i + 1} (\${g.count} copies, \${fileOps.formatBytes(g.size)} each)</div>
                  <div class="text-[11px] font-mono text-slate-400 truncate mb-1.5">SHA-256: \${g.hash}</div>
                  <ul class="list-disc list-inside text-slate-600 space-y-0.5">
                    \${g.files.map(f => \`<li>\${f.name}</li>\`).join('')}
                  </ul>
                </div>
              \`).join('')}
            </div>
          \`;
        }
      } catch (err) {
        dupeResultsBox.innerHTML = \`<div class="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg">Duplicate check failed: \${err.message}</div>\`;
      }
    }
  });

  // 3. File Inspector
  const inspectResultsBox = document.getElementById('inspect-results-box');

  bindDropzone({
    dropzoneId: 'inspect-dropzone',
    inputId: 'inspect-file-input',
    acceptMultiple: false,
    onFilesSelected: async (files) => {
      const file = files[0];
      if (!file) return;
      const insp = await fileOps.inspectFile(file, file.name);

      let extraMeta = '';
      if (insp.mimeType.startsWith('image/')) {
        try {
          const imgMeta = await imageOps.inspectImage(file);
          extraMeta = \`
            <tr><td class="p-2 font-semibold">Dimensions</td><td class="p-2">\${imgMeta.width} × \${imgMeta.height} px (\${imgMeta.aspectRatio})</td></tr>
          \`;
        } catch (e) {}
      } else if (insp.mimeType === 'application/pdf') {
        try {
          const pdfMeta = await pdfOps.inspectPdf(file);
          extraMeta = \`
            <tr><td class="p-2 font-semibold">Page Count</td><td class="p-2">\${pdfMeta.pageCount} page(s)</td></tr>
            <tr><td class="p-2 font-semibold">Producer / Creator</td><td class="p-2">\${pdfMeta.producer || 'Standard'}</td></tr>
          \`;
        } catch (e) {}
      }

      inspectResultsBox.classList.remove('hidden');
      inspectResultsBox.innerHTML = \`
        <div class="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <table class="w-full text-left">
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-2 font-semibold text-slate-600 w-1/3">Filename</td><td class="p-2 text-slate-800 font-bold">\${insp.filename}</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">Detected Format</td><td class="p-2 text-slate-800">\${insp.detectedType}</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">MIME Type</td><td class="p-2 text-slate-800">\${insp.mimeType}</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">File Size</td><td class="p-2 text-slate-800">\${insp.sizeFormatted} (\${insp.sizeBytes} bytes)</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">Magic Bytes (Hex)</td><td class="p-2 font-mono text-teal-700">\${insp.magicHex}</td></tr>
              \${extraMeta}
            </tbody>
          </table>
        </div>
      \`;
    }
  });
}
`;

// Locate from "// ================= PDF TOOLS VIEW =================" to "// ================= MY TOOLS VIEW ================="
const startTag = '// ================= PDF TOOLS VIEW =================';
const endTag = '// ================= MY TOOLS VIEW =================';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find delimiter tags in app.js', { startIndex, endIndex });
  process.exit(1);
}

const updatedContent = content.slice(0, startIndex) + newImplementations + '\n' + content.slice(endIndex);
fs.writeFileSync(appPath, updatedContent, 'utf8');
console.log('Successfully patched public/js/app.js!');
