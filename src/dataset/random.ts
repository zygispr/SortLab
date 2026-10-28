/** Random dataset size limits and default (FR-002). */
export const MIN_SIZE = 10;
export const MAX_SIZE = 1000;
export const DEFAULT_SIZE = 50;
export const SIZE_STEP = 10;

const MAX_VALUE = 1000;

/**
 * Returns `size` whole numbers spread evenly from MAX_VALUE / size up to 1,000, in fully
 * random order (Fisher–Yates with `rng`). Even spacing gives distinct bar heights that
 * form a clean staircase once sorted. `size` must be 1–1,000.
 */
export function randomValues(size: number, rng: () => number = Math.random): number[] {
  const values = Array.from({ length: size }, (_, i) => Math.round(((i + 1) * MAX_VALUE) / size));
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = values[i]!;
    values[i] = values[j]!;
    values[j] = t;
  }
  return values;
}

/** Label shown for a random dataset, e.g. "Random · 50 values". */
export function randomLabel(size: number): string {
  return `Random · ${String(size)} values`;
}

/** Rounds `size` to the nearest step of 10 within 10–1,000; NaN gives the default. */
export function clampDatasetSize(size: number): number {
  if (Number.isNaN(size)) return DEFAULT_SIZE;
  const stepped = Math.round(size / SIZE_STEP) * SIZE_STEP;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, stepped));
}
