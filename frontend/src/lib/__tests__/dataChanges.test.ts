import { describe, expect, it, vi } from 'vitest';
import { ApolloLink, Observable, execute, gql } from '@apollo/client';
import { dataChangeLink, notifyDataChange, onDataChange } from '@/lib/dataChanges';

const answer = new ApolloLink(() => Observable.of({ data: { ok: true } }));
const link = ApolloLink.from([dataChangeLink, answer]);

const run = (query: ReturnType<typeof gql>) =>
  new Promise<void>((resolve, reject) => {
    execute(link, { query }).subscribe({ complete: resolve, error: reject });
  });

describe('dataChanges', () => {
  it('reports a finished mutation, not a query', async () => {
    const listener = vi.fn();
    const stop = onDataChange(listener);

    await run(gql`
      query Q {
        ok
      }
    `);
    expect(listener).not.toHaveBeenCalled();

    await run(gql`
      mutation M {
        ok
      }
    `);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops calling a listener that was ended', () => {
    const listener = vi.fn();
    const stop = onDataChange(listener);
    notifyDataChange();
    stop();
    notifyDataChange();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
