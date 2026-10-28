import { markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

export const oddEvenSort: AlgorithmDefinition = {
  id: 'odd-even',
  name: 'Odd-Even Sort',
  family: 'exchange',
  description:
    'Alternates between comparing every odd-indexed pair and every even-indexed pair of neighbours, swapping those out of order, until a full round makes no swaps.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    let sorted = false;
    while (!sorted) {
      sorted = true;
      for (const first of [1, 0]) {
        for (let i = first; i + 1 < r.length; i += 2) {
          if (r.compare(i, i + 1) > 0) {
            r.swap(i, i + 1);
            sorted = false;
          }
        }
      }
    }
    markAllSorted(r);
  },
};
