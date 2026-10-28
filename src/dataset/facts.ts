import type { DatasetFacts } from '../algorithms/types';

/** Smallest and largest number of values a dataset may hold (FR-006). */
export const MIN_VALUES = 2;
export const MAX_VALUES = 1000;

/** The numbers being sorted (data-model.md → Dataset). */
export interface Dataset {
  /** Increments with every new dataset; used to drop stale steps and clear history. */
  id: number;
  source: 'random' | 'upload' | 'paste';
  /** Shown to the user, e.g. "Random · 50 values" or the uploaded file name. */
  label: string;
  /** 2–1,000 finite numbers, in input order; never mutated (FR-007). */
  original: readonly number[];
  min: number;
  max: number;
  isWholeNumbers: boolean;
  isNonNegative: boolean;
}

/**
 * Builds a dataset from `values` (copied and frozen) and precomputes its facts.
 * Throws `RangeError` unless there are 2–1,000 values and every one is finite.
 */
export function createDataset(
  values: readonly number[],
  source: Dataset['source'],
  label: string,
  id: number,
): Dataset {
  if (values.length < MIN_VALUES || values.length > MAX_VALUES) {
    throw new RangeError(`A dataset needs 2–1,000 values, got ${String(values.length)}`);
  }
  let min = Infinity;
  let max = -Infinity;
  let isWholeNumbers = true;
  for (const v of values) {
    if (!Number.isFinite(v)) throw new RangeError(`Dataset value ${String(v)} is not finite`);
    if (v < min) min = v;
    if (v > max) max = v;
    if (!Number.isInteger(v)) isWholeNumbers = false;
  }
  return {
    id,
    source,
    label,
    original: Object.freeze([...values]),
    min,
    max,
    isWholeNumbers,
    isNonNegative: min >= 0,
  };
}

/** The subset of a dataset that algorithms' `supports` checks need. */
export function toFacts(d: Dataset): DatasetFacts {
  return {
    length: d.original.length,
    min: d.min,
    max: d.max,
    isWholeNumbers: d.isWholeNumbers,
    isNonNegative: d.isNonNegative,
  };
}
