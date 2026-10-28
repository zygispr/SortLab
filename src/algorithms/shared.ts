import type { StepRecorder } from './types';

/**
 * Building blocks used by more than one algorithm. Every function works on the inclusive
 * range `lo … hi` of the recorder and touches data only through it.
 */

/** Marks every position as sorted (a no-op for positions already marked). */
export function markAllSorted(r: StepRecorder): void {
  for (let i = 0; i < r.length; i++) r.markSorted(i);
}

/** Marks every position in `lo … hi` as sorted. */
export function markRangeSorted(r: StepRecorder, lo: number, hi: number): void {
  for (let i = lo; i <= hi; i++) r.markSorted(i);
}

/**
 * Insertion sort of `lo … hi` by shifting: the key is held in a variable and compared,
 * per the contract, by reading each position it passes.
 */
export function insertionSortRange(r: StepRecorder, lo: number, hi: number): void {
  for (let i = lo + 1; i <= hi; i++) {
    const key = r.read(i);
    let j = i - 1;
    let v: number;
    while (j >= lo && (v = r.read(j)) > key) {
      r.write(j + 1, v);
      j--;
    }
    if (j + 1 !== i) r.write(j + 1, key);
  }
}

/**
 * Binary insertion sort of `lo … hi`, assuming `lo … start − 1` is already sorted.
 * Equal keys go after existing ones, which keeps the sort stable.
 */
export function binaryInsertionSortRange(
  r: StepRecorder,
  lo: number,
  hi: number,
  start = lo + 1,
): void {
  for (let i = start; i <= hi; i++) {
    const key = r.read(i);
    let left = lo;
    let right = i;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (r.read(mid) <= key) left = mid + 1;
      else right = mid;
    }
    if (left === i) continue;
    for (let j = i; j > left; j--) r.write(j, r.values[j - 1]!);
    r.write(left, key);
  }
}

/** Moves the larger child up until the heap rooted at `root` (offset `lo`) is valid. */
function siftDown(r: StepRecorder, lo: number, root: number, size: number): void {
  for (;;) {
    let child = 2 * root + 1;
    if (child >= size) return;
    if (child + 1 < size && r.compare(lo + child, lo + child + 1) < 0) child++;
    if (r.compare(lo + root, lo + child) >= 0) return;
    r.swap(lo + root, lo + child);
    root = child;
  }
}

/**
 * Heap sort of `lo … hi`. Each position is marked sorted as it receives its final value,
 * so callers must only use it on a range that already holds exactly its final values.
 */
export function heapSortRange(r: StepRecorder, lo: number, hi: number): void {
  const size = hi - lo + 1;
  for (let i = (size >>> 1) - 1; i >= 0; i--) siftDown(r, lo, i, size);
  for (let end = size - 1; end > 0; end--) {
    r.swap(lo, lo + end);
    r.markSorted(lo + end);
    siftDown(r, lo, 0, end);
  }
  r.markSorted(lo);
}

/**
 * Lomuto partition of `lo … hi` (at least 3 values) with a median-of-three pivot moved
 * to `hi`. Returns the pivot's final index, which is marked sorted.
 */
export function partition(r: StepRecorder, lo: number, hi: number): number {
  const mid = (lo + hi) >>> 1;
  if (r.compare(mid, lo) < 0) r.swap(mid, lo);
  if (r.compare(hi, lo) < 0) r.swap(hi, lo);
  if (r.compare(mid, hi) < 0) r.swap(mid, hi);
  let store = lo;
  for (let j = lo; j < hi; j++) {
    if (r.compare(j, hi) < 0) {
      if (store !== j) r.swap(store, j);
      store++;
    }
  }
  if (store !== hi) r.swap(store, hi);
  r.markSorted(store);
  return store;
}

/** Sorts a range of one or two values directly and marks it sorted. */
export function sortTiny(r: StepRecorder, lo: number, hi: number): void {
  if (hi > lo && r.compare(lo, hi) > 0) r.swap(lo, hi);
  markRangeSorted(r, lo, hi);
}

/**
 * Merges the sorted runs `lo … mid` and `mid + 1 … hi`. The left run is copied aside;
 * each merge decision reads the right run's next value (still in place) and compares it
 * with the left value in a variable. When `markFinal` is set, written positions are
 * final and get marked sorted.
 */
export function mergeRanges(
  r: StepRecorder,
  lo: number,
  mid: number,
  hi: number,
  markFinal = false,
): void {
  const left: number[] = [];
  for (let i = lo; i <= mid; i++) left.push(r.values[i]!);
  let i = 0;
  let j = mid + 1;
  let k = lo;
  const place = (value: number) => {
    r.write(k, value);
    if (markFinal) r.markSorted(k);
    k++;
  };
  while (i < left.length && j <= hi) {
    const right = r.read(j);
    if (left[i]! <= right) place(left[i++]!);
    else {
      place(right);
      j++;
    }
  }
  while (i < left.length) place(left[i++]!);
  if (markFinal) markRangeSorted(r, k, hi);
}
