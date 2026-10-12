// Portable variant: the unpacked app plus a file called `portable` – then the app keeps all its data in `data/`
// next to the program (USB stick) and does not update itself.
//   node desktop/scripts/portable.mjs [--out <folder>]   (after `electron-builder`, uses release/win-unpacked)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outIndex = process.argv.indexOf('--out');
const outDir = path.resolve(outIndex >= 0 ? process.argv[outIndex + 1] : path.join(desktop, 'release'));
const unpacked = path.join(outDir, 'win-unpacked');
if (!fs.existsSync(path.join(unpacked, 'Cognatio.exe'))) {
  console.error(`${unpacked} is missing – run electron-builder first`);
  process.exit(1);
}

const { version } = JSON.parse(fs.readFileSync(path.join(desktop, 'package.json'), 'utf8'));
const name = `Cognatio-${version}-portable`;
// The folder inside the ZIP is called Cognatio. Instead of copying the unpacked app (several hundred MB) it is renamed for
// the time of zipping and renamed back afterwards.
const folder = path.join(outDir, 'Cognatio');
if (fs.existsSync(folder)) {
  console.error(`${folder} is in the way – remove it first`);
  process.exit(1);
}
const marker = path.join(folder, 'portable');
fs.renameSync(unpacked, folder);
try {
  fs.writeFileSync(marker, 'Cognatio keeps its data in the folder "data" next to this file.\n');
  const zip = path.join(outDir, `${name}.zip`);
  fs.rmSync(zip, { force: true });
  // bsdtar of Windows writes ZIP files (the extension decides with -a)
  const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
  const result = spawnSync(tar, ['-a', '-c', '-f', zip, '-C', outDir, 'Cognatio'], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Creating the ZIP failed');
  }
  console.log(`${zip} (${Math.round(fs.statSync(zip).size / 1024 / 1024)} MB)`);
} finally {
  fs.rmSync(marker, { force: true });
  fs.renameSync(folder, unpacked);
}
