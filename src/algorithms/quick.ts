import { partition, sortTiny } from './shared';
import type { AlgorithmDefinition, StepRecorder } from './types';

/** Recurses into the smaller side and loops on the larger, keeping the stack O(log n). */
function quickSortRange(r: StepRecorder, lo: number, hi: number): void {
  while (hi - lo >= 2) {
    const p = partition(r, lo, hi);
    if (p - lo < hi - p) {
      quickSortRange(r, lo, p - 1);
      lo = p + 1;
    } else {
      quickSortRange(r, p + 1, hi);
      hi = p - 1;
    }
  }
  if (lo <= hi) sortTiny(r, lo, hi);
}

export const quickSort: AlgorithmDefinition = {
  id: 'quick',
  name: 'Quick Sort',
  family: 'divide-and-conquer',
  description:
    'Picks a pivot (median of first, middle, and last), moves smaller values before it and the rest after it, then sorts each side the same way.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
  sort(r) {
    quickSortRange(r, 0, r.length - 1);
  },
};
