import { markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

export const cocktailShakerSort: AlgorithmDefinition = {
  id: 'cocktail-shaker',
  name: 'Cocktail Shaker Sort',
  family: 'exchange',
  description:
    'A two-way Bubble Sort: passes alternate left-to-right and right-to-left, so large values sink to the end and small values rise to the front in the same round.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    let start = 0;
    let end = r.length - 1;
    while (start < end) {
      let swapped = false;
      for (let i = start; i < end; i++) {
        if (r.compare(i, i + 1) > 0) {
          r.swap(i, i + 1);
          swapped = true;
        }
      }
      r.markSorted(end--);
      if (!swapped) break;

      swapped = false;
      for (let i = end; i > start; i--) {
        if (r.compare(i - 1, i) > 0) {
          r.swap(i - 1, i);
          swapped = true;
        }
      }
      r.markSorted(start++);
      if (!swapped) break;
    }
    markAllSorted(r);
  },
};
