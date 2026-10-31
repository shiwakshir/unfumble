const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function createSvg(size) {
  const radius = Math.round(size * 0.22);
  const iconPad = Math.round(size * 0.25);
  const iconSize = size - (iconPad * 2);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#14b8a6"/>
        <stop offset="100%" stop-color="#0f766e"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)"/>
    <g transform="translate(${iconPad}, ${iconPad}) scale(${iconSize / 24})" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
    </g>
  </svg>`;
}

async function generate() {
  const svg512 = Buffer.from(createSvg(512));
  await sharp(svg512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  
  const svg192 = Buffer.from(createSvg(192));
  await sharp(svg192).png().toFile(path.join(iconsDir, 'icon-192.png'));

  const svg32 = Buffer.from(createSvg(32));
  await sharp(svg32).png().toFile(path.join(publicDir, 'favicon.png'));

  console.log('Generated icon-512.png, icon-192.png, and favicon.png successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
