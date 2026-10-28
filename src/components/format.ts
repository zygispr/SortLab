/** Elapsed time as seconds with one decimal, e.g. 2345 → "2.3 s". */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}
