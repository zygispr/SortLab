import { StepBuffer, StepKind } from '../engine/stepBuffer';
import type { StepRecorder } from './types';

/** A recorder plus access to what it recorded, for the code that runs an algorithm. */
export interface RecordingSession extends StepRecorder {
  /** Every step recorded so far (untrimmed). */
  readonly buffer: StepBuffer;
  /** A copy of the working values in their current order. */
  result(): Float64Array;
}

/**
 * Creates a `StepRecorder` over a copy of `original`. Each method changes the copy and
 * appends one step to `buffer`; `original` is never modified. Indices outside
 * `0 … length − 1` (or non-integers) throw `RangeError` before anything is recorded.
 */
export function createRecorder(original: ArrayLike<number>): RecordingSession {
  const values = Float64Array.from(original);
  const marked = new Uint8Array(values.length);
  const buffer = new StepBuffer();
  const { length } = values;

  const check = (i: number) => {
    if (!Number.isInteger(i) || i < 0 || i >= length) {
      throw new RangeError(`Index ${String(i)} is outside 0…${String(length - 1)}`);
    }
  };

  return {
    length,
    values,
    buffer,
    compare(i, j) {
      check(i);
      check(j);
      buffer.push(StepKind.Compare, i, j);
      return Math.sign(values[i]! - values[j]!);
    },
    read(i) {
      check(i);
      buffer.push(StepKind.Read, i);
      return values[i]!;
    },
    swap(i, j) {
      check(i);
      check(j);
      buffer.push(StepKind.Swap, i, j);
      const t = values[i]!;
      values[i] = values[j]!;
      values[j] = t;
    },
    write(i, value) {
      check(i);
      buffer.push(StepKind.Write, i, -1, value, values[i]);
      values[i] = value;
    },
    markSorted(i) {
      check(i);
      // A second mark would make undo clear a flag that an earlier step set.
      if (marked[i]) return;
      marked[i] = 1;
      buffer.push(StepKind.MarkSorted, i);
    },
    result: () => values.slice(),
  };
}
