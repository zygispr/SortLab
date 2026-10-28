import { heapSortRange, insertionSortRange, markRangeSorted, partition } from './shared';
import type { AlgorithmDefinition, StepRecorder } from './types';

const INSERTION_THRESHOLD = 16;

function introSortRange(r: StepRecorder, lo: number, hi: number, depth: number): void {
  while (hi - lo + 1 >= INSERTION_THRESHOLD) {
    if (depth === 0) {
      heapSortRange(r, lo, hi);
      return;
    }
    depth--;
    const p = partition(r, lo, hi);
    if (p - lo < hi - p) {
      introSortRange(r, lo, p - 1, depth);
      lo = p + 1;
    } else {
      introSortRange(r, p + 1, hi, depth);
      hi = p - 1;
    }
  }
  if (lo < hi) insertionSortRange(r, lo, hi);
  if (lo <= hi) markRangeSorted(r, lo, hi);
}

export const introSort: AlgorithmDefinition = {
  id: 'intro',
  name: 'Intro Sort',
  family: 'hybrid',
  description:
    'Quick Sort that switches to Heap Sort when recursion gets too deep (2·log₂ n) and to Insertion Sort for ranges under 16 values, so it is fast on average and never O(n²).',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(log n)' },
  sort(r) {
    introSortRange(r, 0, r.length - 1, 2 * Math.floor(Math.log2(r.length)));
  },
};
