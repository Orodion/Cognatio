// Prints the release notes of a version from CHANGELOG.md (used by the release pipeline for the release page and
// by the release checklist): node scripts/release-notes.mjs [version]  – default: version of the root package.json
//   --unreleased  prints the section "Unreleased" instead
//   --unsigned    appends the note that the installer is not signed (release page)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPrerelease, releaseNotes, unsignedNote } from './lib/changelog.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const version = process.argv.includes('--unreleased')
  ? 'Unreleased'
  : (arg ?? JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version).replace(/^v/, '');
try {
  // The notes of a pre-release are what is waiting below "Unreleased"
  const notes = releaseNotes(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), isPrerelease(version) ? 'Unreleased' : version);
  process.stdout.write(process.argv.includes('--unsigned') ? `${notes}\n${unsignedNote(version)}` : notes);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
