import {
  applyStep,
  INITIAL_CAPACITY,
  StepBuffer,
  StepKind,
  undoStep,
} from '../../src/engine/stepBuffer';

function bufferWith(...steps: [StepKind, number, number?, number?, number?][]): StepBuffer {
  const buf = new StepBuffer();
  for (const [kind, a, b, value, previous] of steps) buf.push(kind, a, b, value, previous);
  return buf;
}

describe('StepBuffer storage', () => {
  it('starts at 1,024 entries and doubles when full', () => {
    const buf = new StepBuffer();
    expect(INITIAL_CAPACITY).toBe(1024);
    expect(buf.capacity).toBe(1024);
    for (let i = 0; i < 1024; i++) buf.push(StepKind.Compare, 0, 1);
    expect(buf.capacity).toBe(1024);
    buf.push(StepKind.Compare, 0, 1);
    expect(buf.capacity).toBe(2048);
    expect(buf.length).toBe(1025);
  });

  it('keeps every field when growing', () => {
    const buf = new StepBuffer();
    for (let i = 0; i < 1500; i++) buf.push(StepKind.Write, i, -1, i * 2, i * 3);
    expect(buf.a[1499]).toBe(1499);
    expect(buf.value[1200]).toBe(2400);
    expect(buf.previous[10]).toBe(30);
  });

  it('trim() shrinks every array to exactly length entries', () => {
    const buf = bufferWith([StepKind.Swap, 0, 1], [StepKind.Read, 2]);
    buf.trim();
    expect(buf.capacity).toBe(2);
    for (const arr of [buf.kind, buf.a, buf.b, buf.value, buf.previous]) {
      expect(arr.length).toBe(2);
    }
  });

  it('defaults b to -1 and value/previous to 0 when unused', () => {
    const buf = bufferWith([StepKind.Read, 3]);
    expect(buf.b[0]).toBe(-1);
    expect(buf.value[0]).toBe(0);
    expect(buf.previous[0]).toBe(0);
  });

  it('counts compare and read as comparisons, swap and write as moves', () => {
    const buf = bufferWith(
      [StepKind.Compare, 0, 1],
      [StepKind.Read, 0],
      [StepKind.Swap, 0, 1],
      [StepKind.Write, 0, -1, 5, 1],
      [StepKind.MarkSorted, 0],
    );
    expect(buf.comparisons).toBe(2);
    expect(buf.moves).toBe(2);
  });

  it('round-trips through toTransfer() and fromTransfer()', () => {
    const buf = bufferWith(
      [StepKind.Compare, 0, 1],
      [StepKind.Swap, 0, 1],
      [StepKind.Write, 2, -1, 7.5, -3],
      [StepKind.MarkSorted, 2],
    );
    const payload = buf.toTransfer();
    expect(payload.length).toBe(4);
    expect(payload.kind.byteLength).toBe(4);
    const copy = StepBuffer.fromTransfer(payload);
    expect(copy.length).toBe(4);
    expect(Array.from(copy.kind)).toEqual([0, 2, 3, 4]);
    expect(Array.from(copy.a)).toEqual([0, 0, 2, 2]);
    expect(Array.from(copy.b)).toEqual([1, 1, -1, -1]);
    expect(copy.value[2]).toBe(7.5);
    expect(copy.previous[2]).toBe(-3);
    expect(copy.comparisons).toBe(1);
    expect(copy.moves).toBe(2);
  });
});

describe('applyStep and undoStep', () => {
  const start = () => ({ values: Float64Array.from([10, 20, 30]), sorted: new Uint8Array(3) });

  it.each([
    ['compare', [StepKind.Compare, 0, 1]],
    ['read', [StepKind.Read, 2]],
  ] as const)('%s changes nothing', (_name, step) => {
    const buf = bufferWith([...step]);
    const { values, sorted } = start();
    applyStep(buf, 0, values, sorted);
    expect(Array.from(values)).toEqual([10, 20, 30]);
    undoStep(buf, 0, values, sorted);
    expect(Array.from(values)).toEqual([10, 20, 30]);
    expect(Array.from(sorted)).toEqual([0, 0, 0]);
  });

  it('swap exchanges values and is its own inverse', () => {
    const buf = bufferWith([StepKind.Swap, 0, 2]);
    const { values, sorted } = start();
    applyStep(buf, 0, values, sorted);
    expect(Array.from(values)).toEqual([30, 20, 10]);
    undoStep(buf, 0, values, sorted);
    expect(Array.from(values)).toEqual([10, 20, 30]);
  });

  it('write sets the new value and undo restores the previous one', () => {
    const buf = bufferWith([StepKind.Write, 1, -1, 99, 20]);
    const { values, sorted } = start();
    applyStep(buf, 0, values, sorted);
    expect(Array.from(values)).toEqual([10, 99, 30]);
    undoStep(buf, 0, values, sorted);
    expect(Array.from(values)).toEqual([10, 20, 30]);
  });

  it('markSorted marks the position and undo unmarks it', () => {
    const buf = bufferWith([StepKind.MarkSorted, 1]);
    const { values, sorted } = start();
    applyStep(buf, 0, values, sorted);
    expect(Array.from(sorted)).toEqual([0, 1, 0]);
    undoStep(buf, 0, values, sorted);
    expect(Array.from(sorted)).toEqual([0, 0, 0]);
  });
});
