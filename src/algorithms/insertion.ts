import { insertionSortRange, markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

export const insertionSort: AlgorithmDefinition = {
  id: 'insertion',
  name: 'Insertion Sort',
  family: 'insertion',
  description:
    'Takes each value in turn and shifts larger values in the sorted prefix one place right until the value fits, like sorting a hand of cards.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    insertionSortRange(r, 0, r.length - 1);
    markAllSorted(r);
  },
};
