const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Remove v1.0 Pro badge
html = html.replace(
  `<div class="flex items-center gap-2">
            <span class="text-lg font-bold text-slate-900 tracking-tight">Unfumble</span>
            <span class="badge badge-teal">v1.0 Pro</span>
          </div>
          <p class="text-[11px] text-slate-500 hidden sm:block">Your files. Your tools. Your way.</p>`,
  `<div class="flex items-center gap-2">
            <span class="text-lg font-bold text-slate-900 tracking-tight">Unfumble</span>
          </div>
          <p class="text-[11px] text-slate-400 hidden sm:block">File tools & custom workflows</p>`
);

// 2. Refine Privacy Badge in Header
html = html.replace(
  `<!-- Privacy Status Badge -->
        <div class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60" title="100% of file processing executes locally in your browser. Files never leave your computer.">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          Client-Side Privacy
        </div>`,
  `<!-- Privacy Status Badge -->
        <div class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 bg-slate-100/80 border border-slate-200/60" title="All file operations execute locally on your device.">
          <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          Runs locally
        </div>`
);

// 3. Remove hero vibrating pill badge
html = html.replace(
  `<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/60 mb-4">
            <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            AI-Powered File Toolkit & Custom Tool Creator
          </div>`,
  ''
);

// 4. Hero text refinement
html = html.replace(
  `What do you need to do with your file?`,
  `What do you need to do with your files?`
);

html = html.replace(
  `Describe what you need in plain English, and Unfumble will build a custom working tool. Or pick from ready-made PDF, image, and conversion utilities.`,
  `Convert, compress, resize, merge, or describe a multi-step workflow in plain English.`
);

// 5. Clean 3 Homepage Cards (remove numbers, colored top borders, and cheesy badges)
html = html.replace(
  `<div class="card card-hover cursor-pointer relative overflow-hidden flex flex-col justify-between" id="card-action-build" style="border-top: 3px solid #0d9488;">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-xs">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <span class="badge badge-teal">Flagship</span>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-1">1. Build My Tool</h3>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">Describe any multi-step file operation in ordinary language. AI constructs a custom working application for you in seconds.</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
              <span>Open Custom Creator</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </div>`,
  `<div class="card card-hover cursor-pointer relative overflow-hidden flex flex-col justify-between p-6" id="card-action-build">
            <div>
              <div class="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-1.5">Custom Tool Builder</h3>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">Describe any multi-step file task in ordinary language. Generated into an interactive, reusable tool.</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
              <span>Build custom tool</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </div>`
);

html = html.replace(
  `<div class="card card-hover cursor-pointer relative overflow-hidden flex flex-col justify-between" id="card-action-smartfix" style="border-top: 3px solid #6366f1;">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <span class="badge badge-slate" style="background-color: #eef2ff; color: #4f46e5; border-color: #c7d2fe;">Assistant</span>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-1">2. Fix My File</h3>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">Website rejected your upload? Paste the requirements or error message to diagnose and repair it in 1 click.</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Diagnose & Repair</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </div>`,
  `<div class="card card-hover cursor-pointer relative overflow-hidden flex flex-col justify-between p-6" id="card-action-smartfix">
            <div>
              <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-1.5">Smart Fix</h3>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">Diagnose rejection errors from portals and automatically repair format, dimension, or size issues.</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Diagnose upload</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </div>`
);

html = html.replace(
  `<div class="card card-hover cursor-pointer relative overflow-hidden flex flex-col justify-between" id="card-action-browse" style="border-top: 3px solid #334155;">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-xs">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                </div>
                <span class="badge badge-slate">Utilities</span>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-1">3. Browse All Tools</h3>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">Direct access to PDF merging, page reordering, image resizing, batch conversion, and deduplication.</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Explore Suite</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </div>`,
  `<div class="card card-hover cursor-pointer relative overflow-hidden flex flex-col justify-between p-6" id="card-action-browse">
            <div>
              <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mb-4">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
              </div>
              <h3 class="text-base font-bold text-slate-900 mb-1.5">Tool Catalog</h3>
              <p class="text-xs text-slate-500 mb-4 leading-relaxed">Direct access to individual utilities for PDFs, images, data conversions, and bulk operations.</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Browse tools</span>
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </div>`
);

