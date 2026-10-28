import { markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

const SHRINK_FACTOR = 1.3;

export const combSort: AlgorithmDefinition = {
  id: 'comb',
  name: 'Comb Sort',
  family: 'exchange',
  description:
    'Like Bubble Sort, but first compares values far apart and shrinks the gap by 1.3 each pass, so small values near the end move forward quickly. Finishes with a gap of 1.',
  complexity: { best: 'O(n log n)', average: 'O(n²/2ᵖ)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    let gap = r.length;
    let sorted = false;
    while (!sorted) {
      gap = Math.floor(gap / SHRINK_FACTOR);
      if (gap <= 1) {
        gap = 1;
        sorted = true;
      }
      for (let i = 0; i + gap < r.length; i++) {
        if (r.compare(i, i + gap) > 0) {
          r.swap(i, i + gap);
          sorted = false;
        }
      }
    }
    markAllSorted(r);
  },
};
