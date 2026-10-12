import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readAppSettings, settingsFile, writeAppSettings } from '../appSettings.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-settings-'));
const file = path.join(dir, 'unterordner', 'settings.json');

beforeEach(() => {
  process.env.SETTINGS_FILE = file;
});
afterEach(() => {
  delete process.env.SETTINGS_FILE;
  delete process.env.COGNATIO_DATA_DIR;
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('app settings file', () => {
  it('is empty when the file is missing and writes the folder and the file on the first save', () => {
    expect(readAppSettings()).toEqual({});
    writeAppSettings({ limits: { importMb: 4096 } });
    expect(readAppSettings()).toEqual({ limits: { importMb: 4096 } });
  });

  it('keeps the other settings when one is saved and leaves no temporary file behind', () => {
    writeAppSettings({ a: 1, limits: { importMb: 1 } });
    writeAppSettings({ limits: { importMb: 2 } });
    expect(readAppSettings()).toEqual({ a: 1, limits: { importMb: 2 } });
    expect(fs.readdirSync(path.dirname(file))).toEqual(['settings.json']);
  });

  it('treats a damaged file or something other than an object as empty', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '[1, 2]');
    expect(readAppSettings()).toEqual({});
    fs.writeFileSync(file, 'kein json');
    expect(readAppSettings()).toEqual({});
  });

  it('lives in the data folder of the installation', () => {
    delete process.env.SETTINGS_FILE;
    process.env.COGNATIO_DATA_DIR = dir;
    expect(settingsFile()).toBe(path.join(dir, 'settings.json'));
  });
});
