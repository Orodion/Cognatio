// Provides the PostgreSQL binaries that the desktop app bundles (and the tests of the bundled server use).
//   node scripts/fetch-postgres.mjs [--zip <already downloaded zip> | --source <already downloaded source archive>] [--out <folder>]
// Windows: official binary ZIP of the PostgreSQL distribution by EDB. Only bin/, lib/, share/ and the licence are
//   kept – without pgAdmin, StackBuilder, documentation and headers (about 875 MB -> about 250 MB).
// Linux: there are no official relocatable binaries, so the official source archive is built (needs gcc, make and
//   bzip2, takes a few minutes): without ICU, OpenSSL, readline and zlib – the server only listens on 127.0.0.1, uses the
//   locale C and needs nothing but the C library, so the result runs on every distribution. The programs find libpq
//   next to them ($ORIGIN/../lib), the folder can be moved.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const VERSION = '16.15';
const WINDOWS = {
  version: `${VERSION}-1`,
  sha256: '25e6fcdfb8caec38691bf461125e7564508760666f7b8e5dc6a5f0818f58f81e',
  url: `https://get.enterprisedb.com/postgresql/postgresql-${VERSION}-1-windows-x64-binaries.zip`,
  keep: ['pgsql/bin', 'pgsql/lib', 'pgsql/share', 'pgsql/server_license.txt'],
};
const LINUX = {
  sha256: 'c1575341fa7bd40f5274ea465b34390f4dc64cdd0770af327005caaeb9f6b7ed',
  url: `https://ftp.postgresql.org/pub/source/v${VERSION}/postgresql-${VERSION}.tar.bz2`,
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const out = path.resolve(arg('--out') ?? path.join(root, 'tools', 'postgres'));

const windows = process.platform === 'win32';
if (!windows && process.platform !== 'linux') {
  console.error('PostgreSQL binaries are only provided for Windows and Linux.');
  process.exit(1);
}
if (fs.existsSync(path.join(out, 'bin', windows ? 'pg_ctl.exe' : 'pg_ctl'))) {
  console.log(`PostgreSQL is already in ${out}`);
  process.exit(0);
}

async function download(url, file) {
  console.log(`Downloading ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(file));
}

async function verify(file, sha256) {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  if (hash.digest('hex') !== sha256) {
    throw new Error(`The checksum of ${file} does not match – wrong version or damaged download.`);
  }
}

function run(file, args, options = {}) {
  const result = spawnSync(file, args, { stdio: 'inherit', ...options });
  if (result.error?.code === 'ENOENT') {
    throw new Error(`"${file}" is missing – ${file === 'tar' || file === 'bzip2' ? 'install tar and bzip2' : 'install the build tools (gcc, make)'}.`);
  }
  if (result.status !== 0) {
    throw new Error(`${file} ${args[0] ?? ''} failed`);
  }
}

async function fetchWindows(work) {
  const zip = arg('--zip') ?? path.join(work, 'postgresql.zip');
  if (!arg('--zip')) {
    await download(WINDOWS.url, zip);
  }
  await verify(zip, WINDOWS.sha256);

  // bsdtar of Windows reads ZIP files (a GNU tar from Git Bash does not)
  const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
  const extracted = path.join(work, 'x');
  fs.mkdirSync(extracted);
  console.log('Extracting ...');
  run(tar, ['-xf', zip, '-C', extracted, ...WINDOWS.keep]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.cpSync(path.join(extracted, 'pgsql'), out, { recursive: true });
  console.log(`PostgreSQL ${WINDOWS.version} is in ${out}`);
}

async function fetchLinux(work) {
  const archive = arg('--source') ?? path.join(work, 'postgresql.tar.bz2');
  if (!arg('--source')) {
    await download(LINUX.url, archive);
  }
  await verify(archive, LINUX.sha256);

  const src = path.join(work, 'src');
  // "postgres" in the prefix: otherwise the install adds a postgresql/ subfolder to share/ and lib/
  const prefix = path.join(work, 'postgres');
  fs.mkdirSync(src);
  console.log('Extracting ...');
  run('tar', ['-xjf', archive, '-C', src, '--strip-components=1']);
  console.log('Configuring ...');
  run('./configure', [`--prefix=${prefix}`, '--without-icu', '--without-readline', '--without-zlib', '--without-openssl', '--disable-nls', '--disable-rpath'], {
    cwd: src,
  });
  // $ORIGIN reaches the linker unexpanded: $$ for make, single quotes for the shell of the recipe
  // (LDFLAGS_EX/LDFLAGS_SL are the variables meant for this; LDFLAGS itself would drop the -L options of the build)
  const rpath = ["LDFLAGS_EX=-Wl,-rpath,'$$ORIGIN/../lib'", "LDFLAGS_SL=-Wl,-rpath,'$$ORIGIN'"];
  console.log('Building (a few minutes) ...');
  run('make', ['-s', `-j${os.availableParallelism()}`, ...rpath], { cwd: src });
  run('make', ['-s', 'install', ...rpath], { cwd: src });

  fs.mkdirSync(out, { recursive: true });
  for (const dir of ['bin', 'lib', 'share']) {
    // Symlinks (libpq.so.5 -> libpq.so.5.16) become real files: fs.cpSync, which stage.mjs uses later, would turn
    // them into absolute links into this folder
    run('cp', ['-RL', '--preserve=mode,timestamps', path.join(prefix, dir), path.join(out, dir)]);
  }
  fs.copyFileSync(path.join(src, 'COPYRIGHT'), path.join(out, 'server_license.txt'));
  console.log(`PostgreSQL ${VERSION} is in ${out}`);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-pg-'));
try {
  await (windows ? fetchWindows(work) : fetchLinux(work));
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
