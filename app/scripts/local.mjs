// Build and run Vocabulary Builder as a locally hosted web app.
//
//   npm run local               build (if needed) and serve at http://localhost:4173/
//   npm run local -- --lan      also share on your Wi-Fi/LAN (phones, tablets, other PCs)
//   npm run local -- --rebuild  force a fresh build
//   npm run local -- --port 8080
//
// The local build lives in dist-local/ and is served from the site root, separately
// from the GitHub Pages build in dist/ (which uses the /vocabulary-builder sub-path).
import { spawnSync, spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'dist-local';
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const portArg = args.indexOf('--port');
const port = portArg >= 0 ? args[portArg + 1] : (process.env.PORT ?? '4173');

const env = { ...process.env, EXPO_BASE_URL: '', DIST_DIR: OUT, CI: '1' };

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Rebuild when there's no build yet, or any source/content file is newer than it. */
async function needsBuild() {
  let built;
  try {
    built = (await stat(join(root, OUT, 'sw.js'))).mtimeMs;
  } catch {
    return true;
  }
  const watch = ['src', 'public', 'assets', 'app.json', 'app.config.js', 'package.json', 'scripts/postexport.mjs'];
  async function newest(p) {
    const s = await stat(join(root, p));
    if (!s.isDirectory()) return s.mtimeMs;
    let m = s.mtimeMs;
    for (const name of await readdir(join(root, p))) m = Math.max(m, await newest(join(p, name)));
    return m;
  }
  for (const p of watch) {
    try {
      if ((await newest(p)) > built) return true;
    } catch {}
  }
  return false;
}

if (has('--rebuild') || (await needsBuild())) {
  console.log('Building the local web app…');
  run('node', ['scripts/check-content.mjs']);
  run('npx', ['expo', 'export', '-p', 'web', '--output-dir', OUT, '--clear']);
  run('node', ['scripts/postexport.mjs']);
} else {
  console.log('Local build is up to date (use --rebuild to force).');
}

const server = spawn('node', ['scripts/serve-dist.mjs'], {
  cwd: root,
  env: { ...env, PORT: String(port), HOST: has('--lan') ? '0.0.0.0' : '127.0.0.1' },
  stdio: 'inherit',
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));
server.on('exit', (code) => process.exit(code ?? 0));
