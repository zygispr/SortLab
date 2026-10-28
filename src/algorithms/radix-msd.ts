import { markRangeSorted } from './shared';
import { distributeByDigit, readMax, supportsRadix } from './radix';
import type { AlgorithmDefinition, StepRecorder } from './types';

function msd(r: StepRecorder, lo: number, hi: number, exp: number): void {
  if (hi <= lo || exp < 1) {
    markRangeSorted(r, lo, hi);
    return;
  }
  const starts = distributeByDigit(r, lo, hi, exp, exp === 1);
  for (let d = 0; d < 10; d++) msd(r, starts[d]!, starts[d + 1]! - 1, exp / 10);
}

export const radixMsdSort: AlgorithmDefinition = {
  id: 'radix-msd',
  name: 'Radix Sort (MSD)',
  family: 'non-comparison',
  description:
    'Groups the values by their first (most significant) digit, then sorts each group by the next digit on its own, recursively. Needs non-negative whole numbers.',
  complexity: { best: 'O(d·n)', average: 'O(d·n)', worst: 'O(d·n)', space: 'O(n)' },
  supports: supportsRadix,
  sort(r) {
    const max = readMax(r);
    let exp = 1;
    while (exp * 10 <= max) exp *= 10;
    msd(r, 0, r.length - 1, exp);
  },
};
