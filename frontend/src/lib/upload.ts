import { treeHeaders } from '@/stores/activeTreeStore';
import type { ActivityControl } from '@/lib/activity';
import { apiUrl } from '@/lib/platform';

/**
 * Sends a form with a file to the backend and reports the progress of the upload (fetch cannot). Resolves with status
 * and text of the answer; rejects with `{ reason: 'NETWORK' }` or, when the activity is cancelled, with
 * `{ reason: 'CANCELLED' }`.
 */
export function postWithProgress(path: string, data: FormData, size: number, control?: ActivityControl): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(path));
    for (const [name, value] of Object.entries(treeHeaders())) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (e) => control?.progress({ phase: 'upload', done: e.loaded, total: e.lengthComputable ? e.total : size });
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject({ reason: 'NETWORK', details: [] });
    xhr.onabort = () => reject({ reason: 'CANCELLED', details: [] });
    control?.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(data);
  });
}
