/**
 * The entered gigabytes as whole megabytes; null for an empty field (no limit), undefined if it is not a number in the
 * allowed range.
 */
export function gbToMb(gb: string, limits: { minMb: number; maxMb: number }): number | null | undefined {
  if (gb.trim() === '') {
    return null;
  }
  const mb = Math.round(Number(gb.replace(',', '.')) * 1024);
  return Number.isFinite(mb) && mb >= limits.minMb && mb <= limits.maxMb ? mb : undefined;
}

/** Megabytes as gigabytes for the input field ("2", "1.5"); empty without a limit */
export const mbToGb = (mb: number | null) => (mb === null ? '' : String(Number((mb / 1024).toFixed(2))));
