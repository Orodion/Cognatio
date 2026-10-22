import { track } from '@/lib/activity';
import { formatMb } from '@/lib/formatSize';
import { postWithProgress } from '@/lib/upload';

export type MediaUploadType = 'PROFILE_PICTURE' | 'PHOTO' | 'DOCUMENT' | 'OTHER';

/** `values`: for the message, e.g. the space needed and free on the drive (NOT_ENOUGH_SPACE) */
export type UploadResult = { ok: true; id?: string } | { ok: false; reason: string; values?: Record<string, string> };

/** Kind of an uploaded file by its type: images as photo, everything else as document */
export const uploadTypeOf = (file: File): MediaUploadType => (file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT');

/** A refused upload as error of the activity (with the values for its message) */
class UploadRefused extends Error {
  constructor(
    readonly reason: string,
    readonly values: Record<string, string>,
    readonly details: string[] = [],
  ) {
    super(reason);
  }
}

/**
 * Uploads a file for a person (REST) as an activity: its progress shows under "Activity" and it can be cancelled
 * there, also when the page has been left. There is no limit per file (videos), only the free space on the drive
 * counts. With `PROFILE_PICTURE` the backend sets the image as profile picture directly, with `eventId` the file is
 * linked with the event. `reason` is a key under `apiErrors.*`.
 */
export async function uploadMedia(file: File, personId: string, type: MediaUploadType, eventId?: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('personId', personId);
  formData.append('type', type);
  if (eventId) {
    formData.append('eventId', eventId);
  }

  try {
    return await track(
      { kind: 'media', label: file.name, link: `/persons/${personId}` },
      async (control) => {
        // The file belongs to the active family tree
        const answer = await postWithProgress('/api/v1/media/upload', formData, file.size, control);
        let body: { id?: unknown; reason?: unknown; params?: Record<string, number> } = {};
        try {
          body = JSON.parse(answer.text);
        } catch {
          // no JSON
        }
        if (answer.status === 201) {
          return { ok: true as const, id: typeof body.id === 'string' ? body.id : undefined };
        }
        const params = body.params ?? {};
        const values = Object.fromEntries(
          Object.entries({ needed: params.neededMb, free: params.freeMb })
            .filter(([, mb]) => typeof mb === 'number')
            .map(([key, mb]) => [key, formatMb(mb as number)]),
        );
        throw new UploadRefused(typeof body.reason === 'string' ? body.reason : 'UPLOAD_FAILED', values);
      },
      () => ({ size: file.size }),
    );
  } catch (err) {
    return err instanceof UploadRefused
      ? { ok: false, reason: err.reason, values: err.values }
      : { ok: false, reason: (err as { reason?: string }).reason ?? 'NETWORK' };
  }
}
