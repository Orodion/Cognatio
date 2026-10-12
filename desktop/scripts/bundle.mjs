// Bundles the shell into dist/main.js and dist/preload.js. The packaged app contains only these two files: with
// npm workspaces electron-builder does not find the dependencies (electron-updater) to put into the archive.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [path.join(desktop, 'src', 'main.ts'), path.join(desktop, 'src', 'preload.ts')],
  outdir: path.join(desktop, 'dist'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  // Provided by Electron itself
  external: ['electron'],
  logLevel: 'info',
});
