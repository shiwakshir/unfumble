/**
 * Unfumble Dynamic Tool Interface Generator
 * Automatically renders a complete interactive tool UI from a workflow specification.
 */

import { runWorkflow } from '../workflow/engine.js';
import { createZip, formatBytes, sanitizeFileName } from '../operations/file-ops.js';
import { getShareableUrl } from '../workflow/share.js';

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class DynamicToolRenderer {
  constructor(containerElement, workflow, onRefine = null, onSave = null) {
    this.container = containerElement;
    this.workflow = workflow;
    this.onRefine = onRefine;
    this.onSave = onSave;
    this.uploadedFiles = [];
    this.processedOutputs = [];
    this.isProcessing = false;
  }

  render() {
    this.container.innerHTML = `
      <div class="dynamic-tool-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 transition-all">
        <!-- Tool Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">Custom Workflow</span>
            </div>
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight" id="tool-title">${escapeHtml(this.workflow.title || 'Custom File Processor')}</h2>
            <p class="text-sm text-slate-500 mt-1" id="tool-desc">${escapeHtml(this.workflow.description || '')}</p>
          </div>
          
          <div class="flex items-center gap-2 flex-wrap">
            <button id="btn-share-tool" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 transition-colors" title="Copy a shareable link that opens this custom tool directly">
              <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              <span>Share Tool Link</span>
            </button>
            <button id="btn-save-tool" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              Save to My Tools
            </button>
            <button id="btn-export-workflow" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export JSON
            </button>
          </div>
        </div>

        <!-- Workflow Steps Pipeline Chips -->
        <div class="py-4">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Automated Processing Pipeline</div>
          <div class="flex items-center gap-2 flex-wrap" id="pipeline-chips">
            ${this.renderPipelineChips()}
          </div>
        </div>

        <!-- Configurable Settings (Dynamic Form) -->
        <div class="bg-slate-50/70 border border-slate-100 rounded-xl p-5 my-4" id="tool-settings-area">
          <h3 class="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
            Configurable Parameters
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="tool-controls-grid">
            ${this.renderControls()}
          </div>
        </div>

        <!-- File Dropzone -->
        <div class="my-6">
          <div class="dropzone-area border-2 border-dashed border-slate-200 hover:border-teal-500 bg-slate-50/50 hover:bg-teal-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all" id="tool-dropzone">
            <input type="file" id="tool-file-input" ${this.workflow.multiple ? 'multiple' : ''} class="hidden" />
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            </div>
            <p class="text-sm font-semibold text-slate-800">
              Drag & drop ${this.workflow.multiple ? 'files' : 'your file'} here, or <span class="text-teal-600 underline">browse files</span>
            </p>
            <p class="text-xs text-slate-500 mt-1">Supported formats: ${this.workflow.inputTypes.join(', ')}</p>
          </div>

          <!-- Uploaded Files List -->
          <div class="mt-4 hidden" id="uploaded-files-container">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-slate-600 uppercase tracking-wider" id="uploaded-count-label">Uploaded Files (0)</span>
              <button id="btn-clear-files" class="text-xs text-rose-500 hover:underline">Clear all</button>
            </div>
            <div class="space-y-2 max-h-48 overflow-y-auto pr-1" id="uploaded-files-list"></div>
          </div>
        </div>

        <!-- Action Bar: Process Button & Progress -->
        <div class="pt-4 border-t border-slate-100">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button id="btn-process-files" disabled class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Start Processing
            </button>

            <div class="w-full sm:w-1/2 hidden" id="progress-container">
              <div class="flex justify-between text-xs text-slate-600 font-medium mb-1">
                <span id="progress-step-text">Processing...</span>
                <span id="progress-percent-text">0%</span>
              </div>
              <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div id="progress-bar-fill" class="h-full bg-teal-600 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Output Results Container -->
        <div class="mt-8 pt-6 border-t border-slate-100 hidden" id="output-results-container">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Processed Output</h3>
              <p class="text-xs text-slate-500" id="output-summary-text"></p>
            </div>
            <button id="btn-download-all-zip" class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download All (ZIP)
            </button>
          </div>

          <div class="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-left text-sm text-slate-600">
              <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Output File</th>
                  <th class="py-3 px-4">Original Size</th>
                  <th class="py-3 px-4">Final Size</th>
                  <th class="py-3 px-4">Reduction</th>
                  <th class="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100" id="output-table-body"></tbody>
            </table>
          </div>
        </div>

        <!-- Conversational Refinement Bar -->
        <div class="mt-8 pt-6 border-t border-slate-100">
          <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Refine this tool with AI follow-up
          </label>
          <div class="flex gap-2">
            <input type="text" id="input-refine-prompt" placeholder="e.g. 'Actually, make max size 150 KB and add black padding instead'" class="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white" />
            <button id="btn-submit-refine" class="px-5 py-2.5 text-sm font-semibold rounded-xl text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/60 transition-colors">
              Update Tool
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderPipelineChips() {
    return this.workflow.operations.map((op, idx) => `
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
        <span class="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">${idx + 1}</span>
        <span>${escapeHtml(op.name || op.operationId)}</span>
        ${idx < this.workflow.operations.length - 1 ? '<svg class="w-3 h-3 text-slate-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ''}
      </div>
    `).join('');
  }

  renderControls() {
    const controls = [];
    const fields = this.workflow.configurableFields || {};

    if (fields.width !== undefined && fields.height !== undefined) {
      controls.push(`
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Dimensions (W × H)</label>
          <div class="flex items-center gap-1.5">
            <input type="number" id="ctrl-width" value="${fields.width}" class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-teal-500 bg-white" />
            <span class="text-slate-400 text-xs">×</span>
            <input type="number" id="ctrl-height" value="${fields.height}" class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-teal-500 bg-white" />
          </div>
        </div>
      `);
    }

    if (fields.resizeMode !== undefined) {
      controls.push(`
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Resizing Strategy</label>
          <select id="ctrl-resize-mode" class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-teal-500 bg-white">
            <option value="pad" ${fields.resizeMode === 'pad' ? 'selected' : ''}>Pad (No crop, add background)</option>
            <option value="fit" ${fields.resizeMode === 'fit' ? 'selected' : ''}>Fit (Scale inside box)</option>
            <option value="fill" ${fields.resizeMode === 'fill' ? 'selected' : ''}>Fill (Crop to fill)</option>
          </select>
        </div>
      `);
    }

    if (fields.padColor !== undefined) {
      controls.push(`
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Padding Color</label>
          <div class="flex items-center gap-2">
            <input type="color" id="ctrl-pad-color" value="${fields.padColor === 'transparent' ? '#ffffff' : fields.padColor}" class="w-8 h-8 rounded border border-slate-200 cursor-pointer" />
            <span class="text-xs text-slate-500" id="pad-color-label">${fields.padColor}</span>
          </div>
        </div>
      `);
    }

    if (fields.maxSizeKB !== undefined) {
      controls.push(`
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Max File Size (KB)</label>
          <input type="number" id="ctrl-max-size" value="${fields.maxSizeKB}" class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-teal-500 bg-white" />
        </div>
      `);
    }

    if (fields.format !== undefined) {
      controls.push(`
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Target Format</label>
          <select id="ctrl-format" class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-teal-500 bg-white">
            <option value="image/jpeg" ${fields.format === 'image/jpeg' ? 'selected' : ''}>JPG (.jpg)</option>
            <option value="image/png" ${fields.format === 'image/png' ? 'selected' : ''}>PNG (.png)</option>
            <option value="image/webp" ${fields.format === 'image/webp' ? 'selected' : ''}>WebP (.webp)</option>
          </select>
        </div>
      `);
    }

    if (fields.renamePattern !== undefined) {
      controls.push(`
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-slate-600 mb-1">Filename Pattern</label>
          <input type="text" id="ctrl-rename-pattern" value="${fields.renamePattern}" placeholder="e.g. Photo_{n}" class="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-1 focus:ring-teal-500 bg-white" />
        </div>
      `);
    }

    return controls.join('') || '<div class="text-xs text-slate-400 italic">No customizable parameters for this workflow.</div>';
  }

  attachEventListeners() {
    const dropzone = this.container.querySelector('#tool-dropzone');
    const fileInput = this.container.querySelector('#tool-file-input');
    const btnProcess = this.container.querySelector('#btn-process-files');
    const btnClear = this.container.querySelector('#btn-clear-files');
    const btnSave = this.container.querySelector('#btn-save-tool');
    const btnShare = this.container.querySelector('#btn-share-tool');
    const btnExport = this.container.querySelector('#btn-export-workflow');
    const btnRefine = this.container.querySelector('#btn-submit-refine');
    const inputRefine = this.container.querySelector('#input-refine-prompt');
    const btnDownloadZip = this.container.querySelector('#btn-download-all-zip');

    if (btnShare) {
      btnShare.addEventListener('click', async () => {
        const url = getShareableUrl(this.workflow);
        try {
          await navigator.clipboard.writeText(url);
          const originalContent = btnShare.innerHTML;
          btnShare.innerHTML = `
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span class="text-emerald-700 font-bold">Link Copied!</span>
          `;
          btnShare.classList.add('bg-emerald-50', 'border-emerald-200');
          setTimeout(() => {
            btnShare.innerHTML = originalContent;
            btnShare.classList.remove('bg-emerald-50', 'border-emerald-200');
          }, 2500);
        } catch (e) {
          prompt('Copy this shareable tool link:', url);
        }
      });
    }

    // Click dropzone to open file dialog
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag and drop events
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-teal-500', 'bg-teal-50/40');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-teal-500', 'bg-teal-50/40');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-teal-500', 'bg-teal-50/40');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.addFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        this.addFiles(Array.from(fileInput.files));
      }
    });

    btnClear.addEventListener('click', () => {
      this.uploadedFiles = [];
      this.updateFileList();
    });

    btnProcess.addEventListener('click', () => this.handleProcess());

    if (btnSave && this.onSave) {
      btnSave.addEventListener('click', () => this.onSave(this.workflow));
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(this.workflow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.workflow.title.replace(/\s+/g, '_')}_workflow.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (btnRefine && this.onRefine) {
      btnRefine.addEventListener('click', () => {
        const text = inputRefine.value.trim();
        if (text) {
          this.onRefine(text, this.workflow);
        }
      });
      inputRefine.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnRefine.click();
      });
    }

    if (btnDownloadZip) {
      btnDownloadZip.addEventListener('click', async () => {
        if (this.processedOutputs.length === 0) return;
        const zipBlob = await createZip(this.processedOutputs, `${this.workflow.title.replace(/\s+/g, '_')}.zip`);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.workflow.title.replace(/\s+/g, '_')}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  addFiles(files) {
    const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB browser safety limit
    const safeFiles = [];
    let oversizedCount = 0;

    for (const file of files) {
      if (file && file.size > MAX_FILE_SIZE) {
        oversizedCount++;
      } else if (file) {
        safeFiles.push(file);
      }
    }

    if (oversizedCount > 0) {
      alert(`${oversizedCount} file(s) exceed the 250 MB browser safety limit and were skipped to protect your device memory.`);
    }

    if (safeFiles.length === 0) return;

    if (!this.workflow.multiple) {
      this.uploadedFiles = [safeFiles[0]];
    } else {
      const combined = [...this.uploadedFiles, ...safeFiles];
      if (combined.length > 200) {
        alert('Batch processing is limited to 200 files per run to ensure smooth performance.');
        this.uploadedFiles = combined.slice(0, 200);
      } else {
        this.uploadedFiles = combined;
      }
    }
    this.updateFileList();
  }

  updateFileList() {
    const listContainer = this.container.querySelector('#uploaded-files-container');
    const listEl = this.container.querySelector('#uploaded-files-list');
    const countLabel = this.container.querySelector('#uploaded-count-label');
    const btnProcess = this.container.querySelector('#btn-process-files');

    if (this.uploadedFiles.length === 0) {
      listContainer.classList.add('hidden');
      btnProcess.disabled = true;
      return;
    }

    listContainer.classList.remove('hidden');
    btnProcess.disabled = false;
    countLabel.textContent = `Uploaded Files (${this.uploadedFiles.length})`;

    listEl.innerHTML = this.uploadedFiles.map((file, i) => `
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200/70 text-xs">
        <div class="flex items-center gap-2 overflow-hidden">
          <span class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[10px]">${i + 1}</span>
          <span class="font-medium text-slate-800 truncate max-w-xs">${escapeHtml(file.name)}</span>
          <span class="text-slate-400">(${formatBytes(file.size)})</span>
        </div>
        <button data-remove-idx="${i}" class="text-slate-400 hover:text-rose-500 p-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-remove-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
        this.uploadedFiles.splice(idx, 1);
        this.updateFileList();
      });
    });
  }

  async handleProcess() {
    if (this.uploadedFiles.length === 0 || this.isProcessing) return;
    this.isProcessing = true;

    // Collect latest parameters from controls
    const wInput = this.container.querySelector('#ctrl-width');
    const hInput = this.container.querySelector('#ctrl-height');
    const modeSelect = this.container.querySelector('#ctrl-resize-mode');
    const padColorInput = this.container.querySelector('#ctrl-pad-color');
    const sizeInput = this.container.querySelector('#ctrl-max-size');
    const formatSelect = this.container.querySelector('#ctrl-format');
    const patternInput = this.container.querySelector('#ctrl-rename-pattern');

    // Update workflow steps with form input values
    for (const step of this.workflow.operations) {
      if (step.operationId === 'resize_image') {
        if (wInput) step.params.width = parseInt(wInput.value, 10);
        if (hInput) step.params.height = parseInt(hInput.value, 10);
        if (modeSelect) step.params.mode = modeSelect.value;
        if (padColorInput) step.params.padColor = padColorInput.value;
      } else if (step.operationId === 'compress_image') {
        if (sizeInput) step.params.maxSizeKB = parseInt(sizeInput.value, 10);
        if (formatSelect) step.params.format = formatSelect.value;
      } else if (step.operationId === 'convert_image') {
        if (formatSelect) step.params.format = formatSelect.value;
      } else if (step.operationId === 'rename_file') {
        if (patternInput) step.params.pattern = patternInput.value;
      }
    }

    const progressBox = this.container.querySelector('#progress-container');
    const progressFill = this.container.querySelector('#progress-bar-fill');
    const stepText = this.container.querySelector('#progress-step-text');
    const percentText = this.container.querySelector('#progress-percent-text');
    const btnProcess = this.container.querySelector('#btn-process-files');

    progressBox.classList.remove('hidden');
    btnProcess.disabled = true;

    try {
      const result = await runWorkflow(this.workflow, this.uploadedFiles, (progress) => {
        progressFill.style.width = `${progress.percent}%`;
        percentText.textContent = `${progress.percent}%`;
        stepText.textContent = `Step ${progress.stepIndex}/${progress.totalSteps}: ${progress.stepName} (${progress.fileIndex}/${progress.totalFiles})`;
      });

      this.processedOutputs = result.outputs;
      this.renderOutputs(result);
    } catch (err) {
      alert(`Processing error: ${err.message}`);
    } finally {
      this.isProcessing = false;
      btnProcess.disabled = false;
    }
  }

  renderOutputs(result) {
    const outContainer = this.container.querySelector('#output-results-container');
    const summaryText = this.container.querySelector('#output-summary-text');
    const tableBody = this.container.querySelector('#output-table-body');

    outContainer.classList.remove('hidden');
    const origTotal = result.summary.totalOriginalSize;
    const finalTotal = result.summary.totalFinalSize;
    const saved = origTotal > finalTotal ? origTotal - finalTotal : 0;
    const pct = origTotal > 0 ? Math.round((saved / origTotal) * 100) : 0;

    summaryText.textContent = `Completed ${result.outputs.length} file(s) in ${(result.summary.durationMs / 1000).toFixed(1)}s. Total size reduced from ${formatBytes(origTotal)} to ${formatBytes(finalTotal)} (${pct}% smaller).`;

    tableBody.innerHTML = result.outputs.map((out, idx) => {
      const reduction = out.originalSize > out.size
        ? Math.round(((out.originalSize - out.size) / out.originalSize) * 100)
        : 0;

      return `
        <tr class="hover:bg-slate-50/60 transition-colors">
          <td class="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
            <svg class="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="truncate max-w-xs">${escapeHtml(out.name)}</span>
          </td>
          <td class="py-3 px-4 text-slate-500">${formatBytes(out.originalSize)}</td>
          <td class="py-3 px-4 font-semibold text-slate-700">${formatBytes(out.size)}</td>
          <td class="py-3 px-4">
            ${reduction > 0 ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">-${reduction}%</span>` : '<span class="text-xs text-slate-400">Optimized</span>'}
          </td>
          <td class="py-3 px-4 text-right">
            <button data-download-idx="${idx}" class="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('[data-download-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-download-idx'), 10);
        const item = result.outputs[idx];
        const blob = item.data instanceof Blob ? item.data : new Blob([item.data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }
}
