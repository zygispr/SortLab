import {
  ALGORITHMS,
  checkSupport,
  FAMILY_LABELS,
  getAlgorithm,
  runAlgorithm,
} from '../../src/algorithms/registry';
import { createDataset, toFacts } from '../../src/dataset/facts';
import { randomValues } from '../../src/dataset/random';
import { applyStep, undoStep } from '../../src/engine/stepBuffer';
import { seeded, shuffled } from '../seeded';

/** FR-013: the longest run must finish in under 30 s at 60,000 steps per second. */
const MAX_STEPS = 1_800_000;

const FR_009_ORDER = [
  'bubble',
  'cocktail-shaker',
  'odd-even',
  'comb',
  'gnome',
  'selection',
  'cycle',
  'heap',
  'pancake',
  'insertion',
  'binary-insertion',
  'shell',
  'merge',
  'quick',
  'tim',
  'intro',
  'counting',
  'radix-lsd',
  'radix-msd',
  'bucket',
];

function inputsFor(id: string): [string, number[]][] {
  const rng = seeded(1234);
  const def = getAlgorithm(id);
  const inputs: [string, number[]][] = [
    ['two values', [2, 1]],
    ['all equal', Array.from({ length: 50 }, () => 7)],
    ['many duplicates', Array.from({ length: 1000 }, () => 1 + Math.floor(rng() * 10))],
    ['already sorted', Array.from({ length: 1000 }, (_, i) => i + 1)],
    ['reverse sorted', Array.from({ length: 1000 }, (_, i) => 1000 - i)],
    ['1,000 random', Array.from({ length: 1000 }, () => 1 + Math.floor(rng() * 1000))],
    ['random dataset', randomValues(1000, rng)],
  ];
  if (!def.supports) {
    inputs.push([
      'negatives with decimals',
      Array.from({ length: 300 }, () => Math.round((rng() * 1000 - 500) * 100) / 100),
    ]);
  }
  if (!id.startsWith('radix')) {
    inputs.push([
      'negative whole numbers',
      shuffled(
        Array.from({ length: 101 }, (_, i) => i - 50),
        rng,
      ),
    ]);
  }
  return inputs;
}

function isNonDecreasing(values: ArrayLike<number>): boolean {
  for (let i = 1; i < values.length; i++) if (values[i - 1]! > values[i]!) return false;
  return true;
}

describe('algorithm catalog', () => {
  it('offers the 20 algorithms of FR-009 in picker order', () => {
    expect(ALGORITHMS.map((a) => a.id)).toEqual(FR_009_ORDER);
  });

  it('uses unique kebab-case ids and complete metadata', () => {
    expect(new Set(ALGORITHMS.map((a) => a.id)).size).toBe(20);
    for (const a of ALGORITHMS) {
      expect(a.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(a.name).not.toBe('');
      expect(FAMILY_LABELS[a.family]).toBeDefined();
      expect(a.description.length).toBeGreaterThan(20);
      expect(a.complexity.best && a.complexity.average && a.complexity.worst).toBeTruthy();
      expect(a.complexity.space).toBeTruthy();
    }
  });

  it('getAlgorithm() throws for an unknown id', () => {
    expect(() => getAlgorithm('bogo')).toThrow(/bogo/);
  });
});

describe('data requirements (FR-009a)', () => {
  const facts = (values: number[]) => toFacts(createDataset(values, 'paste', 'x', 1));

  it('supports every algorithm for any random dataset', () => {
    for (const size of [10, 50, 1000]) {
      const f = facts(randomValues(size, seeded(size)));
      for (const a of ALGORITHMS) expect(checkSupport(a, f)).toEqual({ ok: true });
    }
  });

  it('Counting Sort needs whole numbers and a range of at most 10,000', () => {
    const counting = getAlgorithm('counting');
    expect(checkSupport(counting, facts([1.5, 2]))).toEqual({
      ok: false,
      reason: 'Needs whole numbers',
    });
    expect(checkSupport(counting, facts([0, 10_001]))).toEqual({
      ok: false,
      reason: 'Range too wide (over 10,000)',
    });
    expect(checkSupport(counting, facts([-5_000, 5_000]))).toEqual({ ok: true });
  });

  it.each(['radix-lsd', 'radix-msd'])('%s needs non-negative whole numbers', (id) => {
    const radix = getAlgorithm(id);
    expect(checkSupport(radix, facts([1.5, 2]))).toEqual({
      ok: false,
      reason: 'Needs whole numbers',
    });
    expect(checkSupport(radix, facts([-1, 2]))).toEqual({
      ok: false,
      reason: 'Needs non-negative numbers',
    });
    expect(checkSupport(radix, facts([0, 99_999]))).toEqual({ ok: true });
  });

  it('every other algorithm accepts negatives and decimals', () => {
    const f = facts([-2.5, 0, 7.25]);
    for (const a of ALGORITHMS.filter(
      (x) => !['counting', 'radix-lsd', 'radix-msd'].includes(x.id),
    ))
      expect(checkSupport(a, f)).toEqual({ ok: true });
  });
});

describe.each(FR_009_ORDER)('%s', (id) => {
  it.each(inputsFor(id))('sorts %s correctly with replayable steps', (_name, input) => {
    const { buffer, result } = runAlgorithm(id, input);

    expect(isNonDecreasing(result)).toBe(true);
    expect(Array.from(result)).toEqual([...input].sort((x, y) => x - y));
    expect(buffer.length).toBeLessThan(MAX_STEPS);
    expect(buffer.capacity).toBe(buffer.length);

    const values = Float64Array.from(input);
    const sortedFlags = new Uint8Array(input.length);
    for (let i = 0; i < buffer.length; i++) applyStep(buffer, i, values, sortedFlags);
    expect(values).toEqual(result);

    for (let i = buffer.length - 1; i >= 0; i--) undoStep(buffer, i, values, sortedFlags);
    expect(Array.from(values)).toEqual(input);
    expect(sortedFlags.every((f) => f === 0)).toBe(true);
  });

  it('is deterministic', () => {
    const input = randomValues(300, seeded(99));
    const first = runAlgorithm(id, input).buffer;
    const second = runAlgorithm(id, input).buffer;
    expect(second.length).toBe(first.length);
    expect(second.kind).toEqual(first.kind);
    expect(second.a).toEqual(first.a);
    expect(second.b).toEqual(first.b);
    expect(second.value).toEqual(first.value);
  });
});
