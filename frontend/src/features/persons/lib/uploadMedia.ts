import { treeHeaders } from '@/stores/activeTreeStore';
import { apiUrl } from '@/lib/platform';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type MediaUploadType = 'PROFILE_PICTURE' | 'PHOTO' | 'DOCUMENT' | 'OTHER';

export type UploadResult = { ok: true; id?: string } | { ok: false; reason: string };

/** Kind of an uploaded file by its type: images as photo, everything else as document */
export const uploadTypeOf = (file: File): MediaUploadType => (file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT');

/**
 * Uploads a file for a person (REST).
 * With `PROFILE_PICTURE` the backend sets the image as profile picture directly, with `eventId` the file
 * is linked with the event. `reason` is a key under `apiErrors.*` or `FILE_TOO_LARGE`.
 */
export async function uploadMedia(file: File, personId: string, type: MediaUploadType, eventId?: string): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'FILE_TOO_LARGE' };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('personId', personId);
  formData.append('type', type);
  if (eventId) {
    formData.append('eventId', eventId);
  }

  try {
    // The file belongs to the active family tree
    const response = await fetch(apiUrl('/api/v1/media/upload'), { method: 'POST', body: formData, headers: treeHeaders() });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      return { ok: true, id: typeof body.id === 'string' ? body.id : undefined };
    }
    return { ok: false, reason: typeof body.reason === 'string' ? body.reason : 'UPLOAD_FAILED' };
  } catch {
    return { ok: false, reason: 'NETWORK' };
  }
}
