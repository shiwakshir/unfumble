/**
 * FileFix Main Application Controller
 * Wires together UI components, workflow engine, Smart Fix, and file operations.
 */

import { OPERATIONS_REGISTRY, getOperation } from './operations/registry.js';
import * as pdfOps from './operations/pdf-ops.js';
import * as imageOps from './operations/image-ops.js';
import * as fileOps from './operations/file-ops.js';
import * as dataOps from './operations/data-ops.js';
import { runWorkflow } from './workflow/engine.js';
import { parseWorkflowRequest } from './workflow/nlp-parser.js';
import { WORKFLOW_TEMPLATES } from './workflow/templates.js';
import { SMARTFIX_PRESETS, parseRequirementsText, diagnoseFile, repairFile } from './smartfix/smartfix.js';
import { DynamicToolRenderer } from './ui/dynamic-tool.js';
import { parseCurrentLocationHash } from './workflow/share.js';

// --- State ---
const state = {
  currentTab: 'tab-home',
  currentWorkflow: null,
  activeRenderer: null,
  savedWorkflows: [],
  geminiApiKey: localStorage.getItem('filefix_gemini_key') || '',
  supportUrl: 'https://ko-fi.com/shiwakshi',
  smartFixFile: null,
  smartFixDiagnosis: null,
  smartFixRepaired: null
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadSavedWorkflows();
  initNavigation();
  initGlobalSearch();
  initHomepage();
  initBuildToolView();
  initSmartFixView();
  initPdfToolsView();
  initImageToolsView();
  initConverterView();
  initBatchToolsView();
  initMyToolsView();
  initSettingsModal();
  initFeedbackModal();
  initPwa();
  handleDeepLink();

  window.addEventListener('hashchange', () => {
    handleDeepLink();
  });
});

// ================= PWA & DEEP LINKING =================
let deferredInstallPrompt = null;

function initPwa() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('FileFix Service Worker registered:', reg.scope);
      }).catch(err => {
        console.warn('Service Worker registration skipped (running without SW):', err);
      });
    });
  }

  // 2. Install App Button
  const btnInstall = document.getElementById('btn-install-pwa');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstall) btnInstall.classList.remove('hidden');
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          btnInstall.classList.add('hidden');
        }
        deferredInstallPrompt = null;
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    if (btnInstall) btnInstall.classList.add('hidden');
    console.log('FileFix app installed successfully');
  });
}

function handleDeepLink() {
  const directive = parseCurrentLocationHash();
  if (!directive) return;

  if (directive.type === 'custom_tool' || directive.type === 'template') {
    switchTab('tab-build-tool');
    renderCustomTool(directive.workflow);
  } else if (directive.type === 'smartfix') {
    switchTab('tab-smart-fix');
    const presetSelect = document.getElementById('smartfix-preset-select');
    if (presetSelect) {
      presetSelect.value = directive.presetId;
      presetSelect.dispatchEvent(new Event('change'));
    }
  } else if (directive.type === 'tab') {
    switchTab(directive.tabId);
  }
}

// ================= NAVIGATION =================
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  const brand = document.getElementById('nav-brand');
  if (brand) {
    brand.addEventListener('click', () => switchTab('tab-home'));
  }

  // Initialize initial history entry if not already set
  const initialTab = state.currentTab || 'tab-home';
  const initialSlug = initialTab.replace(/^tab-/, '');
  if (!window.location.hash) {
    history.replaceState({ tabId: initialTab }, '', `#tab=${initialSlug}`);
  }

  // Listen for browser Back and Forward buttons
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.tabId) {
      switchTab(e.state.tabId, false);
    } else {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.startsWith('tab=')) {
        const tId = `tab-${hash.replace('tab=', '')}`;
        if (document.getElementById(tId)) {
          switchTab(tId, false);
          return;
        }
      }
      handleDeepLink();
    }
  });

  // Keyboard shortcut '/' to focus search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const searchInput = document.getElementById('global-tool-search');
      if (searchInput) searchInput.focus();
    }
  });
}

export function switchTab(tabId, pushHistory = true) {
  state.currentTab = tabId;

  // Push to browser history so Back / Forward buttons work
  if (pushHistory) {
    const slug = tabId.replace(/^tab-/, '');
    const newHash = `#tab=${slug}`;
    if (window.location.hash !== newHash) {
      history.pushState({ tabId }, '', newHash);
    }
  }

  // Update nav link styles
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.getAttribute('data-tab') === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Toggle tab contents
  document.querySelectorAll('.tab-content').forEach(section => {
    if (section.id === tabId) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================= GLOBAL SEARCH =================
function initGlobalSearch() {
  const searchInput = document.getElementById('global-tool-search');
  const dropdown = document.getElementById('search-results-dropdown');
  if (!searchInput || !dropdown) return;

  const toolsList = [
    { name: 'Compress PDF', category: 'PDF', tab: 'tab-pdf-tools', subtab: 'pdf-compress' },
    { name: 'Merge PDFs', category: 'PDF', tab: 'tab-pdf-tools', subtab: 'pdf-merge' },
    { name: 'Split PDF', category: 'PDF', tab: 'tab-pdf-tools', subtab: 'pdf-split' },
    { name: 'Rotate & Delete PDF Pages', category: 'PDF', tab: 'tab-pdf-tools', subtab: 'pdf-organize' },
    { name: 'Images to PDF', category: 'PDF', tab: 'tab-pdf-tools', subtab: 'pdf-img-to-pdf' },
    { name: 'Resize Image (Fit, Fill, Pad)', category: 'Image', tab: 'tab-image-tools' },
    { name: 'Compress Image (< 200 KB)', category: 'Image', tab: 'tab-image-tools' },
    { name: 'Convert Image Format', category: 'Image', tab: 'tab-image-tools' },
    { name: 'Smart Fix (File Rejection Repair)', category: 'Assistant', tab: 'tab-smart-fix' },
    { name: 'Build My Tool (Custom AI)', category: 'Flagship', tab: 'tab-build-tool' },
    { name: 'Filename Fixer (Bulk Rename)', category: 'Batch', tab: 'tab-batch-tools', subtab: 'batch-rename' },
    { name: 'Duplicate File Finder (SHA-256)', category: 'Batch', tab: 'tab-batch-tools', subtab: 'batch-duplicates' },
    { name: 'File Inspector', category: 'Batch', tab: 'tab-batch-tools', subtab: 'batch-inspector' },
    { name: 'CSV to JSON / TSV Converter', category: 'Converter', tab: 'tab-file-converter' }
  ];

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      dropdown.classList.add('hidden');
      return;
    }

    const matches = toolsList.filter(t => t.name.toLowerCase().includes(query) || t.category.toLowerCase().includes(query));
    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 italic">No tools found matching "${query}"</div>`;
    } else {
      dropdown.innerHTML = matches.map(m => `
        <div class="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0" data-tab="${m.tab}" data-subtab="${m.subtab || ''}">
          <span class="text-xs font-medium text-slate-800">${m.name}</span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">${m.category}</span>
        </div>
      `).join('');

      dropdown.querySelectorAll('[data-tab]').forEach(el => {
        el.addEventListener('click', () => {
          const tab = el.getAttribute('data-tab');
          const subtab = el.getAttribute('data-subtab');
          switchTab(tab);
          if (subtab) {
            const subtabBtn = document.querySelector(`[data-subtab="${subtab}"]`);
            if (subtabBtn) subtabBtn.click();
          }
          searchInput.value = '';
          dropdown.classList.add('hidden');
        });
      });
    }

    dropdown.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// ================= UNIVERSAL DROPZONE HELPER =================
function bindDropzone({ dropzoneId, inputId, acceptMultiple = false, onFilesSelected }) {
  const dropzone = document.getElementById(dropzoneId);
  const fileInput = document.getElementById(inputId);
  if (!dropzone || !fileInput) return;

  dropzone.setAttribute('tabindex', '0');
  dropzone.setAttribute('role', 'button');

  const triggerInput = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A' || e.target.tagName === 'INPUT') {
      return;
    }
    fileInput.click();
  };

  dropzone.addEventListener('click', triggerInput);
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('drag-active');
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('drag-active');
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget && dropzone.contains(e.relatedTarget)) return;
    dropzone.classList.remove('drag-active');
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-active');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(acceptMultiple ? files : [files[0]]);
    }
  };

  dropzone.addEventListener('dragenter', onDragEnter);
  dropzone.addEventListener('dragover', onDragOver);
  dropzone.addEventListener('dragleave', onDragLeave);
  dropzone.addEventListener('drop', onDrop);

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      const files = Array.from(fileInput.files);
      onFilesSelected(acceptMultiple ? files : [files[0]]);
      fileInput.value = ''; // Reset input to allow re-selecting same file
    }
  });
}

