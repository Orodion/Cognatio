import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiBase, apiUrl, downloadFrom, saveDataUrl, saveFile } from '../platform';

afterEach(() => {
  delete window.cognatioPlatform;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('apiUrl', () => {
  it('keeps backend paths relative in the browser (same address as the page)', () => {
    expect(apiBase()).toBe('');
    expect(apiUrl('/graphql')).toBe('/graphql');
  });

  it('puts the address of the backend in front – from the shell or from the build', () => {
    vi.stubEnv('VITE_API_BASE', 'https://cognatio.example/');
    expect(apiUrl('/api/v1/backup')).toBe('https://cognatio.example/api/v1/backup');
    window.cognatioPlatform = { apiBase: 'http://127.0.0.1:51234' };
    expect(apiUrl('/uploads/a.jpg')).toBe('http://127.0.0.1:51234/uploads/a.jpg');
  });

  it('leaves other addresses unchanged', () => {
    window.cognatioPlatform = { apiBase: 'http://127.0.0.1:51234' };
    for (const url of ['blob:http://x/1', 'data:image/png;base64,AAA', 'https://example.org/a', '//cdn.example/a']) {
      expect(apiUrl(url)).toBe(url);
    }
  });
});

describe('saveFile', () => {
  it('downloads the file in the browser with a temporary link', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await saveFile(new Blob(['a']), 'backup.zip');
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('backup.zip');
    expect(link.href).toBe('blob:x');
    expect(document.querySelector('a')).toBeNull();
  });

  it('uses the implementation of the shell if there is one', async () => {
    const native = vi.fn(async () => {});
    window.cognatioPlatform = { saveFile: native };
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const blob = new Blob(['a']);
    await expect(saveFile(blob, 'backup.zip')).resolves.toBe(true);
    expect(native).toHaveBeenCalledWith(blob, 'backup.zip');
    expect(click).not.toHaveBeenCalled();
  });

  it('reports a cancelled "Save as" dialog of the shell', async () => {
    window.cognatioPlatform = { saveFile: vi.fn(async () => false) };
    await expect(saveFile(new Blob(['a']), 'backup.zip')).resolves.toBe(false);
  });
});

describe('downloadFrom', () => {
  it('lets the browser download the address straight into the file', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(downloadFrom('/api/v1/backup', 'backup.zip')).resolves.toEqual({ saved: true });
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('backup.zip');
    expect(link.getAttribute('href')).toBe('/api/v1/backup');
  });

  it('hands the full address to the shell, which saves it with its "Save as" dialog', async () => {
    const native = vi.fn(async () => ({ saved: false, error: 'FILE_SYSTEM_LIMIT' as const }));
    window.cognatioPlatform = { downloadTo: native };
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    await expect(downloadFrom('/api/v1/backup', 'backup.zip')).resolves.toEqual({ saved: false, error: 'FILE_SYSTEM_LIMIT' });
    expect(native).toHaveBeenCalledWith(new URL('/api/v1/backup', window.location.href).toString(), 'backup.zip');
    expect(click).not.toHaveBeenCalled();
  });
});

describe('saveDataUrl', () => {
  it('downloads a data URL in the browser', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await saveDataUrl('data:image/png;base64,AAA', 'familyTree.png');
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('familyTree.png');
    expect(link.href).toBe('data:image/png;base64,AAA');
  });

  it('hands the image to the shell as a file', async () => {
    const native = vi.fn(async () => {});
    window.cognatioPlatform = { saveFile: native };
    // A stand-in for the image: real Blobs differ between jsdom and the Node version in use
    const image = { kind: 'image' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ blob: async () => image })),
    );
    await saveDataUrl('data:image/png;base64,AAA', 'familyTree.png');
    expect(fetch).toHaveBeenCalledWith('data:image/png;base64,AAA');
    expect(native).toHaveBeenCalledWith(image, 'familyTree.png');
    vi.unstubAllGlobals();
  });
});
