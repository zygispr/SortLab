/** Step kind codes stored in `StepBuffer.kind` (contracts/algorithm-contract.md). */
export const StepKind = {
  Compare: 0,
  Read: 1,
  Swap: 2,
  Write: 3,
  MarkSorted: 4,
} as const;

export type StepKind = (typeof StepKind)[keyof typeof StepKind];

/** Number of steps a new buffer can hold before it first grows. */
export const INITIAL_CAPACITY = 1024;

/** Worker `done` payload: the buffer's arrays as transferable `ArrayBuffer`s. */
export interface StepTransfer {
  length: number;
  kind: ArrayBuffer;
  a: ArrayBuffer;
  b: ArrayBuffer;
  value: ArrayBuffer;
  previous: ArrayBuffer;
  comparisons: number;
  moves: number;
}

/**
 * Compact, growable list of recorded steps, stored as parallel typed arrays instead of
 * objects so that ~1.5 M steps fit in about 40 MB. Entries at index >= `length` are
 * unused capacity.
 */
export class StepBuffer {
  length = 0;
  comparisons = 0;
  moves = 0;
  kind: Uint8Array<ArrayBuffer>;
  a: Int32Array<ArrayBuffer>;
  b: Int32Array<ArrayBuffer>;
  value: Float64Array<ArrayBuffer>;
  previous: Float64Array<ArrayBuffer>;

  /** Creates an empty buffer with room for `capacity` steps (default 1,024). */
  constructor(capacity = INITIAL_CAPACITY) {
    this.kind = new Uint8Array(capacity);
    this.a = new Int32Array(capacity);
    this.b = new Int32Array(capacity);
    this.value = new Float64Array(capacity);
    this.previous = new Float64Array(capacity);
  }

  /** Number of steps the arrays can hold before the next growth. */
  get capacity(): number {
    return this.kind.length;
  }

  /**
   * Appends one step, doubling the capacity when full, and updates the comparison and
   * move totals. `b` is −1 and `value`/`previous` are 0 when the kind does not use them.
   */
  push(kind: StepKind, a: number, b = -1, value = 0, previous = 0): void {
    if (this.length === this.capacity) this.resize(this.capacity * 2);
    const i = this.length++;
    this.kind[i] = kind;
    this.a[i] = a;
    this.b[i] = b;
    this.value[i] = value;
    this.previous[i] = previous;
    if (kind === StepKind.Compare || kind === StepKind.Read) this.comparisons++;
    else if (kind === StepKind.Swap || kind === StepKind.Write) this.moves++;
  }

  /** Shrinks every array to exactly `length` entries (done once before transfer). */
  trim(): void {
    if (this.capacity !== this.length) this.resize(this.length);
  }

  /**
   * Trims the buffer and returns its arrays' `ArrayBuffer`s for `postMessage` transfer.
   * After transferring them, this buffer must not be used again.
   */
  toTransfer(): StepTransfer {
    this.trim();
    return {
      length: this.length,
      kind: this.kind.buffer,
      a: this.a.buffer,
      b: this.b.buffer,
      value: this.value.buffer,
      previous: this.previous.buffer,
      comparisons: this.comparisons,
      moves: this.moves,
    };
  }

  /** Rebuilds a buffer from a worker payload without copying the arrays. */
  static fromTransfer(payload: StepTransfer): StepBuffer {
    const buf = new StepBuffer(0);
    buf.kind = new Uint8Array(payload.kind);
    buf.a = new Int32Array(payload.a);
    buf.b = new Int32Array(payload.b);
    buf.value = new Float64Array(payload.value);
    buf.previous = new Float64Array(payload.previous);
    buf.length = payload.length;
    buf.comparisons = payload.comparisons;
    buf.moves = payload.moves;
    return buf;
  }

  private resize(capacity: number): void {
    const n = Math.min(this.length, capacity);
    this.kind = copyInto(new Uint8Array(capacity), this.kind, n);
    this.a = copyInto(new Int32Array(capacity), this.a, n);
    this.b = copyInto(new Int32Array(capacity), this.b, n);
    this.value = copyInto(new Float64Array(capacity), this.value, n);
    this.previous = copyInto(new Float64Array(capacity), this.previous, n);
  }
}

function copyInto<T extends Uint8Array | Int32Array | Float64Array>(
  target: T,
  source: T,
  count: number,
): T {
  target.set(source.subarray(0, count));
  return target;
}

/**
 * Applies step `i` of `buf` to the bar values and sorted flags (data-model.md → Step).
 * `compare` and `read` change nothing; they only highlight.
 */
export function applyStep(buf: StepBuffer, i: number, values: Float64Array, sorted: Uint8Array) {
  const a = buf.a[i]!;
  switch (buf.kind[i]) {
    case StepKind.Swap: {
      const b = buf.b[i]!;
      const t = values[a]!;
      values[a] = values[b]!;
      values[b] = t;
      break;
    }
    case StepKind.Write:
      values[a] = buf.value[i]!;
      break;
    case StepKind.MarkSorted:
      sorted[a] = 1;
      break;
  }
}

/** Reverses `applyStep` for step `i`, restoring the values and flags from before it. */
export function undoStep(buf: StepBuffer, i: number, values: Float64Array, sorted: Uint8Array) {
  const a = buf.a[i]!;
  switch (buf.kind[i]) {
    case StepKind.Swap: {
      const b = buf.b[i]!;
      const t = values[a]!;
      values[a] = values[b]!;
      values[b] = t;
      break;
    }
    case StepKind.Write:
      values[a] = buf.previous[i]!;
      break;
    case StepKind.MarkSorted:
      sorted[a] = 0;
      break;
  }
}
