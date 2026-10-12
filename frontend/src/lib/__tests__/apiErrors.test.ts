import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { apiErrorMessage, apiErrorReason } from '../apiErrors';

const t = ((key: string, opts?: { defaultValue?: string }) =>
  key === 'apiErrors.DUPLICATE' ? 'Duplikat' : (opts?.defaultValue ?? key)) as unknown as TFunction;

describe('apiErrorMessage', () => {
  it('translates the reason code from the GraphQL error', () => {
    const err = { graphQLErrors: [{ extensions: { reason: 'DUPLICATE' } }] };
    expect(apiErrorReason(err)).toBe('DUPLICATE');
    expect(apiErrorMessage(err, t)).toBe('Duplikat');
  });

  it('falls back for unknown reasons, network errors and plain errors', () => {
    expect(apiErrorMessage({ graphQLErrors: [{ extensions: { reason: 'NEU' } }] }, t)).toBe('apiErrors.UNKNOWN');
    expect(apiErrorMessage({ graphQLErrors: [], networkError: new Error('x') }, t)).toBe('apiErrors.NETWORK');
    expect(apiErrorMessage(new Error('boom'), t)).toBe('apiErrors.UNKNOWN');
  });
});
