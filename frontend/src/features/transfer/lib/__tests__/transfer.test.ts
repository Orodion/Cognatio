import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatMb, request, toError } from '../transfer';

afterEach(() => vi.unstubAllGlobals());

describe('formatMb', () => {
  it('writes megabytes below 1 GB and gigabytes from there', () => {
    expect(formatMb(500)).toBe('500 MB');
    expect(formatMb(1023)).toBe('1023 MB');
    expect(formatMb(2048)).toBe('2 GB');
    expect(formatMb(2560)).toBe('2.5 GB');
  });
});

describe('request', () => {
  it('hands the numbers of a "too large" answer on to the error message', async () => {
    const body = { reason: 'EXPORT_TOO_LARGE', details: ['x'], params: { sizeMb: 3000, limitMb: 2048 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 413 })));

    const error = await request('/api/v1/export/zip').catch(toError);

    expect(error).toEqual({ reason: 'EXPORT_TOO_LARGE', details: ['x'], params: { sizeMb: 3000, limitMb: 2048 } });
  });

  it('works without numbers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ reason: 'NO_FILE' }), { status: 400 })));

    expect(await request('/api/v1/import/preview').catch(toError)).toEqual({ reason: 'NO_FILE', details: [], params: {} });
  });
});
