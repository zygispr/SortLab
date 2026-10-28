import { insertionSortRange, markRangeSorted } from './shared';
import type { AlgorithmDefinition } from './types';

export const bucketSort: AlgorithmDefinition = {
  id: 'bucket',
  name: 'Bucket Sort',
  family: 'non-comparison',
  description:
    'Spreads the values into √n buckets by where they fall in the range, writes them back bucket by bucket, then tidies each bucket with Insertion Sort.',
  complexity: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n²)', space: 'O(n + k)' },
  sort(r) {
    const values: number[] = [];
    for (let i = 0; i < r.length; i++) values.push(r.read(i));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = Math.ceil(Math.sqrt(r.length));
    const buckets: number[][] = Array.from({ length: count }, () => []);
    for (const v of values) {
      const index = max === min ? 0 : Math.floor(((v - min) / (max - min)) * count);
      buckets[Math.min(count - 1, index)]!.push(v);
    }

    const ranges: [number, number][] = [];
    let k = 0;
    for (const bucket of buckets) {
      const start = k;
      for (const v of bucket) r.write(k++, v);
      if (k > start) ranges.push([start, k - 1]);
    }
    for (const [lo, hi] of ranges) {
      insertionSortRange(r, lo, hi);
      markRangeSorted(r, lo, hi);
    }
  },
};
