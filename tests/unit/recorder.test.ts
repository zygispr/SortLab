import { createRecorder } from '../../src/algorithms/recorder';
import { StepKind } from '../../src/engine/stepBuffer';

function lastStep(r: ReturnType<typeof createRecorder>) {
  const i = r.buffer.length - 1;
  return {
    kind: r.buffer.kind[i],
    a: r.buffer.a[i],
    b: r.buffer.b[i],
    value: r.buffer.value[i],
    previous: r.buffer.previous[i],
  };
}

describe('createRecorder', () => {
  it('works on a copy and leaves the original untouched', () => {
    const original = [3, 1, 2];
    const r = createRecorder(original);
    r.swap(0, 1);
    expect(original).toEqual([3, 1, 2]);
    expect(Array.from(r.values)).toEqual([1, 3, 2]);
    expect(r.length).toBe(3);
  });

  it('compare records a step and returns the sign of the difference', () => {
    const r = createRecorder([5, 2, 5]);
    expect(r.compare(0, 1)).toBe(1);
    expect(r.compare(1, 0)).toBe(-1);
    expect(r.compare(0, 2)).toBe(0);
    expect(lastStep(r)).toMatchObject({ kind: StepKind.Compare, a: 0, b: 2 });
    expect(r.buffer.comparisons).toBe(3);
  });

  it('read records a step and returns the value', () => {
    const r = createRecorder([4, 8]);
    expect(r.read(1)).toBe(8);
    expect(lastStep(r)).toMatchObject({ kind: StepKind.Read, a: 1, b: -1 });
    expect(r.buffer.comparisons).toBe(1);
  });

  it('swap records a step and exchanges the values', () => {
    const r = createRecorder([4, 8]);
    r.swap(0, 1);
    expect(Array.from(r.values)).toEqual([8, 4]);
    expect(lastStep(r)).toMatchObject({ kind: StepKind.Swap, a: 0, b: 1 });
    expect(r.buffer.moves).toBe(1);
  });

  it('write records the new and previous value and sets it', () => {
    const r = createRecorder([4, 8]);
    r.write(1, -2.5);
    expect(Array.from(r.values)).toEqual([4, -2.5]);
    expect(lastStep(r)).toEqual({ kind: StepKind.Write, a: 1, b: -1, value: -2.5, previous: 8 });
    expect(r.buffer.moves).toBe(1);
  });

  it('markSorted records once per position', () => {
    const r = createRecorder([1, 2]);
    r.markSorted(0);
    r.markSorted(0);
    r.markSorted(1);
    expect(r.buffer.length).toBe(2);
    expect(lastStep(r)).toMatchObject({ kind: StepKind.MarkSorted, a: 1 });
  });

  type Recorder = ReturnType<typeof createRecorder>;
  it.each<[string, (r: Recorder) => unknown]>([
    ['compare', (r) => r.compare(0, 2)],
    ['read', (r) => r.read(-1)],
    [
      'swap',
      (r) => {
        r.swap(2, 0);
      },
    ],
    [
      'write',
      (r) => {
        r.write(1.5, 0);
      },
    ],
    [
      'markSorted',
      (r) => {
        r.markSorted(5);
      },
    ],
  ])('%s throws RangeError for an out-of-range index', (_name, call) => {
    const r = createRecorder([1, 2]);
    expect(() => call(r)).toThrow(RangeError);
    expect(r.buffer.length).toBe(0);
  });

  it('result() returns a copy of the working values', () => {
    const r = createRecorder([2, 1]);
    r.swap(0, 1);
    const result = r.result();
    expect(Array.from(result)).toEqual([1, 2]);
    result[0] = 99;
    expect(r.values[0]).toBe(1);
  });

  it('exposes values as read-only to callers', () => {
    const r = createRecorder([1, 2]);
    // @ts-expect-error values is a read-only view; algorithms must use write().
    r.values[0] = 5;
  });
});