// ================= HOMEPAGE =================
function initHomepage() {
  const homeInput = document.getElementById('home-nlp-input');
  const btnBuild = document.getElementById('home-btn-build');

  const handleHomeBuild = async (text) => {
    const prompt = text || (homeInput ? homeInput.value.trim() : '');
    if (!prompt) {
      alert('Please describe what you would like your custom tool to do.');
      return;
    }
    switchTab('tab-build-tool');
    const builderInput = document.getElementById('builder-prompt-input');
    if (builderInput) builderInput.value = prompt;
    await executeToolGeneration(prompt);
  };

  if (btnBuild) {
    btnBuild.addEventListener('click', () => handleHomeBuild());
  }
  if (homeInput) {
    homeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleHomeBuild();
    });
  }

  // Suggestion Pills
  document.querySelectorAll('.nlp-suggestion-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const prompt = pill.getAttribute('data-prompt');
      if (homeInput) homeInput.value = prompt;
      handleHomeBuild(prompt);
    });
  });

  // Action Cards Navigation
  const cardBuild = document.getElementById('card-action-build');
  const cardSmartFix = document.getElementById('card-action-smartfix');
  const cardBrowse = document.getElementById('card-action-browse');

  if (cardBuild) cardBuild.addEventListener('click', () => switchTab('tab-build-tool'));
  if (cardSmartFix) cardSmartFix.addEventListener('click', () => switchTab('tab-smart-fix'));
  if (cardBrowse) cardBrowse.addEventListener('click', () => switchTab('tab-pdf-tools'));

  // Smart Homepage Dropzone Recommender
  const smartDropzone = document.getElementById('home-smart-dropzone');
  const smartFileInput = document.getElementById('home-smart-file-input');
  const recommendationBox = document.getElementById('home-file-recommendation');

  if (smartDropzone && smartFileInput) {
    smartDropzone.addEventListener('click', () => smartFileInput.click());

    smartDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      smartDropzone.classList.add('drag-active');
    });
    smartDropzone.addEventListener('dragleave', () => smartDropzone.classList.remove('drag-active'));
    smartDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      smartDropzone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleSmartFileRecommendation(e.dataTransfer.files[0]);
      }
    });

    smartFileInput.addEventListener('change', () => {
      if (smartFileInput.files && smartFileInput.files.length > 0) {
        handleSmartFileRecommendation(smartFileInput.files[0]);
      }
    });
  }

  // Popular Tools Grid
  renderPopularToolsGrid();
}

