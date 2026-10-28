import { runAlgorithm } from '../../src/algorithms/registry';
import { Player } from '../../src/engine/player';
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
});
