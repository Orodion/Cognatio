import { track } from '@/lib/activity';
import { formatMb } from '@/lib/formatSize';
import { postWithProgress } from '@/lib/upload';

/** `values`: for the message, e.g. the space needed and free on the drive (NOT_ENOUGH_SPACE) */
export type ScanUploadResult = { ok: true } | { ok: false; reason: string; values?: Record<string, string> };

class ScanRefused extends Error {
  constructor(
    readonly reason: string,
    readonly values: Record<string, string>,
  ) {
    super(reason);
  }
}

/**
 * Uploads a scan of a source or of a citation (REST) as an activity: its progress shows under "Activity". The file
 * belongs to the library of sources, not to a person or family tree. `reason` is a key under `apiErrors.*`.
 */
export async function uploadScan(file: File, target: { sourceId: string } | { citationId: string }, link: string): Promise<ScanUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT');
  if ('sourceId' in target) {
    formData.append('sourceId', target.sourceId);
  } else {
    formData.append('citationId', target.citationId);
  }
  try {
    return await track(
      { kind: 'media', label: file.name, link },
      async (control) => {
        const answer = await postWithProgress('/api/v1/media/upload', formData, file.size, control);
        let body: { reason?: unknown; params?: Record<string, number> } = {};
        try {
          body = JSON.parse(answer.text);
        } catch {
          // no JSON
        }
        if (answer.status === 201) {
          return { ok: true as const };
        }
        const params = body.params ?? {};
        const values = Object.fromEntries(
          Object.entries({ needed: params.neededMb, free: params.freeMb })
            .filter(([, mb]) => typeof mb === 'number')
            .map(([key, mb]) => [key, formatMb(mb as number)]),
        );
        throw new ScanRefused(typeof body.reason === 'string' ? body.reason : 'UPLOAD_FAILED', values);
      },
      () => ({ size: file.size }),
    );
  } catch (err) {
    return err instanceof ScanRefused
      ? { ok: false, reason: err.reason, values: err.values }
      : { ok: false, reason: (err as { reason?: string }).reason ?? 'NETWORK' };
  }
}