// 6. Build My Tool section header
html = html.replace(
  `<span class="badge badge-teal mb-2">Flagship Feature</span>
          <h1 class="text-3xl font-bold text-slate-900">Build My Tool</h1>
          <p class="text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Describe the file processing task you want to solve in plain English. Unfumble interprets the workflow, verifies operation safety, and generates a working interactive tool for you.
          </p>`,
  `<h1 class="text-3xl font-bold text-slate-900">Custom Tool Builder</h1>
          <p class="text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Describe your file workflow in plain English. Unfumble generates a working interface with live controls, progress tracking, and batch download.
          </p>`
);

html = html.replace(
  `Ready-Made Workflow Templates`,
  `Workflow Presets`
);

// 7. Smart Fix section header & step badges
html = html.replace(
  `<span class="badge badge-slate mb-2">Diagnostic & Repair</span>
          <h1 class="text-3xl font-bold text-slate-900">File rejected? Let's find out why.</h1>
          <p class="text-sm text-slate-500 mt-1">
            Upload the rejected file and tell us what the website requires. We'll diagnose the exact failure reason and automatically repair it.
          </p>`,
  `<h1 class="text-3xl font-bold text-slate-900">Smart Fix</h1>
          <p class="text-sm text-slate-500 mt-1">
            Diagnose rejection errors from portals and automatically resize, reformat, and compress files to match.
          </p>`
);

html = html.replace(
  `<h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
              Upload the Rejected File
            </h3>`,
  `<h3 class="text-sm font-bold text-slate-900 mb-3">Upload File to Inspect</h3>`
);

html = html.replace(
  `<h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">2</span>
              Specify Website Requirements
            </h3>`,
  `<h3 class="text-sm font-bold text-slate-900 mb-3">Target Requirements</h3>`
);

// 8. PDF Tools section headers & remove redundant badges
html = html.replace(
  `<p class="text-xs text-slate-500">Pure client-side PDF manipulation powered by PDF-Lib</p>`,
  `<p class="text-xs text-slate-500">Merge, split, organize, and compress PDF documents</p>`
);

// Strip redundant <span class="badge badge-teal">Client-Side</span>
html = html.replaceAll(`<span class="badge badge-teal">Client-Side</span>\n              </div>`, `</div>`);
html = html.replaceAll(`<span class="badge badge-teal">Client-Side</span>\r\n              </div>`, `</div>`);
html = html.replaceAll(`<span class="badge badge-emerald">Privacy Guaranteed</span>\n              </div>`, `</div>`);
html = html.replaceAll(`<span class="badge badge-emerald">Privacy Guaranteed</span>\r\n              </div>`, `</div>`);

// 9. Image Tools subtitle
html = html.replace(
  `<p class="text-xs text-slate-500">Hardware-accelerated client-side image processing</p>`,
  `<p class="text-xs text-slate-500">Resize, crop, convert, and compress images</p>`
);

// 10. Universal File Converter subtitle
html = html.replace(
  `<p class="text-xs text-slate-500">Convert between image formats, CSV, TSV, and JSON tabular data</p>`,
  `<p class="text-xs text-slate-500">Convert images, spreadsheets, and tabular datasets</p>`
);

// 11. Batch Utilities subtitle
html = html.replace(
  `<p class="text-xs text-slate-500">Bulk rename files, find exact SHA-256 duplicates, and inspect magic bytes</p>`,
  `<p class="text-xs text-slate-500">Batch rename, deduplicate, and inspect files</p>`
);

// 12. Footer refinement
html = html.replace(
  `<div class="flex items-center gap-6 flex-wrap">
        <span class="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          100% Client-Side Privacy
        </span>
        <span class="text-slate-400">Zero Document Uploads</span>
        <span class="text-slate-400">Production Ready</span>
      </div>`,
  `<div class="flex items-center gap-4 text-xs text-slate-400">
        <span>Processed locally in browser</span>
        <span>&bull;</span>
        <span>Zero server uploads</span>
        <span>&bull;</span>
        <span>Private by default</span>
      </div>`
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Successfully refined public/index.html!');
