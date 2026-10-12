import type { TFunction } from 'i18next';

type ErrorLike = {
  graphQLErrors?: ReadonlyArray<{ extensions?: Record<string, unknown> }>;
  networkError?: unknown;
};

/** Machine-readable error code (`extensions.reason`) from an Apollo/GraphQL error. */
export function apiErrorReason(err: unknown): string | undefined {
  const reason = (err as ErrorLike | null)?.graphQLErrors?.[0]?.extensions?.reason;
  return typeof reason === 'string' ? reason : undefined;
}

/**
 * Translated error message for the UI. The backend returns plain-text messages (for logs)
 * plus a code `reason`, which is translated here into the current language via `apiErrors.<reason>`.
 */
export function apiErrorMessage(err: unknown, t: TFunction, reason = apiErrorReason(err)): string {
  if (reason) {
    return t(`apiErrors.${reason}`, { defaultValue: t('apiErrors.UNKNOWN') });
  }
  if ((err as ErrorLike | null)?.networkError) {
    return t('apiErrors.NETWORK');
  }
  return t('apiErrors.UNKNOWN');
}
