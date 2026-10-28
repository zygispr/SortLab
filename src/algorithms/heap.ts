import { heapSortRange } from './shared';
import type { AlgorithmDefinition } from './types';

export const heapSort: AlgorithmDefinition = {
  id: 'heap',
  name: 'Heap Sort',
  family: 'selection',
  description:
    'Arranges the values into a max-heap, then repeatedly swaps the largest value to the end and restores the heap in the remaining part.',
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
  sort(r) {
    heapSortRange(r, 0, r.length - 1);
  },
};