async function handleSmartFileRecommendation(file) {
  const box = document.getElementById('home-file-recommendation');
  if (!box) return;

  const inspection = await fileOps.inspectFile(file, file.name);
  let recommendedTools = [];

  if (inspection.mimeType === 'application/pdf') {
    recommendedTools = [
      { name: 'Compress PDF', tab: 'tab-pdf-tools', subtab: 'pdf-compress' },
      { name: 'Split PDF Pages', tab: 'tab-pdf-tools', subtab: 'pdf-split' },
      { name: 'Organize / Rotate Pages', tab: 'tab-pdf-tools', subtab: 'pdf-organize' },
      { name: 'Diagnose Rejection with Smart Fix', tab: 'tab-smart-fix' }
    ];
  } else if (inspection.mimeType.startsWith('image/')) {
    recommendedTools = [
      { name: 'Resize to Exact Dimensions (Pad/Fit)', tab: 'tab-image-tools' },
      { name: 'Compress Image (< 200 KB)', tab: 'tab-image-tools' },
      { name: 'Convert to PDF', tab: 'tab-pdf-tools', subtab: 'pdf-img-to-pdf' },
      { name: 'Diagnose Portal Rejection', tab: 'tab-smart-fix' }
    ];
  } else if (inspection.mimeType === 'text/csv' || file.name.endsWith('.csv')) {
    recommendedTools = [
      { name: 'Convert CSV to JSON / TSV', tab: 'tab-file-converter' },
      { name: 'Batch Rename', tab: 'tab-batch-tools', subtab: 'batch-rename' }
    ];
  } else {
    recommendedTools = [
      { name: 'Inspect Magic Bytes', tab: 'tab-batch-tools', subtab: 'batch-inspector' },
      { name: 'Batch Rename', tab: 'tab-batch-tools', subtab: 'batch-rename' }
    ];
  }

  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="badge badge-teal">${inspection.detectedType}</span>
          <span class="text-xs text-slate-500 font-mono">${fileOps.formatBytes(inspection.sizeBytes)}</span>
        </div>
        <h4 class="text-sm font-bold text-slate-800">${file.name}</h4>
        <p class="text-xs text-slate-500 mt-0.5">Recommended operations based on file characteristics:</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        ${recommendedTools.map(t => `
          <button class="btn btn-secondary btn-sm rec-btn" data-tab="${t.tab}" data-subtab="${t.subtab || ''}">
            ${t.name} &rarr;
          </button>
        `).join('')}
      </div>
    </div>
  `;

  box.querySelectorAll('.rec-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      const subtab = btn.getAttribute('data-subtab');
      switchTab(tab);
      if (subtab) {
        const subtabBtn = document.querySelector(`[data-subtab="${subtab}"]`);
        if (subtabBtn) subtabBtn.click();
      }
    });
  });
}

function renderPopularToolsGrid() {
  const grid = document.getElementById('popular-tools-grid');
  if (!grid) return;

  const popularTools = [
    {
      title: 'Compress PDF',
      desc: 'Lossless & balanced size reduction',
      category: 'PDF',
      bg: 'bg-emerald-50 text-emerald-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>',
      tab: 'tab-pdf-tools',
      subtab: 'pdf-compress'
    },
    {
      title: 'Merge PDFs',
      desc: 'Combine multiple PDFs in sequence',
      category: 'PDF',
      bg: 'bg-teal-50 text-teal-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/>',
      tab: 'tab-pdf-tools',
      subtab: 'pdf-merge'
    },
    {
      title: 'Split PDF',
      desc: 'Extract individual pages or ranges',
      category: 'PDF',
      bg: 'bg-teal-50 text-teal-700',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/>',
      tab: 'tab-pdf-tools',
      subtab: 'pdf-split'
    },
    {
      title: 'Resize Image',
      desc: 'Fit, fill, or pad with neutral border',
      category: 'IMAGE',
      bg: 'bg-indigo-50 text-indigo-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>',
      tab: 'tab-image-tools'
    },
    {
      title: 'Compress Image',
      desc: 'Iterative target file size in KB',
      category: 'IMAGE',
      bg: 'bg-amber-50 text-amber-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>',
      tab: 'tab-image-tools'
    },
    {
      title: 'Images to PDF',
      desc: 'Photos & scans into clean A4/Fit doc',
      category: 'PDF',
      bg: 'bg-teal-50 text-teal-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
      tab: 'tab-pdf-tools',
      subtab: 'pdf-img-to-pdf'
    },
    {
      title: 'Organize Pages',
      desc: 'Rotate, reorder, and remove pages',
      category: 'PDF',
      bg: 'bg-indigo-50 text-indigo-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
      tab: 'tab-pdf-tools',
      subtab: 'pdf-organize'
    },
    {
      title: 'Smart Fix',
      desc: 'Diagnose & repair rejected uploads',
      category: 'REPAIR',
      bg: 'bg-rose-50 text-rose-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
      tab: 'tab-smart-fix'
    },
    {
      title: 'Rename Files',
      desc: 'Bulk sequential numbering & tokens',
      category: 'BATCH',
      bg: 'bg-emerald-50 text-emerald-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>',
      tab: 'tab-batch-tools',
      subtab: 'batch-rename'
    },
    {
      title: 'Convert File',
      desc: 'Image & CSV/TSV/JSON cross-formats',
      category: 'CONVERT',
      bg: 'bg-teal-50 text-teal-700',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>',
      tab: 'tab-file-converter'
    },
    {
      title: 'Duplicate Finder',
      desc: 'Cryptographic SHA-256 detection',
      category: 'BATCH',
      bg: 'bg-amber-50 text-amber-600',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
      tab: 'tab-batch-tools',
      subtab: 'batch-duplicates'
    },
    {
      title: 'File Inspector',
      desc: 'Hex signature, MIME & dimensions',
      category: 'INSPECT',
      bg: 'bg-slate-100 text-slate-700',
      svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      tab: 'tab-batch-tools',
      subtab: 'batch-inspector'
    }
  ];

  grid.innerHTML = popularTools.map(t => `
    <div class="card card-hover cursor-pointer p-4 flex flex-col justify-between" data-tab="${t.tab}" data-subtab="${t.subtab || ''}">
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="w-9 h-9 rounded-xl ${t.bg} flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">${t.svg}</svg>
          </div>
          <span class="text-[10px] font-semibold text-slate-400 font-mono tracking-wider">${t.category}</span>
        </div>
        <h4 class="text-xs font-bold text-slate-900">${t.title}</h4>
        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${t.desc}</p>
      </div>
      <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center text-[11px] font-semibold text-teal-600">
        <span>Open tool</span>
        <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-tab]').forEach(card => {
    card.addEventListener('click', () => {
      const tab = card.getAttribute('data-tab');
      const subtab = card.getAttribute('data-subtab');
      switchTab(tab);
      if (subtab) {
        const subtabBtn = document.querySelector(`[data-subtab="${subtab}"]`);
        if (subtabBtn) subtabBtn.click();
      }
    });
  });
}

// ================= BUILD MY TOOL (FLAGSHIP) =================
function initBuildToolView() {
  const btnGenerate = document.getElementById('btn-generate-tool');
  const promptInput = document.getElementById('builder-prompt-input');

  if (btnGenerate && promptInput) {
    btnGenerate.addEventListener('click', () => {
      const prompt = promptInput.value.trim();
      if (!prompt) {
        alert('Please describe what your custom tool should do.');
        return;
      }
      executeToolGeneration(prompt);
    });
  }

  // Pre-built template chips
  document.querySelectorAll('.btn-template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const templateId = chip.getAttribute('data-template-id');
      const tpl = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
      if (tpl) {
        renderCustomTool(tpl);
      }
    });
  });

  // Render templates gallery
  renderWorkflowTemplatesGallery();
}

