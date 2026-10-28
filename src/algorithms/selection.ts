import type { AlgorithmDefinition } from './types';

export const selectionSort: AlgorithmDefinition = {
  id: 'selection',
  name: 'Selection Sort',
  family: 'selection',
  description:
    'Scans the unsorted part for its smallest value and swaps it into the next position, growing a sorted prefix by one value per pass.',
  complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    const n = r.length;
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      for (let j = i + 1; j < n; j++) {
        if (r.compare(j, min) < 0) min = j;
      }
      if (min !== i) r.swap(i, min);
      r.markSorted(i);
    }
    r.markSorted(n - 1);
  },
};
