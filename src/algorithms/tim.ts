import { binaryInsertionSortRange, markAllSorted, mergeRanges } from './shared';
import type { AlgorithmDefinition, StepRecorder } from './types';

const MIN_RUN = 32;

interface Run {
  base: number;
  length: number;
}

/**
 * Length of the natural run starting at `lo`. A strictly descending run is reversed in
 * place (strictness keeps equal values in order, so the sort stays stable).
 */
function countRun(r: StepRecorder, lo: number): number {
  let hi = lo + 1;
  if (hi === r.length) return 1;
  if (r.compare(hi, lo) < 0) {
    while (hi + 1 < r.length && r.compare(hi + 1, hi) < 0) hi++;
    for (let i = lo, j = hi; i < j; i++, j--) r.swap(i, j);
  } else {
    while (hi + 1 < r.length && r.compare(hi + 1, hi) >= 0) hi++;
  }
  return hi - lo + 1;
}

function mergeAt(r: StepRecorder, stack: Run[], i: number): void {
  const a = stack[i]!;
  const b = stack[i + 1]!;
  const hi = b.base + b.length - 1;
  mergeRanges(r, a.base, a.base + a.length - 1, hi, a.base === 0 && hi === r.length - 1);
  stack.splice(i, 2, { base: a.base, length: a.length + b.length });
}

/** Merges until the run-length invariants hold (|Z| > |Y| + |X| and |Y| > |X|). */
function mergeCollapse(r: StepRecorder, stack: Run[]): void {
  while (stack.length > 1) {
    let n = stack.length - 2;
    const len = (i: number) => stack[i]!.length;
    if (
      (n > 0 && len(n - 1) <= len(n) + len(n + 1)) ||
      (n > 1 && len(n - 2) <= len(n - 1) + len(n))
    ) {
      if (len(n - 1) < len(n + 1)) n--;
      mergeAt(r, stack, n);
    } else if (len(n) <= len(n + 1)) {
      mergeAt(r, stack, n);
    } else {
      return;
    }
  }
}

export const timSort: AlgorithmDefinition = {
  id: 'tim',
  name: 'Tim Sort',
  family: 'hybrid',
  description:
    'Finds already-ordered runs, extends short ones to 32 values with Binary Insertion Sort, and merges runs from a stack so their sizes stay balanced. Simplified teaching version without galloping mode.',
  complexity: { best: 'O(n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
  sort(r) {
    const stack: Run[] = [];
    let lo = 0;
    while (lo < r.length) {
      let length = countRun(r, lo);
      if (length < MIN_RUN) {
        const forced = Math.min(MIN_RUN, r.length - lo);
        binaryInsertionSortRange(r, lo, lo + forced - 1, lo + length);
        length = forced;
      }
      stack.push({ base: lo, length });
      mergeCollapse(r, stack);
      lo += length;
    }
    while (stack.length > 1) {
      let n = stack.length - 2;
      if (n > 0 && stack[n - 1]!.length < stack[n + 1]!.length) n--;
      mergeAt(r, stack, n);
    }
    markAllSorted(r);
  },
};
