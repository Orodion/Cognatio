// Collects everything the installed app needs next to the program into desktop/stage/ (electron-builder copies it
// to the `resources` folder, see electron-builder.yml):
//   backend/   compiled backend with its production dependencies and the migrations
//   frontend/  built web app
//   postgres/  bundled PostgreSQL (npm run postgres:fetch)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backendLockfile } from './backend-lock.mjs';
import { prunePostgres } from './prune-postgres.mjs';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(desktop, '..');
const stage = path.join(desktop, 'stage');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (file, args, cwd) => execFileSync(file, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

if (!fs.existsSync(path.join(root, 'tools', 'postgres', 'bin'))) {
  console.error('PostgreSQL is missing: run "npm run postgres:fetch" first.');
  process.exit(1);
}

console.log('Building frontend and backend ...');
run(npm, ['run', 'build', '-w', 'frontend'], root);
// prisma.config.ts insists on DATABASE_URL although generating the client never connects (not set on a clean build machine)
const generateEnv = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://unused@localhost:5432/unused' };
execFileSync('npx', ['prisma', 'generate'], { cwd: path.join(root, 'backend'), stdio: 'inherit', shell: process.platform === 'win32', env: generateEnv });
run(npm, ['run', 'build', '-w', 'backend'], root);

fs.rmSync(stage, { recursive: true, force: true });
const backend = path.join(stage, 'backend');
fs.mkdirSync(backend, { recursive: true });
fs.cpSync(path.join(root, 'backend', 'dist'), path.join(backend, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'backend', 'prisma', 'migrations'), path.join(backend, 'prisma', 'migrations'), { recursive: true });
fs.cpSync(path.join(root, 'frontend', 'dist'), path.join(stage, 'frontend'), { recursive: true });
fs.cpSync(path.join(root, 'tools', 'postgres'), path.join(stage, 'postgres'), { recursive: true });
console.log(`PostgreSQL: ${(prunePostgres(path.join(stage, 'postgres')) / 1024 / 1024).toFixed(1)} MB of unused programs and files left out`);

// Production dependencies only: package.json of the backend without scripts and development dependencies, installed with
// exactly the versions of the repository's package-lock.json (see backend-lock.mjs)
const { scripts: _scripts, devDependencies: _dev, ...pkg } = JSON.parse(fs.readFileSync(path.join(root, 'backend', 'package.json'), 'utf8'));
fs.writeFileSync(path.join(backend, 'package.json'), JSON.stringify(pkg, null, 2));
const rootLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
fs.writeFileSync(path.join(backend, 'package-lock.json'), JSON.stringify(backendLockfile(rootLock, pkg), null, 2));
console.log('Installing the production dependencies of the backend ...');
run(npm, ['ci', '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts'], backend);

console.log(`Staged in ${stage}`);
