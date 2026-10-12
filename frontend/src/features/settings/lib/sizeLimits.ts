/** Above this size (MB) a file needs much memory: the settings warn about it */
export const MEMORY_WARNING_MB = 4096;

/** The entered gigabytes as whole megabytes; null if it is not a number in the allowed range */
export function gbToMb(gb: string, limits: { minMb: number; maxMb: number }): number | null {
  const mb = Math.round(Number(gb.replace(',', '.')) * 1024);
  return gb.trim() !== '' && Number.isFinite(mb) && mb >= limits.minMb && mb <= limits.maxMb ? mb : null;
}

/** Megabytes as gigabytes for the input field ("2", "1.5") */
export const mbToGb = (mb: number) => String(Number((mb / 1024).toFixed(2)));
