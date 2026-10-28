import { runAlgorithm } from '../../src/algorithms/registry';
import { COMPLETION_SWEEP_MS, Player } from '../../src/engine/player';
import { computeBarLayout, createBarRenderer, MIN_BAR_CSS_PX } from '../../src/render/barRenderer';
import { getRecordedCalls } from '../setup';

describe('computeBarLayout', () => {
  it('keeps every bar at least 4 CSS px tall, including the smallest value', () => {
    const dpr = 2;
    const layout = computeBarLayout([5, 1, 9, 1], 1, 9, 400, 200, dpr);
    expect(MIN_BAR_CSS_PX).toBe(4);
    for (const h of layout.heights) expect(h).toBeGreaterThanOrEqual(4 * dpr);
    expect(layout.heights[1]).toBe(4 * dpr);
    expect(layout.heights[2]).toBe(layout.chartHeight);
  });

  it('makes heights proportional to (v − min) / (max − min)', () => {
    const layout = computeBarLayout([0, 25, 50, 100], 0, 100, 400, 200, 1);
    const span = layout.chartHeight - layout.minHeight;
    expect(layout.heights[1]! - layout.minHeight).toBeCloseTo(span * 0.25);
    expect(layout.heights[2]! - layout.minHeight).toBeCloseTo(span * 0.5);
  });

  it('scales negatives, zero, and decimals into the same range', () => {
    const layout = computeBarLayout([-2.5, 0, 7.5], -2.5, 7.5, 300, 200, 1);
    const span = layout.chartHeight - layout.minHeight;
    expect(layout.heights[0]).toBe(layout.minHeight);
    expect(layout.heights[1]! - layout.minHeight).toBeCloseTo(span * 0.25);
    expect(layout.heights[2]).toBe(layout.chartHeight);
  });

  it('gives all-equal values equal, visible heights at 60 % of the chart', () => {
    const layout = computeBarLayout([4, 4, 4], 4, 4, 300, 200, 1);
    for (const h of layout.heights) expect(h).toBeCloseTo(layout.chartHeight * 0.6);
  });

  it('keeps 1,000 bars at least 1 device pixel wide on a 360 px phone at dpr 3', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i + 1);
    const layout = computeBarLayout(values, 1, 1000, 360, 300, 3);
    expect(layout.barWidth).toBeGreaterThanOrEqual(1);
    expect(layout.slot * 1000).toBeCloseTo(360 * 3);
  });

  it('keeps a 1 px gap between bars once a bar is at least 3 px wide', () => {
    const wide = computeBarLayout([1, 2, 3, 4], 1, 4, 40, 100, 2);
    expect(wide.gap).toBe(2);
    expect(wide.barWidth).toBe(wide.slot - 2);
    const narrow = computeBarLayout(
      Array.from({ length: 200 }, (_, i) => i),
      0,
      199,
      400,
      100,
      1,
    );
    expect(narrow.gap).toBe(0);
    expect(narrow.barWidth).toBe(narrow.slot);
  });
});

describe('createBarRenderer', () => {
  function drawPlayer(prepare: (p: Player) => void) {
    const canvas = document.createElement('canvas');
    const renderer = createBarRenderer(canvas);
    renderer.resize(200, 100, 1);
    const player = new Player({ requestFrame: () => 0, cancelFrame: () => undefined });
    const input = [3, 1, 2];
    player.load(input, runAlgorithm('bubble', input).buffer);
    prepare(player);
    const calls = getRecordedCalls(canvas.getContext('2d'));
    calls.length = 0;
    renderer.draw(player);
    renderer.dispose();
    return { canvas, calls };
  }

  it('sizes the canvas in device pixels', () => {
    const canvas = document.createElement('canvas');
    const renderer = createBarRenderer(canvas);
    renderer.resize(300, 150, 2);
    expect([canvas.width, canvas.height]).toEqual([600, 300]);
    renderer.dispose();
  });

  it('paints the background and one rectangle per bar', () => {
    const { calls } = drawPlayer(() => undefined);
    expect(calls.filter((c) => c.name === 'fillRect').length).toBeGreaterThanOrEqual(1 + 3);
  });

  it('draws a ▲ marker for comparing and a ● marker plus outline for moving', () => {
    const comparing = drawPlayer((p) => p.stepForward()).calls.map((c) => c.name);
    expect(comparing).toContain('lineTo');
    expect(comparing).not.toContain('arc');

    const moving = drawPlayer((p) => {
      p.stepForward();
      p.stepForward();
    }).calls.map((c) => c.name);
    expect(moving).toContain('arc');
    expect(moving).toContain('strokeRect');
  });

  // Regression: every algorithm marks all bars sorted by its last step, so a sweep that only
  // "turns bars sorted" drew nothing and the completion animation was invisible (FR-020).
  it('shows the completion sweep as a highlight moving left to right over sorted bars', () => {
    const values = Array.from({ length: 40 }, (_, i) => 40 - i);
    let time = 0;
    const player = new Player({
      now: () => time,
      requestFrame: () => 0,
      cancelFrame: () => undefined,
    });
    player.load(values, runAlgorithm('bubble', values).buffer);
    while (player.stepForward());
    expect(player.sorted.every((s) => s === 1)).toBe(true);

    const canvas = document.createElement('canvas');
    const renderer = createBarRenderer(canvas);
    renderer.resize(400, 100, 1);
    const ctx = canvas.getContext('2d')!;
    /** Fill color of each bar (the tall rectangles), left to right. */
    const barColors = (at: number) => {
      time = at;
      const fills: { y: number; color: unknown }[] = [];
      ctx.fillRect = (_x: number, y: number) => {
        fills.push({ y, color: ctx.fillStyle });
      };
      renderer.draw(player);
      // Skip the background (y = 0) and the sorted strips under the bars.
      return fills.filter((f) => f.y > 0 && f.y < 70).map((f) => f.color);
    };
    const highlighted = (at: number) =>
      barColors(at).flatMap((c, i) => (c === '#111111' ? [i] : []));

    const early = highlighted(200);
    const late = highlighted(600);
    expect(early.length).toBeGreaterThan(0);
    expect(late.length).toBeGreaterThan(0);
    expect(Math.min(...late)).toBeGreaterThan(Math.max(...early));
    expect(highlighted(COMPLETION_SWEEP_MS)).toEqual([]);
    renderer.dispose();
  });
});
