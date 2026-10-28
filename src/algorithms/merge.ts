import { mergeRanges } from './shared';
import type { AlgorithmDefinition, StepRecorder } from './types';

function mergeSortRange(r: StepRecorder, lo: number, hi: number): void {
  if (lo >= hi) return;
  const mid = (lo + hi) >>> 1;
  mergeSortRange(r, lo, mid);
  mergeSortRange(r, mid + 1, hi);
  mergeRanges(r, lo, mid, hi, lo === 0 && hi === r.length - 1);
}

export const mergeSort: AlgorithmDefinition = {
  id: 'merge',
  name: 'Merge Sort',
  family: 'divide-and-conquer',
  description:
    'Splits the list in half, sorts each half, then merges the two sorted halves by repeatedly taking the smaller front value. Stable and always O(n log n).',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
  sort(r) {
    mergeSortRange(r, 0, r.length - 1);
  },
};
