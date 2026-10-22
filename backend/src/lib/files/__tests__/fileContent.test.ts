import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contentFits } from '../fileContent.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-content-'));
const file = (name: string, content: Buffer | string) => {
  const target = path.join(dir, name);
  fs.writeFileSync(target, content);
  return target;
};

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('contentFits', () => {
  it('accepts pictures and PDFs whose content fits', () => {
    expect(contentFits(file('a.jpg', JPEG), ['image/jpeg'])).toBe(true);
    expect(contentFits(file('a.png', PNG), ['image/png'])).toBe(true);
    expect(contentFits(file('a.gif', 'GIF89a…'), ['image/gif'])).toBe(true);
    expect(contentFits(file('a.webp', 'RIFF\0\0\0\0WEBPVP8 '), ['image/webp'])).toBe(true);
    expect(contentFits(file('a.heic', '\0\0\0\x18ftypheic'), ['image/heic'])).toBe(true);
    expect(contentFits(file('a.pdf', '%PDF-1.7\n'), ['application/pdf'])).toBe(true);
    // A PNG named ".jpg" still shows as a picture
    expect(contentFits(file('b.jpg', PNG), ['image/jpeg'])).toBe(true);
  });

  it('refuses a text named as a picture or PDF', () => {
    expect(contentFits(file('fake.jpg', 'nur Text'), ['image/jpeg'])).toBe(false);
    expect(contentFits(file('fake.pdf', 'nur Text'), ['application/pdf'])).toBe(false);
    // The name counts even if the browser sent no type
    expect(contentFits(file('fake2.jpg', 'nur Text'), ['application/octet-stream', 'image/jpeg'])).toBe(false);
    expect(contentFits(file('empty.png', ''), ['image/png'])).toBe(false);
  });

  it('takes other types as named', () => {
    expect(contentFits(file('a.txt', 'Text'), ['text/plain'])).toBe(true);
    expect(contentFits(file('a.mp4', 'irgendwas'), ['video/mp4'])).toBe(true);
    expect(contentFits(file('a.svg', '<svg/>'), ['image/svg+xml'])).toBe(true);
  });
});
