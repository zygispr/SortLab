import type { AlgorithmDefinition, StepRecorder } from './types';

/** Reverses the prefix `0 … k`, recorded as the swaps that make up the flip. */
function flip(r: StepRecorder, k: number): void {
  for (let i = 0, j = k; i < j; i++, j--) r.swap(i, j);
}

export const pancakeSort: AlgorithmDefinition = {
  id: 'pancake',
  name: 'Pancake Sort',
  family: 'selection',
  description:
    'Can only reverse a prefix of the list, like flipping a stack of pancakes: it flips the largest unsorted value to the top, then flips it down into place.',
  complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    for (let size = r.length; size > 1; size--) {
      let max = 0;
      for (let i = 1; i < size; i++) {
        if (r.compare(i, max) > 0) max = i;
      }
      if (max !== size - 1) {
        if (max !== 0) flip(r, max);
        flip(r, size - 1);
      }
      r.markSorted(size - 1);
    }
    r.markSorted(0);
  },
};
