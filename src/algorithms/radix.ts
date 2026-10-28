import type { Support, DatasetFacts, StepRecorder } from './types';

/** Shared data requirement of both Radix sorts (FR-009a). */
export function supportsRadix(facts: DatasetFacts): Support {
  if (!facts.isWholeNumbers) return { ok: false, reason: 'Needs whole numbers' };
  if (!facts.isNonNegative) return { ok: false, reason: 'Needs non-negative numbers' };
  return { ok: true };
}

/** Reads every value once (recorded) and returns the largest, which sets the digit count. */
export function readMax(r: StepRecorder): number {
  let max = 0;
  for (let i = 0; i < r.length; i++) max = Math.max(max, r.read(i));
  return max;
}

/** Base-10 digit of `value` at place `exp` (1, 10, 100, …). */
function digitAt(value: number, exp: number): number {
  return Math.floor(value / exp) % 10;
}

/**
 * Reads every value in `lo … hi` (one digit inspection each), then writes them back
 * grouped by their digit at `exp`, stably. Returns the start index of each digit's group
 * (11 entries; the last is `hi + 1`). `markFinal` marks written positions sorted.
 */
export function distributeByDigit(
  r: StepRecorder,
  lo: number,
  hi: number,
  exp: number,
  markFinal: boolean,
): number[] {
  const buckets: number[][] = Array.from({ length: 10 }, () => []);
  for (let i = lo; i <= hi; i++) {
    const v = r.read(i);
    buckets[digitAt(v, exp)]!.push(v);
  }
  const starts: number[] = [];
  let k = lo;
  for (const bucket of buckets) {
    starts.push(k);
    for (const v of bucket) {
      r.write(k, v);
      if (markFinal) r.markSorted(k);
      k++;
    }
  }
  starts.push(k);
  return starts;
}
