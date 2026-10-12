import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIncrementalList } from '../useIncrementalList';

const items = Array.from({ length: 130 }, (_, i) => i);

describe('useIncrementalList', () => {
  it('shows the first page and more on request', () => {
    const { result } = renderHook(() => useIncrementalList(items, 60));
    expect(result.current.visible).toHaveLength(60);
    expect(result.current.remaining).toBe(70);

    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(120);
    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(130);
    expect(result.current.hasMore).toBe(false);
  });

  it('starts over when the reset key changes (e.g. a new search)', () => {
    const { result, rerender } = renderHook(({ key }) => useIncrementalList(items, 60, key), { initialProps: { key: 'a' } });
    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(120);
    rerender({ key: 'b' });
    expect(result.current.visible).toHaveLength(60);
  });

  it('returns short lists unchanged', () => {
    const { result } = renderHook(() => useIncrementalList([1, 2, 3], 60));
    expect(result.current.visible).toEqual([1, 2, 3]);
    expect(result.current.hasMore).toBe(false);
  });
});
