// CHANGELOG.md in Keep-a-Changelog format: new entries go below "## [Unreleased]", a release turns that section
// into "## [X.Y.Z] - date".

const UNRELEASED = '## [Unreleased]';

/** Text of the section of a version (or of "Unreleased") without its heading; null if there is no such section */
export function sectionOf(changelog, version) {
  const heading = version === 'Unreleased' ? UNRELEASED : `## [${version}]`;
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start < 0) {
    return null;
  }
  let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  if (end < 0) {
    end = lines.length;
  }
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
}

/** A pre-release (1.2.0-beta.1) does not roll the changelog: its notes are the ones below "Unreleased" */
export const isPrerelease = (version) => /^v?\d+\.\d+\.\d+-/.test(version);

/** True if the section has entries below its "###" headings */
export const hasEntries = (section) => /^\s*- /m.test(section ?? '');

/**
 * The release notes of a version for the release page: its section of the changelog, with the "###" headings
 * kept. Throws if there is no section or it is empty (a release without notes is a mistake).
 */
export function releaseNotes(changelog, version) {
  const section = sectionOf(changelog, version);
  if (!hasEntries(section)) {
    throw new Error(`CHANGELOG.md has no entries for ${version}`);
  }
  return `${section}\n`;
}

/**
 * Note for the release page while the installer carries no digital signature: what Windows shows and how to check
 * the download against SHA256SUMS (the release pipeline adds it as long as CSC_LINK is not set)
 */
export function unsignedNote(version) {
  const file = `Cognatio-Setup-${version}.exe`;
  return [
    '### Windows warning (installer not signed yet)',
    '',
    'This installer has no digital signature yet. Windows SmartScreen may therefore show "Windows protected your PC" or "Unknown publisher": choose *More info*, then *Run anyway*.',
    '',
    'To check that your download is the file built by this release, compare its SHA-256 value with the line for it in `SHA256SUMS` on this page (PowerShell):',
    '',
    '```powershell',
    `Get-FileHash ${file} -Algorithm SHA256`,
    '```',
    '',
  ].join('\n');
}

/** Turns "Unreleased" into the release `version` of `date` (YYYY-MM-DD) and opens a new empty "Unreleased" */
export function rollChangelog(changelog, version, date) {
  const eol = changelog.includes('\r\n') ? '\r\n' : '\n';
  const text = changelog.replace(/\r\n/g, '\n');
  if (!hasEntries(sectionOf(text, 'Unreleased'))) {
    throw new Error('CHANGELOG.md has no entries below "## [Unreleased]" – nothing to release');
  }
  if (sectionOf(text, version) !== null) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }
  const rolled = text
    .replace(UNRELEASED, `${UNRELEASED}\n\n## [${version}] - ${date}`)
    // the intro of the first versions says there are no releases yet
    .replace('; the project has no versioned releases yet', '');
  return rolled.replace(/\n/g, eol);
}
