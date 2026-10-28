import { markAllSorted } from './shared';
import type { AlgorithmDefinition, StepRecorder } from './types';

/** Final index of `item` within `start … n − 1`: start plus the count of smaller values. */
function positionOf(r: StepRecorder, item: number, start: number): number {
  let pos = start;
  for (let i = start + 1; i < r.length; i++) if (r.read(i) < item) pos++;
  return pos;
}

/** Skips past values equal to `item` so duplicates keep distinct slots. */
function skipEqual(r: StepRecorder, item: number, pos: number): number {
  while (r.read(pos) === item) pos++;
  return pos;
}

export const cycleSort: AlgorithmDefinition = {
  id: 'cycle',
  name: 'Cycle Sort',
  family: 'selection',
  description:
    'Counts how many values are smaller than each item to find its exact final position, then rotates items around that cycle. Writes each value at most once.',
  complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    for (let start = 0; start < r.length - 1; start++) {
      let item = r.read(start);
      let pos = positionOf(r, item, start);
      if (pos === start) {
        r.markSorted(start);
        continue;
      }
      pos = skipEqual(r, item, pos);
      let displaced = r.values[pos]!;
      r.write(pos, item);
      r.markSorted(pos);
      item = displaced;

      while (pos !== start) {
        pos = positionOf(r, item, start);
        if (pos !== start) pos = skipEqual(r, item, pos);
        displaced = r.values[pos]!;
        r.write(pos, item);
        r.markSorted(pos);
        item = displaced;
      }
    }
    markAllSorted(r);
  },
};
