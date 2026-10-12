// One version for the whole product: the version in the root package.json is copied to the workspaces
// (backend, frontend, e2e, desktop) and to their entries in package-lock.json.
//   node scripts/sync-version.mjs          sets the version everywhere
//   node scripts/sync-version.mjs --check  only checks (exit code 1 if a version differs; used in CI)
// `npm version <major|minor|patch>` in the root folder runs it automatically (script "version").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACES = ['backend', 'frontend', 'e2e', 'desktop'];
const check = process.argv.includes('--check');

const read = (file) => {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  return { json: JSON.parse(text), eol: text.includes('\r\n') ? '\r\n' : '\n' };
};
const write = (file, { json, eol }) => fs.writeFileSync(path.join(root, file), (JSON.stringify(json, null, 2) + '\n').replace(/\n/g, eol));

const { version } = read('package.json').json;
const wrong = [];

/** The object with `version` set right after `name` (key order as npm writes it) */
const withVersion = ({ name, version: _old, ...rest }) => (name === undefined ? { version, ...rest } : { name, version, ...rest });

for (const workspace of WORKSPACES) {
  const file = `${workspace}/package.json`;
  const pkg = read(file);
  if (pkg.json.version !== version) {
    wrong.push(`${file}: ${pkg.json.version ?? '(none)'}`);
    pkg.json = withVersion(pkg.json);
    if (!check) {
      write(file, pkg);
    }
  }
}

const lock = read('package-lock.json');
let lockChanged = false;
if (lock.json.version !== version) {
  wrong.push(`package-lock.json: ${lock.json.version ?? '(none)'}`);
  lock.json = withVersion(lock.json);
  lockChanged = true;
}
for (const key of ['', ...WORKSPACES]) {
  const entry = lock.json.packages?.[key];
  if (entry && entry.version !== version) {
    wrong.push(`package-lock.json packages["${key}"]: ${entry.version ?? '(none)'}`);
    lock.json.packages[key] = withVersion(entry);
    lockChanged = true;
  }
}
if (lockChanged && !check) {
  write('package-lock.json', lock);
}

if (check && wrong.length) {
  console.error(`Version ${version} of package.json differs in:\n  ${wrong.join('\n  ')}\nRun: node scripts/sync-version.mjs`);
  process.exit(1);
}
console.log(wrong.length ? `Version ${version} set in:\n  ${wrong.join('\n  ')}` : `Version ${version} is the same everywhere.`);
