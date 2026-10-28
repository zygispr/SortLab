import { markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

export const bubbleSort: AlgorithmDefinition = {
  id: 'bubble',
  name: 'Bubble Sort',
  family: 'exchange',
  description:
    'Repeatedly walks the list, swapping neighbours that are out of order, so the largest remaining value bubbles to the end of each pass. Stops early once a pass makes no swaps.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    for (let end = r.length - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        if (r.compare(i, i + 1) > 0) {
          r.swap(i, i + 1);
          swapped = true;
        }
      }
      r.markSorted(end);
      if (!swapped) break;
    }
    markAllSorted(r);
  },
};
