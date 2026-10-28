import { markAllSorted } from './shared';
import type { AlgorithmDefinition } from './types';

const CIURA_GAPS = [1, 4, 10, 23, 57, 132, 301, 701];
const GAP_GROWTH = 2.25;

/** Ciura's gaps, extended by ×2.25, keeping only gaps smaller than `n`, largest first. */
function gapsFor(n: number): number[] {
  const gaps = [...CIURA_GAPS];
  while (gaps[gaps.length - 1]! * GAP_GROWTH < n) {
    gaps.push(Math.floor(gaps[gaps.length - 1]! * GAP_GROWTH));
  }
  return gaps.filter((g) => g < n).reverse();
}

export const shellSort: AlgorithmDefinition = {
  id: 'shell',
  name: 'Shell Sort',
  family: 'insertion',
  description:
    'Runs Insertion Sort on values a gap apart, shrinking the gap (Ciura’s sequence) down to 1, so values travel long distances early and the final pass has little left to do.',
  complexity: { best: 'O(n log n)', average: '≈ O(n^1.3)', worst: 'O(n²)', space: 'O(1)' },
  sort(r) {
    for (const gap of gapsFor(r.length)) {
      for (let i = gap; i < r.length; i++) {
        const key = r.read(i);
        let j = i;
        let v: number;
        while (j >= gap && (v = r.read(j - gap)) > key) {
          r.write(j, v);
          j -= gap;
        }
        if (j !== i) r.write(j, key);
      }
    }
    markAllSorted(r);
  },
};
