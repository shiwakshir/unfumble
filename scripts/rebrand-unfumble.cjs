const fs = require('fs');
const path = require('path');

const KOFI_URL = 'https://ko-fi.com/shiwakshi';

// 1. UPDATE index.html
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Title & Meta
html = html.replace(/<title>.*?<\/title>/, '<title>Unfumble — Your files. Your tools. Unfumbled.</title>');
html = html.replace(/content="Unfumble - Your files\. Your tools\. Your way\./, 'content="Unfumble - Your files. Your tools. Unfumbled.');

// Brand in header
html = html.replace(
  /<span class="text-lg font-bold text-slate-900 tracking-tight">Unfumble<\/span>/g,
  '<span class="text-lg font-bold text-slate-900 tracking-tight">Unfumble</span>'
);

// Ko-fi button in header
html = html.replace(
  /id="btn-support-creator" href="[^"]*"/g,
  `id="btn-support-creator" href="${KOFI_URL}"`
);

// Ko-fi link in footer
html = html.replace(
  /id="footer-support-link" href="[^"]*"/g,
  `id="footer-support-link" href="${KOFI_URL}"`
);

// Footer Brand
html = html.replace(
  /<span class="font-bold text-slate-800 tracking-tight">Unfumble<\/span>/g,
  '<span class="font-bold text-slate-800 tracking-tight">Unfumble</span>'
);
html = html.replace(
  /<span>Your files\. Your tools\. Your way\.<\/span>/g,
  '<span>Your files. Your tools. Unfumbled.</span>'
);

// Prose references in index.html
html = html.replace(/Unfumble will inspect the format/g, 'Unfumble will inspect the format');
html = html.replace(/Unfumble generates a working interface/g, 'Unfumble generates a working interface');
html = html.replace(/Unfumble will convert, resize/g, 'Unfumble will convert, resize');
html = html.replace(/Install Unfumble/g, 'Install Unfumble');
html = html.replace(/About Unfumble/g, 'About Unfumble');
html = html.replace(/Unfumble works 100% offline/g, 'Unfumble works 100% offline');
html = html.replace(/Keeps Unfumble completely free/g, 'Keeps Unfumble completely free');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Successfully rebranded public/index.html to Unfumble');

// 2. UPDATE app.js
const appPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appPath, 'utf8');

// Ensure supportUrl is locked to Ko-fi
appJs = appJs.replace(/supportUrl:.*?,/g, `supportUrl: '${KOFI_URL}',`);

// Update updateSupportLinks function to be bulletproof
const oldUpdateSupport = /function updateSupportLinks\(\) \{[\s\S]*?\}/;
const newUpdateSupport = `function updateSupportLinks() {
  const KOFI = '${KOFI_URL}';
  try {
    localStorage.removeItem('Unfumble_support_url');
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
}`;
appJs = appJs.replace(oldUpdateSupport, newUpdateSupport);

fs.writeFileSync(appPath, appJs, 'utf8');
console.log('Successfully updated public/js/app.js with bulletproof Ko-fi handler');

// 3. UPDATE manifest.webmanifest
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.webmanifest');
let manifest = fs.readFileSync(manifestPath, 'utf8');
manifest = manifest.replace(/"name": "Unfumble — Your files\. Your tools\. Your way\."/, '"name": "Unfumble — Your files. Your tools. Unfumbled."');
manifest = manifest.replace(/"short_name": "Unfumble"/, '"short_name": "Unfumble"');
fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('Successfully updated manifest.webmanifest to Unfumble');

// 4. UPDATE sw.js (Bump cache to v3)
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = 'Unfumble-cache-v\d+';/g, "const CACHE_NAME = 'unfumble-cache-v3';");
fs.writeFileSync(swPath, sw, 'utf8');
console.log('Successfully bumped cache in sw.js to unfumble-cache-v3');
