// Removes what the app never uses from a copy of the bundled PostgreSQL (the installer gets smaller; Windows and Linux):
//   bin/    every program except postgres, initdb, pg_ctl, pg_dump and pg_restore, and every DLL that none of them loads
//           (Stack Builder with wxWidgets, psql, ecpg, pgbench, ...)
//   lib/    import libraries (*.lib), the contrib modules and the embedded-SQL libraries; the encoding conversions and
//           the modules initdb needs (plpgsql, dict_snowball, ...) stay
//   share/  translated server messages (the server speaks English), contrib extensions (only plpgsql stays), samples
// Used by stage.mjs on the copy in desktop/stage; tools/postgres itself stays complete (the tests of the bundled
// server use it). The result is tried by the smoke test with the real app (scripts/smoke.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const windows = process.platform === 'win32';
const PROGRAMS = ['postgres', 'initdb', 'pg_ctl', 'pg_dump', 'pg_restore'];
const KEEP_EXTENSIONS = ['plpgsql'];
// Modules in lib/ that are no extension (those are found through share/extension) and that the app does not use
const UNUSED_MODULES =
  /^(libecpg.*|auto_explain|basebackup_to_shell|basic_archive|delay_execution|dummy_.*|test_.*|ldap_password_func|worker_spi|plperl|plpython3|pltcl|.*_plperl|.*_plpython3|passwordcheck|_int|auth_delay|libpgtypes|pgevent|pgxml|plugin_debugger|regress|ssl_passphrase_func|system_stats)$/;

/** Names of the DLLs a Windows executable loads at start or on first use (import and delay-load tables) */
export function importedDlls(file) {
  const data = fs.readFileSync(file);
  if (data.readUInt16LE(0) !== 0x5a4d) return [];
  const pe = data.readUInt32LE(0x3c);
  if (data.readUInt32LE(pe) !== 0x4550) return [];
  const sectionCount = data.readUInt16LE(pe + 6);
  const optionalSize = data.readUInt16LE(pe + 20);
  const optional = pe + 24;
  const directories = optional + (data.readUInt16LE(optional) === 0x20b ? 112 : 96);
  const sections = optional + optionalSize;
  const toOffset = (rva) => {
    for (let i = 0; i < sectionCount; i++) {
      const s = sections + i * 40;
      const virtualSize = data.readUInt32LE(s + 8);
      const virtualAddress = data.readUInt32LE(s + 12);
      const rawSize = data.readUInt32LE(s + 16);
      const rawPointer = data.readUInt32LE(s + 20);
      if (rva >= virtualAddress && rva < virtualAddress + Math.max(virtualSize, rawSize)) return rva - virtualAddress + rawPointer;
    }
    return -1;
  };
  const cString = (offset) => data.toString('latin1', offset, data.indexOf(0, offset));
  const names = [];
  const imports = data.readUInt32LE(directories + 8);
  if (imports) {
    for (let d = toOffset(imports); d >= 0 && data.readUInt32LE(d + 12) !== 0; d += 20) {
      names.push(cString(toOffset(data.readUInt32LE(d + 12))));
    }
  }
  const delayed = data.readUInt32LE(directories + 13 * 8);
  if (delayed) {
    for (let d = toOffset(delayed); d >= 0 && data.readUInt32LE(d + 4) !== 0; d += 32) {
      names.push(cString(toOffset(data.readUInt32LE(d + 4))));
    }
  }
  return names.map((n) => n.toLowerCase());
}

/** Prunes the PostgreSQL folder `dir` (with bin/, lib/, share/) in place; returns the number of bytes removed */
export function prunePostgres(dir) {
  let removed = 0;
  const remove = (target) => {
    if (!fs.existsSync(target)) return;
    const size = (p) => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).reduce((sum, f) => sum + size(path.join(p, f)), 0) : fs.statSync(p).size);
    removed += size(target);
    fs.rmSync(target, { recursive: true, force: true });
  };

  // bin: the programs we run and, on Windows, transitively the DLLs they load
  const bin = path.join(dir, 'bin');
  const present = new Map(fs.readdirSync(bin).map((f) => [f.toLowerCase(), f]));
  const keep = new Set(PROGRAMS.map((p) => (windows ? `${p}.exe` : p)));
  const queue = [...keep];
  while (windows && queue.length) {
    for (const dll of importedDlls(path.join(bin, present.get(queue.pop())))) {
      if (present.has(dll) && !keep.has(dll)) {
        keep.add(dll);
        queue.push(dll);
      }
    }
  }
  for (const [lower, name] of present) {
    if (!keep.has(lower)) remove(path.join(bin, name));
  }

  // lib: import libraries and contrib modules (a module of the same name as an extension, except the kept ones);
  // Linux: static libraries and development symlinks go, libpq.so.5 (loaded by pg_dump and pg_restore) and the modules stay
  const lib = path.join(dir, 'lib');
  const extensions = new Set(
    fs
      .readdirSync(path.join(dir, 'share', 'extension'))
      .filter((f) => f.endsWith('.control'))
      .map((f) => f.slice(0, -'.control'.length))
      .filter((e) => !KEEP_EXTENSIONS.includes(e)),
  );
  for (const name of fs.readdirSync(lib)) {
    const base = name.replace(windows ? /\.(dll|lib)$/i : /\.(so|a)$/, '');
    const isLibrary = windows ? /\.lib$/i.test(name) || !/\.dll$/i.test(name) : !(/\.so$/.test(name) && name !== 'libpq.so') && !name.startsWith('libpq.so.5');
    if (isLibrary || extensions.has(base) || UNUSED_MODULES.test(base)) {
      remove(path.join(lib, name));
    }
  }

  // share: translations, contrib extensions, samples
  const share = path.join(dir, 'share');
  for (const name of ['locale', 'contrib', 'psqlrc.sample']) remove(path.join(share, name));
  remove(path.join(lib, 'pkgconfig'));
  for (const name of fs.readdirSync(path.join(share, 'extension'))) {
    if (!KEEP_EXTENSIONS.some((e) => name === `${e}.control` || name.startsWith(`${e}--`))) remove(path.join(share, 'extension', name));
  }
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node desktop/scripts/prune-postgres.mjs <PostgreSQL folder (copy!)>');
    process.exit(1);
  }
  console.log(`Removed ${(prunePostgres(path.resolve(dir)) / 1024 / 1024).toFixed(1)} MB`);
}
