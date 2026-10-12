// Run by commit-and-tag-version after the version bump (see .versionrc.json): rolls the "Unreleased" section of
// CHANGELOG.md into the new version.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPrerelease, rollChangelog } from './lib/changelog.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const file = path.join(root, 'CHANGELOG.md');
if (isPrerelease(version)) {
  // Test versions only collect the entries that the final release rolls into its section
  console.log(`CHANGELOG.md: ${version} is a pre-release, Unreleased stays`);
  process.exit(0);
}
fs.writeFileSync(file, rollChangelog(fs.readFileSync(file, 'utf8'), version, new Date().toISOString().slice(0, 10)));
console.log(`CHANGELOG.md: Unreleased -> ${version}`);
