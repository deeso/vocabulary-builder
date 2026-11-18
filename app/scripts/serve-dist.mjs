// Serves dist/ the way GitHub Pages will: under the baseUrl sub-path, with
// 404.html for unknown paths. Run after `npm run build:web`:  npm run serve:web
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const base = (JSON.parse(await readFile(join(root, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '').replace(/\/$/, '');
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/' || path === base) {
    res.writeHead(302, { Location: `${base}/` });
    return res.end();
  }
  const send = (file, status = 200) => {
    res.writeHead(status, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  };
  if (path.startsWith(`${base}/`)) {
    let file = normalize(join(dist, path.slice(base.length)));
    if (file.startsWith(dist)) {
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
        await stat(file);
        return send(file);
      } catch {}
    }
  }
  send(join(dist, '404.html'), 404);
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}${base}/`));
