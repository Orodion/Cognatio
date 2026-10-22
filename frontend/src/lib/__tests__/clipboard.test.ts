import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../clipboard';

afterEach(() => vi.restoreAllMocks());

const setClipboard = (writeText: () => Promise<void>) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

describe('copyText', () => {
  it('uses the Clipboard API', async () => {
    const writeText = vi.fn(async () => undefined);
    setClipboard(writeText);
    expect(await copyText('abc')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('copies through a selection when the permission is refused (desktop app)', async () => {
    setClipboard(async () => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });
    expect(await copyText('abc')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    // The hidden field is gone again
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports when nothing works', async () => {
    setClipboard(async () => Promise.reject(new Error('denied')));
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true });
    expect(await copyText('abc')).toBe(false);
  });
});
