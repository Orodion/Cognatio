import { useEffect, useState } from 'react';

/** Value that is only taken over once it has not changed for `delay` ms (e.g. while typing) */
export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
