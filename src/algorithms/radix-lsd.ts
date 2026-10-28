import { distributeByDigit, readMax, supportsRadix } from './radix';
import type { AlgorithmDefinition } from './types';

export const radixLsdSort: AlgorithmDefinition = {
  id: 'radix-lsd',
  name: 'Radix Sort (LSD)',
  family: 'non-comparison',
  description:
    'Groups the values by their last digit, then by the tens digit, and so on, keeping earlier order within each group, until every digit has been used. Needs non-negative whole numbers.',
  complexity: { best: 'O(d·n)', average: 'O(d·n)', worst: 'O(d·n)', space: 'O(n)' },
  supports: supportsRadix,
  sort(r) {
    const max = readMax(r);
    let digits = 1;
    while (10 ** digits <= max) digits++;
    for (let d = 0, exp = 1; d < digits; d++, exp *= 10) {
      distributeByDigit(r, 0, r.length - 1, exp, d === digits - 1);
    }
  },
};
