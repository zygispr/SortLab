import { markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

export const gnomeSort: AlgorithmDefinition = {
  id: 'gnome',
  name: 'Gnome Sort',
  family: 'exchange',
  description:
    'Walks forward while neighbours are in order; when it finds a pair out of order it swaps them and steps back, carrying the smaller value down to its place.',
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    let i = 0;
    while (i < r.length) {
      if (i === 0 || r.compare(i - 1, i) <= 0) {
        i++;
      } else {
        r.swap(i - 1, i);
        i--;
      }
    }
    markAllSorted(r);
  },
};
