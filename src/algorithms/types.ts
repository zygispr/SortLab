/** Picker group an algorithm belongs to (FR-009). */
export type AlgorithmFamily =
  'exchange' | 'selection' | 'insertion' | 'divide-and-conquer' | 'hybrid' | 'non-comparison';

/** Facts about a dataset that algorithms use to decide whether they can sort it. */
export interface DatasetFacts {
  /** Number of values, 2–1,000. */
  length: number;
  /** Smallest value. */
  min: number;
  /** Largest value. */
  max: number;
  /** True when every value is an integer. */
  isWholeNumbers: boolean;
  /** True when every value is >= 0. */
  isNonNegative: boolean;
}

/** Whether an algorithm can sort a dataset, and if not, a one-line reason for the user. */
export type Support = { ok: true } | { ok: false; reason: string };

/**
 * Sorting surface handed to every algorithm. Each method performs its operation on the
 * working copy and records it as one step, so the run can be replayed and stepped back.
 * Every method throws `RangeError` for an index outside `0 … length − 1`.
 */
export interface StepRecorder {
  /** Number of values being sorted. */
  readonly length: number;
  /** Read-only view of the working copy. Algorithms must use `read`/`compare` instead. */
  readonly values: ArrayLike<number>;
  /** Records a comparison of positions `i` and `j`; returns `sign(values[i] − values[j])`. */
  compare(i: number, j: number): number;
  /** Records an inspection of position `i` (counts as a comparison); returns its value. */
  read(i: number): number;
  /** Records a swap and exchanges the values at `i` and `j` (counts as a move). */
  swap(i: number, j: number): void;
  /** Records a write of `value` to position `i`, keeping the old value for undo (a move). */
  write(i: number, value: number): void;
  /** Records that position `i` holds its final value. A repeat call records nothing. */
  markSorted(i: number): void;
}

/** One entry in the algorithm catalog (data-model.md → Algorithm). */
export interface AlgorithmDefinition {
  /** Unique kebab-case id, e.g. `radix-lsd`. */
  id: string;
  /** Display name, e.g. "Radix Sort (LSD)". */
  name: string;
  /** Picker group. */
  family: AlgorithmFamily;
  /** One or two sentences shown under the picker (FR-010). */
  description: string;
  /** Typical complexity, e.g. `{ best: 'O(n)', average: 'O(n²)', … }`. */
  complexity: { best: string; average: string; worst: string; space: string };
  /** Data requirement check (FR-009a). Omitted means every dataset is supported. */
  supports?: (facts: DatasetFacts) => Support;
  /**
   * Sorts `r.values` ascending using only the recorder's methods. Must be deterministic
   * and finish in fewer than 1,800,000 steps for any valid dataset.
   */
  sort: (r: StepRecorder) => void;
}
