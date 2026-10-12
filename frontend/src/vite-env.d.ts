/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address of the backend if it does not run under the same address as the page (see lib/platform.ts) */
  readonly VITE_API_BASE?: string;
}

/** Version of the application, set in vite.config.ts */
declare const __APP_VERSION__: string;
