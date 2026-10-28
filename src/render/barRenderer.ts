import type { Player } from '../engine/player';
import { StepKind } from '../engine/stepBuffer';

/** Smallest bar height, so even the minimum value stays visible (FR-016). */
export const MIN_BAR_CSS_PX = 4;
/** Height of the strip below the bars holding the sorted strip and the ▲/● markers. */
const MARKER_AREA_CSS_PX = 16;
/** Bars at least this wide get a 1 px gap so equal neighbours stay distinguishable. */
const GAP_THRESHOLD_CSS_PX = 3;
/** Height used for every bar when all values are equal. */
const EQUAL_VALUES_HEIGHT = 0.6;
/** Distinct hues precomputed per saturation level. */
const PALETTE_SIZE = 64;

/** Bar geometry in device pixels. */
export interface BarLayout {
  /** Horizontal space per bar (bar plus gap). */
  slot: number;
  barWidth: number;
  gap: number;
  /** Height available to bars; the marker area sits below it. */
  chartHeight: number;
  minHeight: number;
  /** Height of each value's bar. */
  heights: Float64Array;
}

/** Height in device pixels of a bar showing `value`. */
function barHeight(
  value: number,
  min: number,
  max: number,
  chartHeight: number,
  minHeight: number,
) {
  if (max === min) return chartHeight * EQUAL_VALUES_HEIGHT;
  return minHeight + ((value - min) / (max - min)) * (chartHeight - minHeight);
}

/**
 * Lays out one bar per value across a `cssWidth × cssHeight` canvas drawn at `dpr`
 * device pixels per CSS pixel. Heights are proportional to `(value − min) / (max − min)`
 * above a 4 CSS px minimum, so negatives, zero, and decimals all scale into view.
 */
export function computeBarLayout(
  values: ArrayLike<number>,
  min: number,
  max: number,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
): BarLayout {
  const slot = (cssWidth * dpr) / Math.max(1, values.length);
  const gap = slot >= GAP_THRESHOLD_CSS_PX * dpr ? dpr : 0;
  const chartHeight = (cssHeight - MARKER_AREA_CSS_PX) * dpr;
  const minHeight = MIN_BAR_CSS_PX * dpr;
  const heights = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    heights[i] = barHeight(values[i]!, min, max, chartHeight, minHeight);
  }
  return { slot, barWidth: slot - gap, gap, chartHeight, minHeight, heights };
}

interface Colors {
  canvas: string;
  comparing: string;
  moving: string;
  unsorted: string[];
  sorted: string[];
}

