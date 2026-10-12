import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasEntries, isPrerelease, releaseNotes, rollChangelog, sectionOf, unsignedNote } from './lib/changelog.mjs';

const changelog = `# Changelog

Intro; the project has no versioned releases yet.

## [Unreleased]

### Added
- New thing.

### Fixed
- A bug.

## [1.0.0] - 2026-01-01

### Added
- First.

## Earlier work

Before.
`;

describe('sectionOf', () => {
  it('returns the text between two headings', () => {
    assert.equal(sectionOf(changelog, '1.0.0'), '### Added\n- First.');
    assert.equal(sectionOf(changelog, 'Unreleased'), '### Added\n- New thing.\n\n### Fixed\n- A bug.');
    assert.equal(sectionOf(changelog, '9.9.9'), null);
  });

  it('works with Windows line breaks', () => {
    assert.equal(sectionOf(changelog.replace(/\n/g, '\r\n'), '1.0.0'), '### Added\n- First.');
  });
});

describe('releaseNotes', () => {
  it('returns the notes of a version', () => {
    assert.equal(releaseNotes(changelog, '1.0.0'), '### Added\n- First.\n');
  });

  it('refuses a missing or empty section', () => {
    assert.throws(() => releaseNotes(changelog, '2.0.0'), /no entries for 2.0.0/);
    assert.throws(() => releaseNotes('## [Unreleased]\n\n## [1.0.0]\n- x', 'Unreleased'), /no entries/);
  });

  it('detects entries', () => {
    assert.equal(hasEntries('### Added\n- x'), true);
    assert.equal(hasEntries('### Added\n'), false);
    assert.equal(hasEntries(null), false);
  });
});

describe('rollChangelog', () => {
  it('turns Unreleased into the version and opens a new Unreleased', () => {
    const rolled = rollChangelog(changelog, '1.1.0', '2026-10-09');
    assert.ok(rolled.includes('## [Unreleased]\n\n## [1.1.0] - 2026-10-09\n\n### Added\n- New thing.'));
    assert.equal(sectionOf(rolled, 'Unreleased'), '');
    assert.equal(sectionOf(rolled, '1.0.0'), '### Added\n- First.');
    assert.ok(!rolled.includes('no versioned releases yet'));
    assert.ok(rolled.includes('## Earlier work'));
  });

  it('keeps Windows line breaks', () => {
    const rolled = rollChangelog(changelog.replace(/\n/g, '\r\n'), '1.1.0', '2026-10-09');
    assert.ok(rolled.includes('\r\n## [1.1.0] - 2026-10-09\r\n'));
    assert.ok(!/[^\r]\n/.test(rolled));
  });

  it('refuses without entries or for a version that exists', () => {
    assert.throws(() => rollChangelog('## [Unreleased]\n\n## [1.0.0]\n- x', '1.1.0', 'd'), /nothing to release/);
    assert.throws(() => rollChangelog(changelog, '1.0.0', 'd'), /already has a section/);
  });
});

describe('isPrerelease', () => {
  it('recognises test versions, with or without the v of the tag', () => {
    assert.equal(isPrerelease('1.2.0-beta.1'), true);
    assert.equal(isPrerelease('v1.2.0-beta.0'), true);
    assert.equal(isPrerelease('1.2.0'), false);
    assert.equal(isPrerelease('v1.2.0'), false);
  });
});

describe('unsignedNote', () => {
  it('names the installer file for the hash check', () => {
    const note = unsignedNote('1.0.0');
    assert.match(note, /Get-FileHash Cognatio-Setup-1\.0\.0\.exe -Algorithm SHA256/);
    assert.match(note, /SHA256SUMS/);
  });
});
