// Publishes a release of the private repository in the public one, without the development history: the public
// repository gets one commit per release. Nothing is pushed: the script only prepares a local folder.
//
//   first release:  node scripts/public-snapshot.mjs --project <owner/name> --name "<author name>" --email <author email>
//                                    [--host github.com|gitlab.com] [--forbid "<word>,<word>,..."] [--out <folder>]
//   later releases: node scripts/public-snapshot.mjs --project <owner/name> --name ... --email ... --into <clone of the public repository>
//   both:           [--trial] [--tree <treeish>]
//
// Run it after `npm run release` (clean working tree, HEAD tagged vX.Y.Z). Steps:
//   1. exports the files of HEAD (`git archive`: only what is versioned, no history, no ignored files) – into a new
//      folder (`--out`, first release) or into a clone of the public repository whose files it replaces (`--into`)
//   2. points the update feed and the links to the public project (the current project address, read from
//      desktop/src/feeds.ts, is replaced; on GitHub the release address takes the GitHub form) and empties
//      .git-blame-ignore-revs (its commits do not exist in the public repository)
//   3. checks that nothing private is left: the old project address and the words given with --forbid (private e-mail
//      address, real names of persons, local paths …). The words are never written into a file of the repository – like
//      the e-mail address they are only passed on the command line.
//   4. one commit "Cognatio X.Y.Z" under the given identity, tag vX.Y.Z (first release: `git init` before)
// The public repository runs the release workflow of its host for the tag: .github/workflows/release.yml (GitHub, the
// default) or .gitlab-ci.yml (GitLab).
// --trial skips the checks for a clean tree and a tag and sets no tag (a state before a release: pushing it runs the
// checks of the public repository but publishes nothing); --tree exports another commit or tree instead of HEAD.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forbiddenWordsIn, HOSTS, pointAtProject, withoutRevisions } from './lib/snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BINARY = /\.(png|ico|jpg|jpeg|gif|woff2?|zip|exe)$/i;

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
const git = (args, cwd = root, options = {}) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', ...options });
  if (result.status !== 0) {
    fail(`git ${args.join(' ')} failed:\n${result.stderr}`);
  }
  return result.stdout.trim();
};

/** Address of the project the app updates from today (without https://), e.g. gitlab.com/<namespace>/<name> */
function currentProject(feedsSource) {
  const match = feedsSource.match(/PROJECT_URL\s*=\s*'https:\/\/([^']+)'/);
  if (!match) {
    fail('desktop/src/feeds.ts names no PROJECT_URL – cannot tell which address to replace.');
  }
  return match[1].replace(/\/+$/, '');
}

const project = arg('--project');
const name = arg('--name');
const email = arg('--email');
const host = arg('--host') ?? 'github.com';
const into = arg('--into') ? path.resolve(arg('--into')) : null;
const trial = process.argv.includes('--trial');
const treeish = arg('--tree') ?? 'HEAD';
if (!project || !name || !email || !/^[\w.-]+\/[\w./-]+$/.test(project) || !HOSTS.includes(host)) {
  fail(
    'Usage: node scripts/public-snapshot.mjs --project <owner/name> --name "<author name>" --email <author email> [--host github.com|gitlab.com] [--forbid "<word>,<word>"] [--out <folder> | --into <clone>] [--trial] [--tree <treeish>]',
  );
}
const oldProject = currentProject(fs.readFileSync(path.join(root, 'desktop', 'src', 'feeds.ts'), 'utf8'));
const newProject = `${host}/${project}`;
const oldNamespace = oldProject.split('/')[1];
// Words that must not appear in the public repository: the old address, its namespace (unless the new project lives in the
// same one – GitLab and GitHub write a name in different case, the check ignores case) and what --forbid names
const sameNamespace = oldNamespace?.toLowerCase() === project.split('/')[0].toLowerCase();
const forbidden = [
  oldProject,
  ...(oldNamespace && !sameNamespace ? [oldNamespace] : []),
  ...(arg('--forbid') ?? '')
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean),
];
if (!arg('--forbid')) {
  console.warn('Note: no --forbid words given – only the old project address is checked (private e-mail, real names?).');
}
const out = into ?? path.resolve(arg('--out') ?? path.join(root, '..', 'cognatio-public'));
if (into) {
  if (!fs.existsSync(path.join(into, '.git'))) {
    fail(`${into} is no git repository – clone the public repository there first.`);
  }
  if (git(['status', '--porcelain'], into)) {
    fail(`${into} has uncommitted changes – it has to be a clean clone of the public repository.`);
  }
} else if (fs.existsSync(out) && fs.readdirSync(out).length) {
  fail(`${out} exists and is not empty – choose another folder (or --into for a clone of the public repository).`);
}

