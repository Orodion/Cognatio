import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shows long lists step by step: first `pageSize` entries, more as soon as the end of the list
 * becomes visible (IntersectionObserver) or via `showMore`. `resetKey` resets to the first page
 * (e.g. for a new search).
 */
export function useIncrementalList<T>(items: T[], pageSize = 60, resetKey?: unknown) {
  const [limit, setLimit] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setLimit(pageSize), [resetKey, pageSize]);

  const showMore = useCallback(() => setLimit((l) => l + pageSize), [pageSize]);
  const hasMore = items.length > limit;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          showMore();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, showMore, limit]);

  return { visible: hasMore ? items.slice(0, limit) : items, hasMore, showMore, sentinelRef, remaining: Math.max(0, items.length - limit) };
}
