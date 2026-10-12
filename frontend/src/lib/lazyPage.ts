import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'cognatio-chunk-reload';

/**
 * Loads a page only when it is first opened (separate file in the build).
 * After an update a still open old page may request files that no longer exist –
 * then reload once instead of showing an error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- beliebige Seiten-Props
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<T>, reload = () => window.location.reload()) {
  return lazy(async () => {
    try {
      const component = await load();
      safeStorage(() => sessionStorage.removeItem(RELOAD_KEY));
      return { default: component };
    } catch (err) {
      if (!safeStorage(() => sessionStorage.getItem(RELOAD_KEY))) {
        safeStorage(() => sessionStorage.setItem(RELOAD_KEY, '1'));
        reload();
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}

function safeStorage<T>(action: () => T): T | undefined {
  try {
    return action();
  } catch {
    return undefined;
  }
}