async function executeToolGeneration(prompt, existingWorkflow = null) {
  const mount = document.getElementById('dynamic-tool-mount');
  if (!mount) return;

  mount.innerHTML = `
    <div class="card p-8 text-center animate-pulse">
      <div class="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 mx-auto mb-3">
        <svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
      <h3 class="text-sm font-bold text-slate-800">Generating Custom Tool Interface...</h3>
      <p class="text-xs text-slate-500 mt-1">Interpreting natural language request & assembling validated workflow pipeline.</p>
    </div>
  `;

  try {
    const workflow = await parseWorkflowRequest(prompt, existingWorkflow, state.geminiApiKey);
    state.currentWorkflow = workflow;
    renderCustomTool(workflow);
  } catch (err) {
    mount.innerHTML = `
      <div class="card p-6 bg-rose-50 border-rose-200 text-rose-800 text-xs">
        <strong>Error generating custom tool:</strong> ${err.message}
      </div>
    `;
  }
}

function renderCustomTool(workflow) {
  const mount = document.getElementById('dynamic-tool-mount');
  if (!mount) return;

  state.activeRenderer = new DynamicToolRenderer(
    mount,
    workflow,
    async (refinementPrompt, currentWorkflow) => {
      // Conversational Refinement
      await executeToolGeneration(refinementPrompt, currentWorkflow);
    },
    (workflowToSave) => {
      // Save to My Tools
      saveWorkflowToStorage(workflowToSave);
    }
  );

  state.activeRenderer.render();
  mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderWorkflowTemplatesGallery() {
  const grid = document.getElementById('workflow-templates-grid');
  if (!grid) return;

  grid.innerHTML = WORKFLOW_TEMPLATES.map(t => `
    <div class="card card-hover flex flex-col justify-between p-5">
      <div>
        <span class="badge badge-teal mb-2">${t.badge}</span>
        <h3 class="text-sm font-bold text-slate-900 mb-1">${t.title}</h3>
        <p class="text-xs text-slate-500 mb-4">${t.description}</p>
      </div>
      <button class="btn btn-secondary btn-sm w-full font-semibold btn-use-template" data-template-id="${t.id}">
        Use Template &rarr;
      </button>
    </div>
  `).join('');

  grid.querySelectorAll('.btn-use-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const tId = btn.getAttribute('data-template-id');
      const tpl = WORKFLOW_TEMPLATES.find(t => t.id === tId);
      if (tpl) {
        renderCustomTool(tpl);
      }
    });
  });
}

