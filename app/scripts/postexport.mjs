// Turns `expo export -p web` output (dist/) into an installable, offline PWA
// ready for GitHub Pages:
//   • writes manifest.webmanifest and injects manifest/iOS meta tags
//   • generates sw.js that precaches every exported file (works offline)
//   • copies index.html → 404.html so deep links resolve on GitHub Pages
//   • writes .nojekyll so the _expo/ folder is served
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const appJson = JSON.parse(await readFile(join(root, 'app.json'), 'utf8')).expo;
const BASE = (appJson.experiments?.baseUrl ?? '').replace(/\/$/, '') + '/';
const web = appJson.web ?? {};

// ---- manifest ---------------------------------------------------------------
const manifest = {
  name: web.name ?? appJson.name,
  short_name: web.shortName ?? appJson.name,
  description: 'Learn words across English, Spanish, French, German and Italian — with etymology, fun facts and spaced repetition.',
  id: BASE,
  start_url: BASE,
  scope: BASE,
  display: 'standalone',
  orientation: 'portrait',
  background_color: web.backgroundColor ?? '#ffffff',
  theme_color: web.themeColor ?? '#000000',
  icons: [
    { src: `${BASE}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${BASE}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
    { src: `${BASE}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
await writeFile(join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// ---- index.html ---------------------------------------------------------------
const indexPath = join(dist, 'index.html');
let html = await readFile(indexPath, 'utf8');
if (html.includes('rel="manifest"')) {
  console.error('dist/index.html is already post-processed. Re-run the full `npm run build:web`.');
  process.exit(1);
}

const head = [
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`,
  `<meta name="theme-color" content="${manifest.theme_color}" />`,
  `<meta name="description" content="${manifest.description}" />`,
  `<link rel="manifest" href="${BASE}manifest.webmanifest" />`,
  `<link rel="apple-touch-icon" href="${BASE}icons/apple-touch-icon.png" />`,
  `<meta name="mobile-web-app-capable" content="yes" />`,
  `<meta name="apple-mobile-web-app-capable" content="yes" />`,
  `<meta name="apple-mobile-web-app-title" content="${manifest.short_name}" />`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`,
  `<meta name="color-scheme" content="light dark" />`,
  // Apply a saved Light/Dark choice before first paint (key must match THEME_KEY in src/state/theme.tsx).
  `<script>try{var t=localStorage.getItem('vocab-builder/theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}}catch(e){}</script>`,
].join('\n    ');

html = html
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<meta name="theme-color"[^>]*>/i, '')
  .replace(/<title>[^<]*<\/title>/i, `<title>${manifest.name}</title>`)
  .replace('</head>', `    ${head}\n  </head>`);

// Registers the worker; when an *updated* worker takes over an open page, reload once so
// the page never asks for route chunks from a deleted old build. Progress is saved per card.
const register = `<script>
  if ('serviceWorker' in navigator) {
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hadController && !reloading) { reloading = true; location.reload(); }
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('${BASE}sw.js', { scope: '${BASE}' }).then(function (reg) {
        // Installed PWAs can stay open for days: look for a new version when brought back.
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });
      }).catch(function (e) {
        console.warn('Service worker registration failed', e);
      });
    });
  }
</script>`;
html = html.replace('</body>', `${register}\n</body>`);
await writeFile(indexPath, html);
await writeFile(join(dist, '404.html'), html);
await writeFile(join(dist, '.nojekyll'), '');

// ---- service worker -------------------------------------------------------------
async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const SKIP = new Set(['sw.js', '404.html', '.nojekyll', 'metadata.json']);
const files = (await walk(dist))
  .map((p) => relative(dist, p).split(sep).join('/'))
  .filter((f) => !SKIP.has(f) && !f.endsWith('.map'))
  .sort();

// Normalise with the WHATWG URL parser so entries match what the browser requests
// (e.g. route chunks like "[id]-abc.js" keep their literal brackets).
const toUrlPath = (f) => new URL(BASE + f, 'http://x').pathname;
const precache = [BASE, ...files.filter((f) => f !== 'index.html').map(toUrlPath)];

// Cache version: changes whenever any shipped file, the precache list, or this script changes.
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(await readFile(join(dist, f)));
hash.update(JSON.stringify(precache)).update(await readFile(fileURLToPath(import.meta.url)));
const version = hash.digest('hex').slice(0, 12);

const sw = `// Generated by scripts/postexport.mjs — do not edit.
const CACHE = 'vocab-${version}';
const BASE = '${BASE}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('vocab-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  // Pages: network first so updates arrive promptly; the cached shell is only for offline.
  // GitHub Pages answers deep links with 404.html — that *is* the fresh app shell, so a
  // 404 response is used as-is rather than swapped for a possibly stale cached copy.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(BASE)));
    return;
  }

  // Everything else is content-hashed or static: cache first, then network (and remember it).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
`;
await writeFile(join(dist, 'sw.js'), sw);

const bytes = (await Promise.all(files.map((f) => stat(join(dist, f))))).reduce((n, s) => n + s.size, 0);
console.log(`PWA ready: ${files.length} files precached (${(bytes / 1024).toFixed(0)} KB), cache ${version}, base ${BASE}`);
