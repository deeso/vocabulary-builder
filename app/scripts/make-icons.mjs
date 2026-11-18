// Renders the app icon set from inline SVG. Run: npm run icons
// Writes native icons to assets/images and PWA icons to public/icons.
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDIGO = '#3346C8';
const INDIGO_DEEP = '#22309A';
const AMBER = '#F2B33D';

// The glyph: a serif "Aa" with an amber accent dot, centred in a 1024 box.
// `scale` shrinks it toward the centre for maskable / adaptive safe zones.
const glyph = (fill, scale = 1, accent = AMBER) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <text x="512" y="660" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
      font-size="470" font-weight="700" fill="${fill}" letter-spacing="-12">Aa</text>
    <circle cx="742" cy="300" r="46" fill="${accent}"/>
  </g>`;

const bg = (rounded) => `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INDIGO}"/><stop offset="1" stop-color="${INDIGO_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="${rounded ? 224 : 0}" fill="url(#g)"/>`;

const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`);

const full = svg(bg(false) + glyph('#FFFFFF'));
const rounded = svg(bg(true) + glyph('#FFFFFF'));
const maskable = svg(bg(false) + glyph('#FFFFFF', 0.72));
const fgOnly = svg(glyph('#FFFFFF', 0.62));
const mono = svg(glyph('#FFFFFF', 0.62, '#FFFFFF'));
const solid = svg(`<rect width="1024" height="1024" fill="${INDIGO}"/>`);
const splash = svg(glyph('#FFFFFF', 0.9));

const jobs = [
  ['assets/images/icon.png', full, 1024],
  ['assets/images/android-icon-foreground.png', fgOnly, 1024],
  ['assets/images/android-icon-background.png', solid, 1024],
  ['assets/images/android-icon-monochrome.png', mono, 1024],
  ['assets/images/splash-icon.png', splash, 512],
  ['assets/images/favicon.png', rounded, 64],
  ['public/icons/icon-192.png', rounded, 192],
  ['public/icons/icon-512.png', rounded, 512],
  ['public/icons/maskable-512.png', maskable, 512],
  ['public/icons/apple-touch-icon.png', full, 180],
];

for (const [out, src, size] of jobs) {
  const dest = join(root, out);
  await mkdir(dirname(dest), { recursive: true });
  await sharp(src).resize(size, size).png().toFile(dest);
  console.log('wrote', out, `${size}px`);
}