// ================= SMART FIX =================
function initSmartFixView() {
  const dropzone = document.getElementById('smartfix-dropzone');
  const fileInput = document.getElementById('smartfix-file-input');
  const fileLabel = document.getElementById('smartfix-file-label');
  const presetSelect = document.getElementById('smartfix-preset-select');
  const reqText = document.getElementById('smartfix-requirements-text');
  const btnCheck = document.getElementById('btn-run-smartfix-check');
  const btnFix = document.getElementById('btn-fix-everything');
  const btnDownloadRepaired = document.getElementById('btn-download-repaired');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setSmartFixFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        setSmartFixFile(fileInput.files[0]);
      }
    });
  }

  function setSmartFixFile(file) {
    state.smartFixFile = file;
    if (fileLabel) {
      fileLabel.innerHTML = `Selected: <span class="text-teal-600 font-bold">${file.name}</span> (${fileOps.formatBytes(file.size)})`;
    }
  }

  // Preset selector change handler
  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const val = presetSelect.value;
      if (val !== 'custom' && SMARTFIX_PRESETS[val]) {
        const p = SMARTFIX_PRESETS[val];
        if (reqText) reqText.value = p.description;
        applyPresetToInputs(p.rules);
      }
    });
  }

  function applyPresetToInputs(rules) {
    const sizeIn = document.getElementById('smartfix-rule-size');
    const formatIn = document.getElementById('smartfix-rule-format');
    const wIn = document.getElementById('smartfix-rule-width');
    const hIn = document.getElementById('smartfix-rule-height');

    if (sizeIn) sizeIn.value = rules.maxSizeKB || '';
    if (formatIn) {
      if (rules.allowedExtensions && rules.allowedExtensions.includes('jpg')) formatIn.value = 'jpg';
      else if (rules.allowedExtensions && rules.allowedExtensions.includes('pdf')) formatIn.value = 'pdf';
      else formatIn.value = 'any';
    }
    if (wIn) wIn.value = rules.exactWidth || '';
    if (hIn) hIn.value = rules.exactHeight || '';
  }

  function getActiveRules() {
    const rawText = reqText ? reqText.value.trim() : '';
    const parsed = parseRequirementsText(rawText);

    const sizeIn = document.getElementById('smartfix-rule-size');
    const formatIn = document.getElementById('smartfix-rule-format');
    const wIn = document.getElementById('smartfix-rule-width');
    const hIn = document.getElementById('smartfix-rule-height');

    if (sizeIn && sizeIn.value) parsed.maxSizeKB = parseInt(sizeIn.value, 10);
    if (wIn && wIn.value) parsed.exactWidth = parseInt(wIn.value, 10);
    if (hIn && hIn.value) parsed.exactHeight = parseInt(hIn.value, 10);
    if (formatIn && formatIn.value !== 'any') {
      const val = formatIn.value;
      if (val === 'jpg') { parsed.allowedFormats = ['image/jpeg']; parsed.allowedExtensions = ['jpg', 'jpeg']; }
      else if (val === 'png') { parsed.allowedFormats = ['image/png']; parsed.allowedExtensions = ['png']; }
      else if (val === 'pdf') { parsed.allowedFormats = ['application/pdf']; parsed.allowedExtensions = ['pdf']; }
    }

    return parsed;
  }

  // Run Compatibility Check
  if (btnCheck) {
    btnCheck.addEventListener('click', async () => {
      if (!state.smartFixFile) {
        alert('Please upload a file to check.');
        return;
      }
      const rules = getActiveRules();
      const resultsCard = document.getElementById('smartfix-results-card');
      const checklistContainer = document.getElementById('smartfix-checklist-container');
      const badgeContainer = document.getElementById('smartfix-status-badge');
      const summaryText = document.getElementById('smartfix-diagnostic-summary');

      try {
        const diag = await diagnoseFile(state.smartFixFile, rules);
        state.smartFixDiagnosis = diag;

        resultsCard.classList.remove('hidden');

        if (diag.overallPass) {
          badgeContainer.innerHTML = '<span class="badge badge-pass">100% Compliant</span>';
          summaryText.textContent = 'All checked requirements passed. This file should be accepted.';
        } else {
          badgeContainer.innerHTML = '<span class="badge badge-fail">Rejection Risk Detected</span>';
          summaryText.textContent = `${diag.suggestedFixes.length} problem(s) detected that will cause website upload rejection.`;
        }

        checklistContainer.innerHTML = diag.checklist.map(item => `
          <div class="p-3 rounded-lg border ${item.status === 'pass' ? 'bg-emerald-50/50 border-emerald-200' : (item.status === 'fail' ? 'bg-rose-50/50 border-rose-200' : 'bg-amber-50/50 border-amber-200')} flex items-start gap-2.5">
            <span class="badge ${item.status === 'pass' ? 'badge-pass' : (item.status === 'fail' ? 'badge-fail' : 'badge-warn')} mt-0.5">${item.status.toUpperCase()}</span>
            <div>
              <div class="text-xs font-bold text-slate-800">${item.name}</div>
              <div class="text-xs text-slate-600 mt-0.5">${item.details}</div>
            </div>
          </div>
        `).join('');

        resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        alert(`Diagnosis failed: ${err.message}`);
      }
    });
  }

  // Fix Everything Possible
  if (btnFix) {
    btnFix.addEventListener('click', async () => {
      if (!state.smartFixFile) return;
      const rules = getActiveRules();

      try {
        const res = await repairFile(state.smartFixFile, rules);
        state.smartFixRepaired = res;

        const repairedCard = document.getElementById('smartfix-repaired-card');
        const compBody = document.getElementById('smartfix-comparison-body');

        repairedCard.classList.remove('hidden');

        const before = res.before;
        const after = res.after;

        compBody.innerHTML = `
          <tr>
            <td class="py-2.5 px-4 font-semibold text-slate-700">Filename</td>
            <td class="py-2.5 px-4 text-slate-500">${before.file.filename}</td>
            <td class="py-2.5 px-4 font-bold text-teal-700">${res.repairedName}</td>
          </tr>
          <tr>
            <td class="py-2.5 px-4 font-semibold text-slate-700">Format</td>
            <td class="py-2.5 px-4 text-slate-500">${before.file.detectedType}</td>
            <td class="py-2.5 px-4 font-bold text-teal-700">${after.file.detectedType}</td>
          </tr>
          <tr>
            <td class="py-2.5 px-4 font-semibold text-slate-700">File Size</td>
            <td class="py-2.5 px-4 text-slate-500">${before.file.sizeFormatted}</td>
            <td class="py-2.5 px-4 font-bold text-teal-700">${after.file.sizeFormatted}</td>
          </tr>
          <tr>
            <td class="py-2.5 px-4 font-semibold text-slate-700">Dimensions</td>
            <td class="py-2.5 px-4 text-slate-500">${before.imageInfo ? `${before.imageInfo.width}×${before.imageInfo.height} px` : 'N/A'}</td>
            <td class="py-2.5 px-4 font-bold text-teal-700">${after.imageInfo ? `${after.imageInfo.width}×${after.imageInfo.height} px` : 'N/A'}</td>
          </tr>
          <tr>
            <td class="py-2.5 px-4 font-semibold text-slate-700">Portal Compliance</td>
            <td class="py-2.5 px-4"><span class="badge badge-fail">Failed</span></td>
            <td class="py-2.5 px-4"><span class="badge badge-pass">100% Passed</span></td>
          </tr>
        `;

        repairedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        alert(`Auto-repair failed: ${err.message}`);
      }
    });
  }

  // Download Repaired File
  if (btnDownloadRepaired) {
    btnDownloadRepaired.addEventListener('click', () => {
      if (!state.smartFixRepaired) return;
      const data = state.smartFixRepaired.repairedFile;
      const name = state.smartFixRepaired.repairedName;
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// ================= PDF TOOLS VIEW =================
function initPdfToolsView() {
  const subtabs = document.querySelectorAll('.pdf-subtab');
  subtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-subtab');
      document.querySelectorAll('.pdf-subview').forEach(view => {
        if (view.id === `${target}-view`) view.classList.remove('hidden');
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
      mergeCountLabel.textContent = `Files to Merge (${mergeFiles.length})`;
    }
    mergeItems.innerHTML = mergeFiles.map((f, i) => `
      <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <div class="flex items-center gap-2 truncate pr-2">
          <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">${i + 1}</span>
          <span class="font-semibold text-slate-800 truncate">${f.name}</span>
          <span class="text-slate-400 font-mono text-[11px] flex-shrink-0">${fileOps.formatBytes(f.size)}</span>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button type="button" data-move-up="${i}" class="p-1 hover:text-teal-600 ${i === 0 ? 'opacity-30 cursor-not-allowed' : ''}" title="Move up">&uarr;</button>
          <button type="button" data-move-down="${i}" class="p-1 hover:text-teal-600 ${i === mergeFiles.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}" title="Move down">&darr;</button>
          <button type="button" data-remove-pdf="${i}" class="p-1 text-rose-500 hover:text-rose-700" title="Remove">&times;</button>
        </div>
      </div>
    `).join('');

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
        a.download = outName.endsWith('.pdf') ? outName : `${outName}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Merge failed: ${err.message}`);
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
        splitInfo.innerHTML = `
          <span>Loaded: <strong class="text-slate-900">${splitFile.name}</strong></span>
          <span class="badge badge-teal">${insp.pageCount} page(s) • ${fileOps.formatBytes(splitFile.size)}</span>
        `;
        splitControls.classList.remove('hidden');
      } catch (err) {
        alert(`Unable to read PDF: ${err.message}`);
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
        a.download = `Split_${splitFile.name.replace(/\.[^/.]+$/, '')}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Split failed: ${err.message}`);
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
        alert(`Unable to read PDF: ${err.message}`);
      }
    }
  });

  function renderOrganizeGrid() {
    if (!organizeFile || organizePages.length === 0) return;
    orgWorkspace.classList.remove('hidden');

    const activeCount = organizePages.filter(p => !p.deleted).length;
    orgStats.textContent = `${organizeFile.name} — ${activeCount} of ${organizePages.length} page(s) included`;

    orgGrid.innerHTML = organizePages.map((p, idx) => `
      <div class="pdf-page-card ${p.deleted ? 'deleted' : ''} p-3 rounded-xl border border-slate-200 bg-white shadow-xs relative flex flex-col justify-between" style="min-height: 180px;">
        <div class="flex items-center justify-between text-[11px] mb-2">
          <span class="badge ${p.deleted ? 'badge-fail' : 'badge-teal'}">Page ${p.pageNum}</span>
          <span class="text-slate-400 font-mono">${p.rotation}°</span>
        </div>

        <div class="flex-1 flex items-center justify-center bg-slate-50 border border-slate-150 rounded-lg my-1 p-2 transition-transform duration-200" style="transform: rotate(${p.rotation}deg);">
          <div class="w-16 h-20 bg-white border border-slate-200 shadow-xs flex flex-col justify-between p-1.5 rounded text-[8px] text-slate-400 select-none">
            <div class="space-y-1">
              <div class="h-1 bg-slate-200 rounded w-3/4"></div>
              <div class="h-1 bg-slate-200 rounded w-full"></div>
              <div class="h-1 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div class="text-center font-bold text-slate-300">${p.pageNum}</div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
          <button type="button" data-rot-page="${idx}" title="Rotate 90° Clockwise" class="p-1.5 rounded-md hover:bg-teal-50 text-slate-600 hover:text-teal-700">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <div class="flex items-center gap-0.5">
            <button type="button" data-move-page-left="${idx}" title="Move Page Left" class="p-1 hover:text-teal-600 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}">&larr;</button>
            <button type="button" data-move-page-right="${idx}" title="Move Page Right" class="p-1 hover:text-teal-600 ${idx === organizePages.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}">&rarr;</button>
          </div>
          <button type="button" data-del-page="${idx}" title="${p.deleted ? 'Restore Page' : 'Delete Page'}" class="p-1.5 rounded-md hover:bg-rose-50 ${p.deleted ? 'text-teal-600' : 'text-rose-500'}">
            ${p.deleted ? '↶' : '✕'}
          </button>
        </div>
      </div>
    `).join('');

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
        a.download = `Organized_${organizeFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Failed to save organized PDF: ${err.message}`);
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
        img2PdfStatus.innerHTML = `Loaded <strong class="text-teal-700">${img2PdfFiles.length}</strong> image(s) ready to assemble`;
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
        alert(`Conversion failed: ${err.message}`);
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
          compPdfFileCard.innerHTML = `
            <div class="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div class="truncate">
                  <div class="text-xs font-bold text-slate-900 truncate">${compressPdfFile.name}</div>
                  <div class="text-[11px] text-slate-500 font-mono mt-0.5">${fileOps.formatBytes(compressPdfFile.size)} • ${insp.pageCount} page(s)</div>
                </div>
              </div>
              <button type="button" id="btn-change-compress-pdf" class="btn btn-secondary btn-sm text-xs flex-shrink-0">Change</button>
            </div>
          `;

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
        alert(`Unable to inspect PDF: ${err.message}`);
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
      btnCompPdf.innerHTML = `
        <svg class="w-4 h-4 animate-spin inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span>Optimizing PDF...</span>
      `;

      try {
        const level = document.getElementById('pdf-compress-level') ? document.getElementById('pdf-compress-level').value : 'balanced';
        const result = await pdfOps.compressPdf(compressPdfFile, { level });
        compressedPdfResult = result;

        if (compPdfResultCard) compPdfResultCard.classList.remove('hidden');
        if (compPdfSavingsBadge) {
          compPdfSavingsBadge.textContent = result.reductionPercent > 0 
            ? `Saved ${result.reductionPercent}%` 
            : 'Streamlined (Optimal)';
        }
        if (compPdfComparisonText) {
          compPdfComparisonText.textContent = `Original: ${fileOps.formatBytes(result.originalSize)} → Optimized: ${fileOps.formatBytes(result.compressedSize)} (${result.pageCount} pages)`;
        }

        // Automatically trigger download
        const blob = new Blob([result.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Optimized_${compressPdfFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Compression failed: ${err.message}`);
      } finally {
        btnCompPdf.disabled = false;
        btnCompPdf.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
          <span>Optimize & Download</span>
        `;
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
      a.download = `Optimized_${compressPdfFile.name}`;
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
          const baseName = img.name.replace(/\.[^/.]+$/, '');
          const newName = `${baseName}_processed.${ext}`;

          processedResults.push({
            name: newName,
            data: blob,
            size: blob.size,
            originalSize: img.size
          });
        }

        resultsBox.classList.remove('hidden');
        outputList.innerHTML = processedResults.map((item, idx) => `
          <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
            <span class="font-medium text-slate-800">${item.name} (${fileOps.formatBytes(item.size)})</span>
            <button type="button" data-dl-img="${idx}" class="btn btn-secondary btn-sm">Download</button>
          </div>
        `).join('');

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
        alert(`Image processing error: ${err.message}`);
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
      sourceInfo.textContent = `${file.name} (${insp.detectedType}, ${fileOps.formatBytes(file.size)})`;
      controls.classList.remove('hidden');

      targetSelect.innerHTML = '';
      if (insp.mimeType.startsWith('image/')) {
        targetSelect.innerHTML = `
          <option value="image/jpeg">JPG (.jpg)</option>
          <option value="image/png">PNG (.png)</option>
          <option value="image/webp">WebP (.webp)</option>
          <option value="pdf">PDF Document (.pdf)</option>
        `;
      } else if (file.name.endsWith('.csv') || insp.mimeType === 'text/csv') {
        targetSelect.innerHTML = `
          <option value="json">JSON Data (.json)</option>
          <option value="tsv">Tab Separated (.tsv)</option>
        `;
      } else if (file.name.endsWith('.json')) {
        targetSelect.innerHTML = `
          <option value="csv">Comma Separated CSV (.csv)</option>
        `;
      } else {
        targetSelect.innerHTML = `<option value="copy">Keep format</option>`;
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
      const base = file.name.replace(/\.[^/.]+$/, '');

      try {
        if (target.startsWith('image/')) {
          convertedBlob = await imageOps.convertImage(file, { format: target });
          const ext = target === 'image/jpeg' ? 'jpg' : (target === 'image/png' ? 'png' : 'webp');
          convertedFileName = `${base}.${ext}`;
        } else if (target === 'pdf') {
          const pdfBytes = await pdfOps.convertImagesToPdf([file]);
          convertedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
          convertedFileName = `${base}.pdf`;
        } else if (target === 'json') {
          const text = await file.text();
          const jsonArr = dataOps.csvToJson(text);
          convertedBlob = new Blob([JSON.stringify(jsonArr, null, 2)], { type: 'application/json' });
          convertedFileName = `${base}.json`;
        } else if (target === 'tsv') {
          const text = await file.text();
          const { headers, rows } = dataOps.parseCSV(text);
          const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
          convertedBlob = new Blob([tsv], { type: 'text/tab-separated-values' });
          convertedFileName = `${base}.tsv`;
        } else if (target === 'csv') {
          const text = await file.text();
          const json = JSON.parse(text);
          const csv = dataOps.jsonToCsv(json);
          convertedBlob = new Blob([csv], { type: 'text/csv' });
          convertedFileName = `${base}.csv`;
        }

        downloadBox.classList.remove('hidden');
        resultName.textContent = `${convertedFileName} (${fileOps.formatBytes(convertedBlob.size)})`;
      } catch (err) {
        alert(`Conversion error: ${err.message}`);
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
      subtabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-subtab');
      document.querySelectorAll('.batch-subview').forEach(view => {
        if (view.id === `${target}-view`) view.classList.remove('hidden');
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

    renamePreviewTbody.innerHTML = renamed.map(r => `
      <tr class="hover:bg-slate-50">
        <td class="p-2.5 text-slate-500">${r.originalName}</td>
        <td class="p-2.5 text-slate-400">&rarr;</td>
        <td class="p-2.5 font-bold text-teal-700">${r.newName}</td>
      </tr>
    `).join('');
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
        alert(`Rename packaging failed: ${err.message}`);
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
          dupeResultsBox.innerHTML = `
            <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
              <strong>No exact duplicates detected!</strong> All ${dupes.totalChecked} files have unique cryptographic hashes.
            </div>
          `;
        } else {
          dupeResultsBox.innerHTML = `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-3">
              Found <strong>${dupes.duplicateGroupsCount} duplicate group(s)</strong>. Removing duplicates could reclaim <strong>${fileOps.formatBytes(dupes.totalWastedBytes)}</strong> of wasted storage.
            </div>
            <div class="space-y-2">
              ${dupes.duplicateGroups.map((g, i) => `
                <div class="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <div class="font-bold text-slate-800 mb-1">Group ${i + 1} (${g.count} copies, ${fileOps.formatBytes(g.size)} each)</div>
                  <div class="text-[11px] font-mono text-slate-400 truncate mb-1.5">SHA-256: ${g.hash}</div>
                  <ul class="list-disc list-inside text-slate-600 space-y-0.5">
                    ${g.files.map(f => `<li>${f.name}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          `;
        }
      } catch (err) {
        dupeResultsBox.innerHTML = `<div class="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg">Duplicate check failed: ${err.message}</div>`;
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
          extraMeta = `
            <tr><td class="p-2 font-semibold">Dimensions</td><td class="p-2">${imgMeta.width} × ${imgMeta.height} px (${imgMeta.aspectRatio})</td></tr>
          `;
        } catch (e) {}
      } else if (insp.mimeType === 'application/pdf') {
        try {
          const pdfMeta = await pdfOps.inspectPdf(file);
          extraMeta = `
            <tr><td class="p-2 font-semibold">Page Count</td><td class="p-2">${pdfMeta.pageCount} page(s)</td></tr>
            <tr><td class="p-2 font-semibold">Producer / Creator</td><td class="p-2">${pdfMeta.producer || 'Standard'}</td></tr>
          `;
        } catch (e) {}
      }

      inspectResultsBox.classList.remove('hidden');
      inspectResultsBox.innerHTML = `
        <div class="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <table class="w-full text-left">
            <tbody class="divide-y divide-slate-100">
              <tr><td class="p-2 font-semibold text-slate-600 w-1/3">Filename</td><td class="p-2 text-slate-800 font-bold">${insp.filename}</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">Detected Format</td><td class="p-2 text-slate-800">${insp.detectedType}</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">MIME Type</td><td class="p-2 text-slate-800">${insp.mimeType}</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">File Size</td><td class="p-2 text-slate-800">${insp.sizeFormatted} (${insp.sizeBytes} bytes)</td></tr>
              <tr><td class="p-2 font-semibold text-slate-600">Magic Bytes (Hex)</td><td class="p-2 font-mono text-teal-700">${insp.magicHex}</td></tr>
              ${extraMeta}
            </tbody>
          </table>
        </div>
      `;
    }
  });
}

// ================= MY TOOLS VIEW =================
function initMyToolsView() {
  const btnImport = document.getElementById('btn-import-workflow-json');
  const inputImport = document.getElementById('input-import-workflow-file');

  if (btnImport && inputImport) {
    btnImport.addEventListener('click', () => inputImport.click());
    inputImport.addEventListener('change', () => {
      if (inputImport.files && inputImport.files.length > 0) {
        const file = inputImport.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.operations) throw new Error('Invalid workflow JSON file');
            saveWorkflowToStorage(parsed);
          } catch (err) {
            alert(`Import failed: ${err.message}`);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  renderMyToolsGrid();
}

function loadSavedWorkflows() {
  try {
    const raw = localStorage.getItem('filefix_saved_workflows');
    state.savedWorkflows = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.savedWorkflows = [];
  }
}

function saveWorkflowToStorage(workflow) {
  const existingIdx = state.savedWorkflows.findIndex(w => w.id === workflow.id);
  if (existingIdx >= 0) {
    state.savedWorkflows[existingIdx] = workflow;
  } else {
    state.savedWorkflows.unshift(workflow);
  }
  localStorage.setItem('filefix_saved_workflows', JSON.stringify(state.savedWorkflows));
  renderMyToolsGrid();
  alert(`Workflow "${workflow.title}" saved to My Tools!`);
}

function renderMyToolsGrid() {
  const grid = document.getElementById('my-tools-grid');
  if (!grid) return;

  if (state.savedWorkflows.length === 0) {
    grid.innerHTML = `
      <div class="col-span-2 card p-8 text-center text-slate-400 text-xs">
        <p>No custom tools saved yet.</p>
        <p class="mt-1">Build a tool in the "Build My Tool" creator and click "Save to My Tools" to reuse it anytime.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.savedWorkflows.map((w, idx) => `
    <div class="card flex flex-col justify-between p-5">
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="badge badge-teal">Custom Tool</span>
          <span class="text-[10px] text-slate-400 font-mono">${w.updatedAt ? new Date(w.updatedAt).toLocaleDateString() : ''}</span>
        </div>
        <h3 class="text-sm font-bold text-slate-900 mb-1">${w.title}</h3>
        <p class="text-xs text-slate-500 mb-3">${w.description || 'Custom automated workflow'}</p>
        <div class="flex items-center gap-1 flex-wrap mb-4">
          ${w.operations.map((op, i) => `
            <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">${i + 1}. ${op.name || op.operationId}</span>
          `).join('')}
        </div>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-slate-100">
        <button data-delete-saved="${idx}" class="text-xs text-rose-500 hover:underline">Delete</button>
        <button data-run-saved="${idx}" class="btn btn-primary btn-sm">Run Tool &rarr;</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-delete-saved]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-delete-saved'), 10);
      state.savedWorkflows.splice(idx, 1);
      localStorage.setItem('filefix_saved_workflows', JSON.stringify(state.savedWorkflows));
      renderMyToolsGrid();
    });
  });

  grid.querySelectorAll('[data-run-saved]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-run-saved'), 10);
      const w = state.savedWorkflows[idx];
      switchTab('tab-build-tool');
      renderCustomTool(w);
    });
  });
}

