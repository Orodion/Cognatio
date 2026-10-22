import { vi } from 'vitest';

/** One request the fake XMLHttpRequest received */
export interface SentRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: FormData;
}

type Answer = { status: number; body?: unknown } | 'network-error';

/**
 * Replaces XMLHttpRequest (uploads with progress): every request is answered by `answer`, after reporting the whole
 * body as uploaded. A request stays open while `hold` is set – then `abort()` (cancelling) ends it.
 */
export function stubXhr(answer: Answer | ((request: SentRequest) => Answer), options: { hold?: boolean } = {}) {
  const sent: SentRequest[] = [];
  class FakeXhr {
    status = 0;
    responseText = '';
    upload: { onprogress?: (e: { loaded: number; total: number; lengthComputable: boolean }) => void } = {};
    onload?: () => void;
    onerror?: () => void;
    onabort?: () => void;
    private request: SentRequest = { method: '', url: '', headers: {}, body: new FormData() };
    open(method: string, url: string) {
      this.request = { ...this.request, method, url };
    }
    setRequestHeader(name: string, value: string) {
      this.request.headers[name] = value;
    }
    abort() {
      setTimeout(() => this.onabort?.(), 0);
    }
    send(body: FormData) {
      this.request.body = body;
      sent.push(this.request);
      this.upload.onprogress?.({ loaded: 3, total: 3, lengthComputable: true });
      if (options.hold) {
        return;
      }
      const result = typeof answer === 'function' ? answer(this.request) : answer;
      setTimeout(() => {
        if (result === 'network-error') {
          this.onerror?.();
          return;
        }
        this.status = result.status;
        this.responseText = result.body === undefined ? '' : JSON.stringify(result.body);
        this.onload?.();
      }, 0);
    }
  }
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  return sent;
}
