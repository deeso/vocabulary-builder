// Tiny static server for an exported build. Mirrors GitHub Pages: files are served
// under the base path, and unknown paths get 404.html (the app shell) so deep links work.
//
//   npm run serve:web                       → dist/ at http://localhost:4173/vocabulary-builder/
//   (used by npm run local)                 → dist-local/ at http://localhost:4173/
//
// Env: DIST_DIR (default "dist"), EXPO_BASE_URL (default: app.json experiments.baseUrl),
//      HOST (default 127.0.0.1; 0.0.0.0 to share on your network), PORT (default 4173).
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, process.env.DIST_DIR ?? 'dist');
const configured = JSON.parse(await readFile(join(root, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const base = (process.env.EXPO_BASE_URL ?? configured).replace(/\/$/, '');
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 4173);

try {
  await stat(join(dist, 'index.html'));
} catch {
  console.error(`No build found in ${dist}. Build it first (npm run build:web or npm run local).`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, file, status = 200) {
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(file).pipe(res);
}

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  if (base && (path === '/' || path === base)) {
    res.writeHead(302, { Location: `${base}/` });
    return res.end();
  }
  if (path.startsWith(`${base}/`)) {
    let file = normalize(join(dist, path.slice(base.length)));
    // Never serve anything outside the build folder.
    if (file === dist || file.startsWith(dist + sep)) {
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
        await stat(file);
        return send(res, file);
      } catch {}
    }
  }
  send(res, join(dist, '404.html'), 404);
}).listen(port, host, () => {
  const label = dist.slice(root.length + 1);
  console.log(`\nVocabulary Builder (${label}) is running:\n`);
  console.log(`  This computer:  http://localhost:${port}${base}/`);
  if (host === '0.0.0.0') {
    for (const addrs of Object.values(networkInterfaces())) {
      for (const a of addrs ?? []) {
        if (a.family === 'IPv4' && !a.internal) console.log(`  On your network: http://${a.address}:${port}${base}/`);
      }
    }
    console.log('\n  (Offline mode and "Install app" need https or localhost, so they only work on this computer.)');
  }
  console.log('\nPress Ctrl+C to stop.\n');
});