/** Reads the theme tokens from tokens.css, with light-theme fallbacks. */
function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const low = Number(token('--bar-hue-low', '270'));
  const high = Number(token('--bar-hue-high', '30'));
  const lightness = token('--bar-lightness', '30%');
  const palette = (saturation: string) =>
    Array.from({ length: PALETTE_SIZE }, (_, i) => {
      const hue = low + ((high - low) * i) / (PALETTE_SIZE - 1);
      return `hsl(${hue.toFixed(1)} ${saturation} ${lightness})`;
    });
  return {
    canvas: token('--color-canvas', '#ffffff'),
    comparing: token('--color-comparing', '#111111'),
    moving: token('--color-moving', '#d6006b'),
    unsorted: palette(token('--bar-saturation-unsorted', '60%')),
    sorted: palette(token('--bar-saturation-sorted', '85%')),
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export interface BarRenderer {
  /** Sizes the canvas backing store for `cssWidth × cssHeight` at `dpr`. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  /** Draws the player's current bars, highlights, tween, and completion sweep. */
  draw(player: Player): void;
  /** Stops listening for theme changes. */
  dispose(): void;
}

/**
 * Draws the visualization on `canvas` (research §2). States use color plus a non-color
 * cue (ui-contract.md → Visual states): comparing ▲, moving ● with a thick outline, sorted
 * a solid strip under the bar. Throws if the canvas has no 2D context.
 */
export function createBarRenderer(canvas: HTMLCanvasElement): BarRenderer {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('Canvas 2D is not supported');
  const ctx = maybeCtx;
  let colors = readColors();
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;

  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const onSchemeChange = () => {
    colors = readColors();
  };
  scheme.addEventListener('change', onSchemeChange);

  const paletteIndex = (value: number, min: number, max: number) =>
    max === min
      ? PALETTE_SIZE >> 1
      : Math.round(((value - min) / (max - min)) * (PALETTE_SIZE - 1));

  function drawMarker(kind: 'triangle' | 'circle', x: number, width: number, top: number) {
    const size = Math.max(width, 6 * dpr);
    const cx = x + width / 2;
    ctx.beginPath();
    if (kind === 'triangle') {
      ctx.fillStyle = colors.comparing;
      ctx.moveTo(cx, top);
      ctx.lineTo(cx + size / 2, top + size);
      ctx.lineTo(cx - size / 2, top + size);
      ctx.closePath();
    } else {
      ctx.fillStyle = colors.moving;
      ctx.arc(cx, top + size / 2, size / 2, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  return {
    resize(width, height, ratio) {
      cssWidth = width;
      cssHeight = height;
      dpr = ratio;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    },

    draw(player) {
      const values = player.current;
      const n = values.length;
      ctx.fillStyle = colors.canvas;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (n === 0 || cssWidth === 0) return;

      const { min, max } = player;
      const layout = computeBarLayout(values, min, max, cssWidth, cssHeight, dpr);
      const { slot, barWidth, chartHeight, minHeight } = layout;
      const highlight = player.highlight;
      const tween = player.tween;
      const t = easeInOut(player.tweenProgress());
      const sweep = player.sweepProgress();
      const sweepCount = sweep === null ? 0 : Math.ceil(sweep * n);
      const stripTop = chartHeight + 2 * dpr;
      const markerTop = chartHeight + 7 * dpr;
      const outline = 2 * dpr;

      for (let i = 0; i < n; i++) {
        let x = i * slot;
        let h = layout.heights[i]!;
        if (tween && (i === tween.a || i === tween.b)) {
          if (tween.kind === StepKind.Swap) {
            x = lerp((i === tween.a ? tween.b : tween.a) * slot, x, t);
          } else if (tween.kind === StepKind.Write) {
            h = lerp(barHeight(tween.fromValue, min, max, chartHeight, minHeight), h, t);
          }
        }

        const highlighted = highlight !== null && (i === highlight.a || i === highlight.b);
        const moving =
          highlighted && (highlight.kind === StepKind.Swap || highlight.kind === StepKind.Write);
        const comparing =
          highlighted && (highlight.kind === StepKind.Compare || highlight.kind === StepKind.Read);
        const isSorted = player.sorted[i] === 1 || i < sweepCount;
        const hue = paletteIndex(values[i]!, min, max);

        ctx.fillStyle = moving
          ? colors.moving
          : comparing
            ? colors.comparing
            : (isSorted ? colors.sorted : colors.unsorted)[hue]!;
        ctx.fillRect(x, chartHeight - h, barWidth, h);

        if (moving) {
          if (barWidth > outline * 2) {
            ctx.lineWidth = outline;
            ctx.strokeStyle = colors.comparing;
            ctx.strokeRect(
              x + outline / 2,
              chartHeight - h + outline / 2,
              barWidth - outline,
              h - outline,
            );
          }
          drawMarker('circle', x, barWidth, markerTop);
        } else if (comparing) {
          drawMarker('triangle', x, barWidth, markerTop);
        } else if (isSorted) {
          ctx.fillStyle = colors.sorted[hue]!;
          ctx.fillRect(x, stripTop, barWidth, 3 * dpr);
        }
      }
    },

    dispose() {
      scheme.removeEventListener('change', onSchemeChange);
    },
  };
}
