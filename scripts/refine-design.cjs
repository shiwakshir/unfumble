const fs = require('fs');
const path = require('path');

// 1. UPDATE styles.css
const cssPath = path.join(__dirname, '..', 'public', 'css', 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace neon shadow utilities
css = css.replace(/\.shadow-teal-600\\\/20 \{[^}]+\}/g, '.shadow-teal-600\\/20 { box-shadow: var(--shadow-xs); }');
css = css.replace(/\.shadow-teal-600\\\/30 \{[^}]+\}/g, '.shadow-teal-600\\/30 { box-shadow: var(--shadow-sm); }');

// Clean .btn-primary
const oldBtnPrimary = /\.btn-primary \{[\s\S]*?\.btn-primary:active:not\(:disabled\) \{[\s\S]*?\}/;
const newBtnPrimary = `.btn-primary {
  background-color: var(--primary);
  color: #ffffff;
  box-shadow: var(--shadow-xs);
  border: 1px solid rgba(15, 118, 110, 0.3);
}
.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  box-shadow: var(--shadow-sm);
}
.btn-primary:active:not(:disabled) {
  background-color: #115e59;
}`;
css = css.replace(oldBtnPrimary, newBtnPrimary);

// Clean .btn-secondary hover transform
css = css.replace(/\.btn-secondary:hover:not\(:disabled\) \{[\s\S]*?\}/, `.btn-secondary:hover:not(:disabled) {
  background-color: var(--slate-50);
  border-color: var(--slate-300);
  color: var(--slate-900);
}`);

// Clean .btn-dark hover transform
css = css.replace(/\.btn-dark:hover:not\(:disabled\) \{[\s\S]*?\}/, `.btn-dark:hover:not(:disabled) {
  background-color: var(--slate-800);
}`);

// Clean .card-hover transform
css = css.replace(/\.card-hover:hover \{[\s\S]*?\}/, `.card-hover:hover {
  box-shadow: var(--shadow-md);
  border-color: #cbd5e1;
}`);

// Clean .dropzone hover transform
css = css.replace(/\.dropzone:hover, \.dropzone\.drag-active \{[\s\S]*?\}/, `.dropzone:hover, .dropzone.drag-active {
  border-color: var(--primary);
  background-color: var(--primary-light);
}`);

// Add Segmented Subtab Bar styling if not present
if (!css.includes('.subtab-bar')) {
  css += `\n
/* Segmented Control Subtab Bar */
.subtab-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--slate-150);
  padding: 0.25rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--slate-200);
}
.subtab-item {
  padding: 0.4rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  color: var(--slate-600);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.subtab-item:hover:not(.active) {
  color: var(--slate-900);
  background-color: rgba(255, 255, 255, 0.6);
}
.subtab-item.active {
  color: var(--slate-900);
  background-color: #ffffff;
  font-weight: 600;
  box-shadow: var(--shadow-xs);
  border-color: rgba(226, 232, 240, 0.9);
}
`;
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully refined public/css/styles.css');

// 2. UPDATE dynamic-tool.js
const dtPath = path.join(__dirname, '..', 'public', 'js', 'ui', 'dynamic-tool.js');
let dt = fs.readFileSync(dtPath, 'utf8');

dt = dt.replace(/<span class="inline-flex items-center px-2\.5 py-0\.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200\/50">\s*AI Custom Tool\s*<\/span>\s*<span class="text-xs text-slate-400 font-mono">ID: \$\{escapeHtml\(this\.workflow\.id \|\| 'custom'\)\}<\/span>/g,
  `<span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">Custom Workflow</span>`);

dt = dt.replace(/shadow-md shadow-teal-600\/20/g, 'shadow-xs');

fs.writeFileSync(dtPath, dt, 'utf8');
console.log('Successfully refined public/js/ui/dynamic-tool.js');

// 3. UPDATE index.html for Segmented Subtabs
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// PDF Subtabs
html = html.replace(/<!-- PDF Tool Sub-nav -->[\s\S]*?<\/div>\s*<\/div>/,
`<!-- PDF Tool Sub-nav -->
          <div class="mb-6 overflow-x-auto pb-1">
            <div class="subtab-bar">
              <button class="pdf-subtab subtab-item active" data-subtab="pdf-merge">Merge PDFs</button>
              <button class="pdf-subtab subtab-item" data-subtab="pdf-split">Split PDF</button>
              <button class="pdf-subtab subtab-item" data-subtab="pdf-organize">Organize & Rotate</button>
              <button class="pdf-subtab subtab-item" data-subtab="pdf-img-to-pdf">Images to PDF</button>
              <button class="pdf-subtab subtab-item" data-subtab="pdf-compress">Compress PDF</button>
            </div>
          </div>`);

// Batch Subtabs
html = html.replace(/<!-- Utility Subtabs -->[\s\S]*?<\/div>/,
`<!-- Utility Subtabs -->
          <div class="mb-6 overflow-x-auto pb-1">
            <div class="subtab-bar">
              <button class="batch-subtab subtab-item active" data-subtab="batch-rename">Filename Fixer</button>
              <button class="batch-subtab subtab-item" data-subtab="batch-duplicates">Duplicate Finder</button>
              <button class="batch-subtab subtab-item" data-subtab="batch-inspector">File Inspector</button>
            </div>
          </div>`);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Successfully refined public/index.html');

// 4. UPDATE app.js subtab event handlers
const appJsPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Replace pdf subtabs click logic
appJs = appJs.replace(
  /const subtabs = document\.querySelectorAll\('\.pdf-subtab'\);\s*subtabs\.forEach\(tab => \{\s*tab\.addEventListener\('click', \(\) => \{\s*subtabs\.forEach\(t => \{\s*t\.classList\.remove\('btn-primary'\);\s*t\.classList\.add\('btn-secondary'\);\s*\}\);\s*tab\.classList\.add\('btn-primary'\);\s*tab\.classList\.remove\('btn-secondary'\);/,
  `const subtabs = document.querySelectorAll('.pdf-subtab');
  subtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');`
);

// Replace batch subtabs click logic
appJs = appJs.replace(
  /const subtabs = document\.querySelectorAll\('\.batch-subtab'\);\s*subtabs\.forEach\(tab => \{\s*tab\.addEventListener\('click', \(\) => \{\s*subtabs\.forEach\(t => \{\s*t\.classList\.remove\('btn-primary'\);\s*t\.classList\.add\('btn-secondary'\);\s*\}\);\s*tab\.classList\.add\('btn-primary'\);\s*tab\.classList\.remove\('btn-secondary'\);/,
  `const subtabs = document.querySelectorAll('.batch-subtab');
  subtabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subtabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');`
);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Successfully refined public/js/app.js');
