// Writes THIRD-PARTY-NOTICES.md: the licences of everything the program ships (production dependencies of backend,
// frontend and desktop shell). MIT, BSD, Apache and the font licences require that their text goes with the program.
//
//   node scripts/third-party-notices.mjs           writes the file
//   node scripts/third-party-notices.mjs --check   fails if the file is out of date (release pipeline)
//
// The web app serves the file as /third-party-notices.txt (Settings → System), the installer puts it next to the
// program (desktop/electron-builder.yml).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'THIRD-PARTY-NOTICES.md');
const WORKSPACES = ['backend', 'frontend', 'desktop'];

function npmLs(format) {
  try {
    return execSync(`npm ls --omit=dev --all --${format} ${WORKSPACES.map((w) => `-w ${w}`).join(' ')}`, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (error) {
    // npm ls exits with 1 for warnings (e.g. optional peer dependencies) but still lists everything
    if (!error.stdout) throw error;
    return error.stdout;
  }
}

/** Names of "extraneous" packages: npm ls lists them where they happen to be installed (wasm fallbacks of build tools on Linux) */
function extraneousPackages() {
  const found = new Set();
  const walk = (dependencies = {}) => {
    for (const [name, node] of Object.entries(dependencies)) {
      if (node.extraneous) found.add(`${name}@${node.version}`);
      walk(node.dependencies);
    }
  };
  walk(JSON.parse(npmLs('json')).dependencies);
  return found;
}

function productionPackageDirs() {
  const workspaceDirs = new Set(WORKSPACES.map((w) => path.resolve(root, w)));
  return [...new Set(npmLs('parseable').split(/\r?\n/).filter(Boolean))].filter((dir) => dir !== root && !workspaceDirs.has(path.resolve(dir)));
}

const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim();

function licenceName(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type).join(' OR ');
  return 'UNKNOWN';
}

function collect() {
  const packages = new Map();
  const extraneous = extraneousPackages();
  for (const dir of productionPackageDirs()) {
    const file = path.join(dir, 'package.json');
    if (!fs.existsSync(file)) continue;
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!pkg.name || !pkg.version || pkg.private || pkg.name.startsWith('cognatio-') || extraneous.has(`${pkg.name}@${pkg.version}`)) continue;
    const files = fs.readdirSync(dir);
    const pick = (re) => files.filter((f) => re.test(f)).sort();
    const licenceFile = pick(/^(licen[cs]e|copying)(\..*)?$/i)[0];
    const noticeFile = pick(/^notice(\..*)?$/i)[0];
    packages.set(`${pkg.name}@${pkg.version}`, {
      name: pkg.name,
      version: pkg.version,
      license: licenceName(pkg),
      homepage: (typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url ?? pkg.homepage ?? '')).replace(/^git\+/, ''),
      text: licenceFile ? readText(path.join(dir, licenceFile)) : '',
      notice: noticeFile ? readText(path.join(dir, noticeFile)) : '',
    });
  }
  return [...packages.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

function render(packages) {
  const counts = {};
  for (const p of packages) counts[p.license] = (counts[p.license] ?? 0) + 1;
  const summary = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `- ${name}: ${n}`)
    .join('\n');
  const fence = (text) => '```text\n' + text.replace(/```/g, "'''") + '\n```';

  const parts = [
    `# Third-party notices

Cognatio itself is free software under the GNU General Public License, version 3 or (at your option) any later version (see \`LICENSE\`). It contains and uses the following works. Their licences are reproduced below as their authors require.

## Components shipped with the Windows app

- **Electron and Chromium** – MIT and many other licences. The texts are in \`LICENSE.electron.txt\` and \`LICENSES.chromium.html\` in the program folder.
- **PostgreSQL** (bundled database server) – PostgreSQL License, see \`resources/postgres/server_license.txt\` in the program folder. It runs as a separate program.
- **Node.js** (inside Electron) – MIT and the licences listed in the Electron files above.

## npm packages (production dependencies)

${packages.length} packages by licence:

${summary}
`,
  ];
  for (const p of packages) {
    parts.push(`---\n\n### ${p.name} ${p.version}\n\nLicence: ${p.license}${p.homepage ? `  \nSource: ${p.homepage}` : ''}\n`);
    parts.push(p.text ? fence(p.text) + '\n' : `This package ships no licence file; its declared licence is ${p.license}.\n`);
    if (p.notice) parts.push(`NOTICE:\n\n${fence(p.notice)}\n`);
  }
  return parts.join('\n');
}

// Licences that may be shipped inside a GPL-3.0-or-later program (all are compatible with it). A package with any other
// licence – or none – stops the script: look at it, then either replace the package or extend this list on purpose.
const ALLOWED = new Set(
  [
    'MIT',
    'ISC',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'Apache-2.0',
    '0BSD',
    'Unlicense',
    'CC0-1.0',
    'BlueOak-1.0.0',
    'OFL-1.1',
    'EPL-2.0',
    'MPL-2.0',
    'Python-2.0',
  ].map((l) => l.toLowerCase()),
);

/** SPDX expression such as "(MIT OR Apache-2.0)" or "MIT AND ISC": allowed if one OR alternative has only allowed parts */
function licenceAllowed(expression) {
  return expression
    .replace(/[()]/g, ' ')
    .split(/\s+or\s+/i)
    .some((alternative) => alternative.split(/\s+and\s+/i).every((id) => ALLOWED.has(id.trim().toLowerCase())));
}

const packages = collect();
const refused = packages.filter((p) => !licenceAllowed(p.license));
if (refused.length) {
  const lines = refused.map((p) => `  ${p.name}@${p.version}: ${p.license}`);
  console.error(`Licence not on the list of allowed licences:\n${lines.join('\n')}`);
  process.exit(1);
}
const content = render(packages);
if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== content) {
    console.error('THIRD-PARTY-NOTICES.md is out of date: run "npm run notices" and commit it.');
    process.exit(1);
  }
  console.log('THIRD-PARTY-NOTICES.md is up to date.');
} else {
  fs.writeFileSync(target, content);
  console.log(`THIRD-PARTY-NOTICES.md written (${content.length.toLocaleString('en')} characters).`);
}