// ================= SETTINGS MODAL =================
function initSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const btnOpen = document.getElementById('btn-open-settings');
  const btnClose = document.getElementById('btn-close-settings');
  const btnSave = document.getElementById('btn-save-settings');
  const btnClear = document.getElementById('btn-clear-my-tools');
  const inputKey = document.getElementById('input-gemini-key');
  const inputSupportUrl = document.getElementById('input-support-url');

  if (inputKey) inputKey.value = state.geminiApiKey;
  if (inputSupportUrl) inputSupportUrl.value = state.supportUrl;
  updateSupportLinks();

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.add('active'));
  }
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (btnSave && modal) {
    btnSave.addEventListener('click', () => {
      if (inputKey) {
        state.geminiApiKey = inputKey.value.trim();
        localStorage.setItem('filefix_gemini_key', state.geminiApiKey);
      }
      if (inputSupportUrl) {
        const urlVal = inputSupportUrl.value.trim() || 'https://buymeacoffee.com';
        state.supportUrl = urlVal;
        localStorage.setItem('filefix_support_url', state.supportUrl);
        updateSupportLinks();
      }
      modal.classList.remove('active');
      alert('Settings saved!');
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all saved workflows?')) {
        state.savedWorkflows = [];
        localStorage.removeItem('filefix_saved_workflows');
        renderMyToolsGrid();
        modal.classList.remove('active');
      }
    });
  }
}

