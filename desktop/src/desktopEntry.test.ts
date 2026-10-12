import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { desktopEntry, integrateAppImage, quoteExec } from './desktopEntry.js';

describe('desktopEntry', () => {
  it('quotes paths with spaces and special characters', () => {
    assert.equal(quoteExec('/home/Jürgen Müller/Cognatio.AppImage'), '"/home/Jürgen Müller/Cognatio.AppImage"');
    // Quoting rule first (\" \$ \` \\), then the string escapes double every backslash: a literal backslash needs four
    assert.equal(quoteExec('/tmp/a"b$c`d\\e'), '"/tmp/a\\\\"b\\\\$c\\\\`d\\\\\\\\e"');
  });

  it('doubles percent signs, which would otherwise start a field code', () => {
    assert.equal(quoteExec('/home/max/100% Familie/Cognatio.AppImage'), '"/home/max/100%% Familie/Cognatio.AppImage"');
  });

  it('writes line breaks and tabs as escapes so the entry stays on one line', () => {
    assert.equal(quoteExec('/a\nb\tc'), '"/a\\nb\\tc"');
  });

  it('starts exactly the given file', () => {
    const entry = desktopEntry('/opt/Cognatio 1.0.AppImage');
    assert.match(entry, /^Exec="\/opt\/Cognatio 1\.0\.AppImage"$/m);
    assert.match(entry, /^Icon=cognatio$/m);
    assert.match(entry, /^Type=Application$/m);
  });
});

describe('integrateAppImage', () => {
  it('writes entry and icon, leaves them alone when nothing changed and follows a moved file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-entry-'));
    try {
      const iconFile = path.join(dir, 'icon.png');
      fs.writeFileSync(iconFile, 'PNG');
      const dataHome = path.join(dir, 'Daten Ordner');
      assert.equal(integrateAppImage({ appImage: '/a/Cognatio.AppImage', iconFile, dataHome }), true);
      const entry = path.join(dataHome, 'applications', 'cognatio.desktop');
      assert.match(fs.readFileSync(entry, 'utf8'), /Exec="\/a\/Cognatio\.AppImage"/);
      assert.equal(fs.readFileSync(path.join(dataHome, 'icons', 'hicolor', '256x256', 'apps', 'cognatio.png'), 'utf8'), 'PNG');

      assert.equal(integrateAppImage({ appImage: '/a/Cognatio.AppImage', iconFile, dataHome }), false);
      assert.equal(integrateAppImage({ appImage: '/b/Cognatio.AppImage', iconFile, dataHome }), true);
      assert.match(fs.readFileSync(entry, 'utf8'), /Exec="\/b\/Cognatio\.AppImage"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
