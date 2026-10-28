import { binaryInsertionSortRange, markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

export const binaryInsertionSort: AlgorithmDefinition = {
  id: 'binary-insertion',
  name: 'Binary Insertion Sort',
  family: 'insertion',
  description:
    'Insertion Sort that finds each value’s place in the sorted prefix by binary search, so it needs far fewer comparisons; the shifting work stays the same.',
  complexity: { best: 'O(n log n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    binaryInsertionSortRange(r, 0, r.length - 1);
    markAllSorted(r);
  },
};