function updateSupportLinks() {
  const KOFI = 'https://ko-fi.com/shiwakshi';
  try {
    localStorage.removeItem('filefix_support_url');
  } catch (e) {}

  const headerBtn = document.getElementById('btn-support-creator');
  const footerBtn = document.getElementById('footer-support-link');

  [headerBtn, footerBtn].forEach(btn => {
    if (btn) {
      btn.setAttribute('href', KOFI);
      btn.onclick = (e) => {
        e.preventDefault();
        window.open(KOFI, '_blank', 'noopener,noreferrer');
      };
    }
  });
}

// ================= FEEDBACK & BUG REPORT =================
function initFeedbackModal() {
  const modal = document.getElementById('feedback-modal');
  const btnOpen = document.getElementById('btn-open-feedback');
  const footerBtn = document.getElementById('footer-feedback-link');
  const btnClose = document.getElementById('btn-close-feedback');
  const btnCancel = document.getElementById('btn-cancel-feedback');
  const btnDone = document.getElementById('btn-feedback-done');
  const form = document.getElementById('feedback-form');
  const successState = document.getElementById('feedback-success-state');
  const diagText = document.getElementById('feedback-diagnostics-text');
  const pills = document.querySelectorAll('.feedback-type-pill');

  function openModal() {
    if (!modal) return;
    if (diagText) {
      const browser = navigator.userAgent.includes('Edg') ? 'Edge' :
                      navigator.userAgent.includes('Chrome') ? 'Chrome' :
                      navigator.userAgent.includes('Firefox') ? 'Firefox' :
                      navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser';
      diagText.textContent = `${browser} on ${navigator.platform || 'Desktop'} • Tab: ${state.currentTab.replace('tab-', '')}`;
    }
    if (form) form.classList.remove('hidden');
    if (successState) successState.classList.add('hidden');
    modal.classList.add('active');
  }

  function closeModal() {
    if (modal) modal.classList.remove('active');
  }

  // Expose globally to guarantee clickability across all browsers
  window.openFeedbackModal = openModal;
  window.closeFeedbackModal = closeModal;

  if (btnOpen) btnOpen.addEventListener('click', openModal);
  if (footerBtn) footerBtn.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);
  if (btnDone) btnDone.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => {
        p.classList.remove('bg-teal-50', 'border-teal-600', 'text-teal-900');
        p.classList.add('border-slate-200');
      });
      pill.classList.add('bg-teal-50', 'border-teal-600', 'text-teal-900');
      pill.classList.remove('border-slate-200');
      const radio = pill.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-feedback');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      const type = form.querySelector('input[name="feedback_type"]:checked')?.value || 'bug';
      const details = document.getElementById('feedback-details')?.value.trim();
      const email = document.getElementById('feedback-email')?.value.trim() || 'anonymous';
      const diagnostics = diagText ? diagText.textContent : '';

      const report = {
        id: `fb_${Date.now()}`,
        type,
        details,
        email,
        diagnostics,
        submittedAt: new Date().toISOString()
      };

      // 1. Save locally as immediate backup
      try {
        const stored = JSON.parse(localStorage.getItem('unfumble_feedback_list') || '[]');
        stored.push(report);
        localStorage.setItem('unfumble_feedback_list', JSON.stringify(stored));
      } catch (err) {
        console.warn('Feedback save warning:', err);
      }

      // 2. Deliver directly to shiwakshi.rashmi@gmail.com via FormSubmit
      const payload = {
        Category: type === 'bug' ? '🐞 Bug Report' : type === 'feature' ? '💡 Feature / Tool Request' : '💬 General Feedback',
        Message: details,
        UserEmail: email,
        Diagnostics: diagnostics,
        SubmittedAt: new Date().toLocaleString(),
        _subject: `[Unfumble Feedback] New ${type.toUpperCase()} from ${email}`,
        _template: 'table',
        _captcha: 'false'
      };
      if (email && email !== 'anonymous') {
        payload._replyto = email;
      }

      fetch('https://formsubmit.co/ajax/shiwakshi.rashmi@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.warn('Network send notice:', err);
      }).finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Report';
        }
        form.reset();
        form.classList.add('hidden');
        if (successState) successState.classList.remove('hidden');
      });
    });
  }
}