const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!trial) {
  if (git(['status', '--porcelain'])) {
    fail('The working tree has uncommitted changes – commit them (or run with --trial).');
  }
  if (git(['tag', '--points-at', 'HEAD']).split('\n').includes(`v${version}`) === false) {
    fail(`HEAD is not tagged v${version} – run "npm run release" first (or use --trial).`);
  }
}
if (into && !trial && git(['tag', '--list', `v${version}`], into)) {
  fail(`The public repository already has the tag v${version}.`);
}

// A clone of the new, still empty repository has no commit yet: its first push then goes like the one of a new folder
const firstCommit = into ? spawnSync('git', ['rev-parse', '--verify', '-q', 'HEAD'], { cwd: into }).status !== 0 : true;

/** Puts the clone back to its last commit (after a failed check nothing of the export may stay in it) */
const resetClone = () => {
  if (!firstCommit) {
    git(['reset', '-q', '--hard'], into);
  }
  git(['clean', '-q', '-fd'], into);
};

// 1. Export (a clone first loses its files: files deleted in the private repository disappear in the public one too)
fs.mkdirSync(out, { recursive: true });
if (into) {
  for (const entry of fs.readdirSync(out)) {
    if (entry !== '.git') {
      fs.rmSync(path.join(out, entry), { recursive: true, force: true });
    }
  }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-snapshot-'));
try {
  const tarFile = path.join(work, 'head.tar');
  git(['archive', '--format=tar', '-o', tarFile, treeish]);
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  if (spawnSync(tar, ['-xf', tarFile, '-C', out], { stdio: 'inherit' }).status !== 0) {
    fail('Extracting the export failed');
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

// 2. New project address in all text files, no commits of the private history
const files = git(['ls-files', '--', '.'], root)
  .split('\n')
  .filter(Boolean)
  .filter((file) => fs.existsSync(path.join(out, file)));
let rewritten = 0;
for (const file of files) {
  const target = path.join(out, file);
  if (BINARY.test(file)) {
    continue;
  }
  const text = fs.readFileSync(target, 'utf8');
  if (text.includes(oldProject)) {
    fs.writeFileSync(target, pointAtProject(text, oldProject, newProject));
    rewritten++;
  }
}
console.log(`Project address replaced in ${rewritten} file(s): ${newProject}`);
const blameIgnore = path.join(out, '.git-blame-ignore-revs');
if (fs.existsSync(blameIgnore)) {
  fs.writeFileSync(blameIgnore, withoutRevisions(fs.readFileSync(blameIgnore, 'utf8')));
}

// 3. Nothing private left (the lock file only holds package names and checksums)
const leftovers = [];
for (const file of files) {
  if (BINARY.test(file) || file === 'package-lock.json') {
    continue;
  }
  for (const word of forbiddenWordsIn(fs.readFileSync(path.join(out, file), 'utf8'), forbidden)) {
    leftovers.push(`${file}: ${word}`);
  }
}
if (leftovers.length) {
  if (into) {
    resetClone();
  } else {
    fs.rmSync(out, { recursive: true, force: true });
  }
  fail(`Private data found, nothing was created:\n  ${leftovers.join('\n  ')}`);
}

// 4. One commit
if (!into) {
  git(['init', '-q', '-b', 'main'], out);
}
git(['add', '-A'], out);
const identity = ['-c', `user.name=${name}`, '-c', `user.email=${email}`, '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false'];
// A trial is a state before the release: no tag, so pushing it publishes nothing
const message = trial ? `Cognatio ${version} (not released yet)` : `Cognatio ${version}`;
git([...identity, 'commit', '-q', '-m', message], out);
if (!trial) {
  git([...identity, 'tag', '-a', `v${version}`, '-m', `Cognatio ${version}`], out);
}
console.log(`\n${into ? 'Updated' : 'Created'} ${out}: commit "${message}"${trial ? ' (no tag)' : `, tag v${version}`}, author ${name} <${email}>.`);
console.log(
  trial
    ? 'Next (by hand; without a tag only the checks of the public repository run):'
    : 'Next (by hand; the tag starts the release workflow of the public repository):',
);
console.log(`  cd "${out}"`);
if (trial) {
  if (!into) {
    console.log(`  git remote add origin https://${newProject}.git`);
  }
  console.log(firstCommit ? '  git push -u origin main' : '  git push origin main');
} else if (firstCommit) {
  // First the commit alone: the checks and a trial build run before the tag publishes anything
  if (!into) {
    console.log(`  git remote add origin https://${newProject}.git`);
  }
  console.log('  git push -u origin main');
  console.log(`  git push origin v${version}   (when the checks of the pushed commit are green)`);
} else {
  console.log('  git push origin main --follow-tags');
}
