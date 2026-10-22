/** "500 MB", "2 GB", "1.5 GB" */
export function formatMb(mb: number): string {
  return mb >= 1024 ? `${Number((mb / 1024).toFixed(1))} GB` : `${mb} MB`;
}

/** Bytes for a progress display: "12 MB", "3.4 GB" (at least 1 MB) */
export const formatBytes = (bytes: number) => formatMb(Math.max(1, Math.round(bytes / (1024 * 1024))));
