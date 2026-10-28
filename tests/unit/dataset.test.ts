import { createDataset, toFacts } from '../../src/dataset/facts';
import {
  clampDatasetSize,
  DEFAULT_SIZE,
  MAX_SIZE,
  MIN_SIZE,
  randomLabel,
  randomValues,
  SIZE_STEP,
} from '../../src/dataset/random';

/** Small deterministic RNG (mulberry32) so tests can check reproducibility. */
function seeded(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

describe('createDataset', () => {
  it.each([
    ['integers', [3, 1, 2], { min: 1, max: 3, isWholeNumbers: true, isNonNegative: true }],
    ['negatives', [-5, 0, 7], { min: -5, max: 7, isWholeNumbers: true, isNonNegative: false }],
    ['decimals', [0.5, 2, 1.25], { min: 0.5, max: 2, isWholeNumbers: false, isNonNegative: true }],
    ['all equal', [4, 4, 4], { min: 4, max: 4, isWholeNumbers: true, isNonNegative: true }],
  ])('computes facts for %s', (_name, values, facts) => {
    expect(createDataset(values, 'paste', 'test', 1)).toMatchObject(facts);
  });

  it('keeps the input order in a frozen copy', () => {
    const values = [3, 1, 2];
    const d = createDataset(values, 'upload', 'file.csv', 7);
    values[0] = 99;
    expect(d.original).toEqual([3, 1, 2]);
    expect(Object.isFrozen(d.original)).toBe(true);
    expect(d).toMatchObject({ id: 7, source: 'upload', label: 'file.csv' });
  });

  it.each([
    ['fewer than 2 values', [1]],
    ['more than 1,000 values', Array.from({ length: 1001 }, () => 1)],
    ['a non-finite value', [1, Number.POSITIVE_INFINITY]],
    ['NaN', [1, Number.NaN]],
  ])('throws RangeError for %s', (_name, values) => {
    expect(() => createDataset(values, 'paste', 'x', 1)).toThrow(RangeError);
  });

  it('toFacts() returns the DatasetFacts subset', () => {
    const d = createDataset([-1.5, 2], 'paste', 'x', 1);
    expect(toFacts(d)).toEqual({
      length: 2,
      min: -1.5,
      max: 2,
      isWholeNumbers: false,
      isNonNegative: false,
    });
  });
});

describe('randomValues', () => {
  it.each([10, 50, 1000])('returns %i whole numbers between 1 and 1,000', (n) => {
    const values = randomValues(n, seeded(n));
    expect(values).toHaveLength(n);
    for (const v of values) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(1000);
    }
  });

  it('spreads values evenly across the range', () => {
    const sorted = [...randomValues(10, seeded(1))].sort((a, b) => a - b);
    expect(sorted).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
    const all = [...randomValues(1000, seeded(2))].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 1000 }, (_, i) => i + 1));
  });

  it('is deterministic for the same RNG and shuffles the order', () => {
    expect(randomValues(50, seeded(42))).toEqual(randomValues(50, seeded(42)));
    expect(randomValues(50, seeded(42))).not.toEqual(randomValues(50, seeded(43)));
    const values = randomValues(50, seeded(42));
    expect(values).not.toEqual([...values].sort((a, b) => a - b));
  });

  it('labels random datasets with their size', () => {
    expect(randomLabel(50)).toBe('Random · 50 values');
  });
});

describe('dataset size limits', () => {
  it('exposes the FR-002 limits', () => {
    expect([MIN_SIZE, MAX_SIZE, DEFAULT_SIZE, SIZE_STEP]).toEqual([10, 1000, 50, 10]);
  });

  it.each([
    [5, 10],
    [10, 10],
    [54, 50],
    [55, 60],
    [999, 1000],
    [5000, 1000],
    [Number.NaN, 50],
  ])('clampDatasetSize(%d) → %d', (input, expected) => {
    expect(clampDatasetSize(input)).toBe(expected);
  });
});
