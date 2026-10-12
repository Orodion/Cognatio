import assert from 'node:assert/strict';
import test from 'node:test';
import { channelFeed } from './channel-feed.mjs';

const feed = `version: 1.1.0-beta.1
files:
  - url: Cognatio-Setup-1.1.0-beta.1.exe
    sha512: abc==
    size: 150010759
path: Cognatio-Setup-1.1.0-beta.1.exe
sha512: abc==
releaseDate: '2026-10-09T20:00:00.000Z'
`;
const base = 'https://gitlab.com/api/v4/projects/1/packages/generic/cognatio/1.1.0-beta.1';

test('makes the installer addresses absolute and leaves everything else alone', () => {
  const result = channelFeed(feed, base);
  assert.ok(result.includes(`  - url: ${base}/Cognatio-Setup-1.1.0-beta.1.exe\n`));
  assert.ok(result.includes(`\npath: ${base}/Cognatio-Setup-1.1.0-beta.1.exe\n`));
  assert.ok(result.includes('version: 1.1.0-beta.1\n'));
  assert.ok(result.includes('    sha512: abc==\n'));
  assert.ok(result.includes("releaseDate: '2026-10-09T20:00:00.000Z'\n"));
});

test('does not touch addresses that are absolute already and ignores a trailing slash', () => {
  const absolute = 'files:\n  - url: https://example.test/a.exe\n';
  assert.equal(channelFeed(absolute, base), absolute);
  assert.ok(channelFeed(feed, base + '/').includes(`url: ${base}/Cognatio-Setup`));
});

test('works with Windows line breaks and quoted values', () => {
  const result = channelFeed("files:\r\n  - url: 'a b.exe'\r\npath: a b.exe\r\n", base);
  assert.ok(result.includes(`  - url: ${base}/a%20b.exe\r\n`));
  assert.ok(result.includes(`path: ${base}/a%20b.exe\r\n`));
});
