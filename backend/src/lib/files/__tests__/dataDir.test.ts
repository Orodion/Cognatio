import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dataDirPath, ensureDataDir } from '../dataDir.js';

describe('dataDirPath', () => {
  it('resolves folders below COGNATIO_DATA_DIR', () => {
    expect(dataDirPath({ COGNATIO_DATA_DIR: 'data' }, 'uploads')).toBe(path.resolve('data', 'uploads'));
    expect(dataDirPath({ COGNATIO_DATA_DIR: ' /srv/cognatio ' }, 'logs', 'cognatio.log')).toBe(path.resolve('/srv/cognatio', 'logs', 'cognatio.log'));
  });

  it('is null without the setting, so the defaults of the development setup apply', () => {
    expect(dataDirPath({}, 'uploads')).toBeNull();
    expect(dataDirPath({ COGNATIO_DATA_DIR: '  ' }, 'uploads')).toBeNull();
  });
});

describe('ensureDataDir', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-datadir-'));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('creates a missing data folder readable by the user only', () => {
    const dir = path.join(tmp, 'neu', 'Cognatio Daten');
    expect(ensureDataDir({ COGNATIO_DATA_DIR: dir })).toBe(dir);
    expect(fs.statSync(dir).isDirectory()).toBe(true);
    if (process.platform !== 'win32') {
      expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
    }
  });

  it('leaves an existing folder alone and does nothing without the setting', () => {
    const dir = path.join(tmp, 'vorhanden');
    fs.mkdirSync(dir, { mode: 0o755 });
    ensureDataDir({ COGNATIO_DATA_DIR: dir });
    if (process.platform !== 'win32') {
      expect(fs.statSync(dir).mode & 0o777).toBe(0o755);
    }
    expect(ensureDataDir({})).toBeNull();
  });
});
