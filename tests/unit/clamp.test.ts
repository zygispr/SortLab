import { clamp } from '../../src/util/clamp';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('pulls values outside the range to the nearest end', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
    expect(clamp(-Infinity, 2, 60_000)).toBe(2);
    expect(clamp(Infinity, 2, 60_000)).toBe(60_000);
  });

  it('handles decimal ranges', () => {
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(0.25, 0, 1)).toBe(0.25);
  });
});
