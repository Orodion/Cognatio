import { describe, it, expect, vi, afterEach } from 'vitest';
import { uploadMedia, uploadTypeOf } from '../uploadMedia';
import { useActiveTreeStore } from '@/stores/activeTreeStore';
import { useActivityStore } from '@/stores/activityStore';
import { cancelActivity } from '@/lib/activity';
import { stubXhr } from '@/test/xhr';

afterEach(() => {
  vi.unstubAllGlobals();
  useActiveTreeStore.setState({ treeId: null });
  useActivityStore.setState({ activities: [] });
});

const file = (size: number, type = 'image/png') => {
  const f = new File(['x'], 'bild.png', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('uploadMedia', () => {
  it('sends large files too (no limit per file) and names the space the drive lacks', async () => {
    const sent = stubXhr({ status: 413, body: { reason: 'NOT_ENOUGH_SPACE', params: { neededMb: 6144, freeMb: 512 } } });
    expect(await uploadMedia(file(5 * 1024 ** 3, 'video/mp4'), 'p1', 'OTHER')).toEqual({
      ok: false,
      reason: 'NOT_ENOUGH_SPACE',
      values: { needed: '6 GB', free: '512 MB' },
    });
    expect(sent).toHaveLength(1);
  });

  it('posts to the relative upload URL and returns the error reason from the server', async () => {
    const sent = stubXhr({ status: 404, body: { reason: 'PERSON_NOT_FOUND' } });
    expect(await uploadMedia(file(10), 'p1', 'PROFILE_PICTURE')).toEqual({ ok: false, reason: 'PERSON_NOT_FOUND', values: {} });
    expect(sent[0]).toMatchObject({ method: 'POST', url: '/api/v1/media/upload' });
    expect(sent[0].body.get('type')).toBe('PROFILE_PICTURE');
  });

  it('uploads into the open family tree', async () => {
    useActiveTreeStore.setState({ treeId: 't2' });
    const sent = stubXhr({ status: 201, body: { id: 'm1' } });
    await uploadMedia(file(10), 'p1', 'PHOTO');
    expect(sent[0].headers).toEqual({ 'X-Family-Tree-Id': 't2' });
  });

  it('reports network errors', async () => {
    stubXhr('network-error');
    expect(await uploadMedia(file(10), 'p1', 'PHOTO')).toEqual({ ok: false, reason: 'NETWORK' });
  });

  it('links the file with an event and returns the id of the new medium', async () => {
    const sent = stubXhr({ status: 201, body: { id: 'm1' } });
    expect(await uploadMedia(file(10), 'p1', 'PHOTO', 'e1')).toEqual({ ok: true, id: 'm1' });
    expect(sent[0].body.get('eventId')).toBe('e1');
    expect(sent[0].body.get('personId')).toBe('p1');
  });

  it('shows the upload under "Activity" with its progress and result', async () => {
    stubXhr({ status: 201, body: { id: 'm1' } });
    await uploadMedia(file(3), 'p1', 'PHOTO');
    expect(useActivityStore.getState().activities[0]).toMatchObject({
      kind: 'media',
      label: 'bild.png',
      link: '/persons/p1',
      state: 'done',
      result: { size: 3 },
    });
  });

  it('can be cancelled there', async () => {
    stubXhr({ status: 201 }, { hold: true });
    const upload = uploadMedia(file(10), 'p1', 'PHOTO');
    cancelActivity(useActivityStore.getState().activities[0].id);
    expect(await upload).toEqual({ ok: false, reason: 'CANCELLED' });
    expect(useActivityStore.getState().activities[0].state).toBe('cancelled');
  });

  it('files images as photos and everything else as documents', () => {
    expect(uploadTypeOf(file(1, 'image/jpeg'))).toBe('PHOTO');
    expect(uploadTypeOf(file(1, 'application/pdf'))).toBe('DOCUMENT');
  });
});
