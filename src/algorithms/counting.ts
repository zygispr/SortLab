import type { AlgorithmDefinition } from './types';

const MAX_RANGE = 10_000;

export const countingSort: AlgorithmDefinition = {
  id: 'counting',
  name: 'Counting Sort',
  family: 'non-comparison',
  description:
    'Reads every value once to count how often each one occurs, then writes the values back in order from the counts. Works for whole numbers with a limited range.',
  complexity: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)', space: 'O(k)' },
  supports(facts) {
    if (!facts.isWholeNumbers) return { ok: false, reason: 'Needs whole numbers' };
    if (facts.max - facts.min > MAX_RANGE) {
      return { ok: false, reason: 'Range too wide (over 10,000)' };
    }
    return { ok: true };
  },
  sort(r) {
    const seen: number[] = [];
    for (let i = 0; i < r.length; i++) seen.push(r.read(i));
    const min = Math.min(...seen);
    const counts = new Array<number>(Math.max(...seen) - min + 1).fill(0);
    for (const v of seen) counts[v - min]!++;

    let k = 0;
    counts.forEach((count, offset) => {
      for (let c = 0; c < count; c++) {
        r.write(k, offset + min);
        r.markSorted(k++);
      }
    });
  },
};
