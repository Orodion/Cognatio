import { describe, it, expect, vi, afterEach } from 'vitest';
import { uploadMedia, uploadTypeOf, MAX_UPLOAD_BYTES } from '../uploadMedia';
import { useActiveTreeStore } from '@/stores/activeTreeStore';

afterEach(() => {
  vi.unstubAllGlobals();
  useActiveTreeStore.setState({ treeId: null });
});

const file = (size: number, type = 'image/png') => {
  const f = new File(['x'], 'bild.png', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('uploadMedia', () => {
  it('rejects files above the size limit without calling the server', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await uploadMedia(file(MAX_UPLOAD_BYTES + 1), 'p1', 'PROFILE_PICTURE')).toEqual({
      ok: false,
      reason: 'FILE_TOO_LARGE',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to the relative upload URL and returns the error reason from the server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ reason: 'PERSON_NOT_FOUND' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await uploadMedia(file(10), 'p1', 'PROFILE_PICTURE')).toEqual({ ok: false, reason: 'PERSON_NOT_FOUND' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/media/upload');
    expect((fetchMock.mock.calls[0][1].body as FormData).get('type')).toBe('PROFILE_PICTURE');
  });

  it('uploads into the open family tree', async () => {
    useActiveTreeStore.setState({ treeId: 't2' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'm1' }) });
    vi.stubGlobal('fetch', fetchMock);
    await uploadMedia(file(10), 'p1', 'PHOTO');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'X-Family-Tree-Id': 't2' });
  });

  it('reports network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await uploadMedia(file(10), 'p1', 'PHOTO')).toEqual({ ok: false, reason: 'NETWORK' });
  });

  it('links the file with an event and returns the id of the new medium', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'm1' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await uploadMedia(file(10), 'p1', 'PHOTO', 'e1')).toEqual({ ok: true, id: 'm1' });
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('eventId')).toBe('e1');
    expect(body.get('personId')).toBe('p1');
  });

  it('files images as photos and everything else as documents', () => {
    expect(uploadTypeOf(file(1, 'image/jpeg'))).toBe('PHOTO');
    expect(uploadTypeOf(file(1, 'application/pdf'))).toBe('DOCUMENT');
  });
});
