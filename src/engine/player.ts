import { applyStep, type StepBuffer, StepKind, undoStep } from './stepBuffer';

/** Duration of the left-to-right sweep that turns every bar sorted at the end. */
export const COMPLETION_SWEEP_MS = 800;
/** Longest slide animation for one step. */
const MAX_TWEEN_MS = 250;
/** Steps shorter than one 60 Hz frame are shown without a slide. */
const FRAME_MS = 16.7;
/** Caps one frame's time delta so a stalled tab cannot fast-forward the run. */
const MAX_FRAME_DELTA_MS = 250;

/** Positions highlighted by the current step. `b` is −1 when unused. */
export interface Highlight {
  kind: StepKind;
  a: number;
  b: number;
}

/** A bar animation in progress: a slide (swap) or a height change (write). */
export interface Tween extends Highlight {
  /** For a write: the value the bar is animating from. */
  fromValue: number;
  startedAt: number;
  duration: number;
}

/** Counters reported to the store, at most once per frame. */
export interface Progress {
  position: number;
  total: number;
  comparisons: number;
  moves: number;
  elapsedMs: number;
}

export interface PlayerOptions {
  /** Clock in milliseconds. Default `performance.now`. */
  now?: () => number;
  requestFrame?: (callback: (time: number) => void) => number;
  cancelFrame?: (id: number) => void;
  /** Position and counters changed (once per frame, and after every manual action). */
  onProgress?: (progress: Progress) => void;
  /** A step was shown: the latest of a frame, or each manual step. `value` is at `a`. */
  onStep?: (highlight: Highlight, value: number) => void;
  /** The run reached its last step, by playback or Step forward. */
  onFinish?: () => void;
}

/**
 * Plays a run's precomputed steps outside React: a time-based animation-frame loop that
 * applies `speed × elapsed` steps per frame, plus manual stepping in both directions.
 * The canvas reads its public state directly; frame listeners are told when to redraw.
 */
export class Player {
  original = new Float64Array(0);
  current = new Float64Array(0);
  sorted = new Uint8Array(0);
  min = 0;
  max = 0;
  highlight: Highlight | null = null;
  tween: Tween | null = null;
  completion: { startedAt: number } | null = null;
  position = 0;
  total = 0;
  comparisons = 0;
  moves = 0;
  elapsedMs = 0;
  speed = 100;

  private buffer: StepBuffer | null = null;
  private playing = false;
  private reducedMotion = false;
  private budget = 0;
  private lastTime = 0;
  private frameId: number | null = null;
  private dirty = false;
  private wasAnimating = false;
  private readonly listeners = new Set<() => void>();
  private readonly options: Required<PlayerOptions>;

  constructor(options: PlayerOptions = {}) {
    this.options = {
      now: () => performance.now(),
      requestFrame: (cb) => requestAnimationFrame(cb),
      cancelFrame: (id) => {
        cancelAnimationFrame(id);
      },
      onProgress: () => undefined,
      onStep: () => undefined,
      onFinish: () => undefined,
      ...options,
    };
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isFinished(): boolean {
    return this.completion !== null;
  }

  /** Current time on the player's clock, for drawing animations. */
  now(): number {
    return this.options.now();
  }

  /**
   * Shows `original` and, when `buffer` is given, makes its steps playable. Stops
   * playback and resets position and counters. Pass `null` while steps are prepared.
   */
  load(original: ArrayLike<number>, buffer: StepBuffer | null): void {
    this.original = Float64Array.from(original);
    this.buffer = buffer;
    this.total = buffer?.length ?? 0;
    this.min = Infinity;
    this.max = -Infinity;
    for (const v of this.original) {
      this.min = Math.min(this.min, v);
      this.max = Math.max(this.max, v);
    }
    this.reset();
  }

  /** Starts or resumes playback. Does nothing without steps or at the end. */
  play(): void {
    if (!this.buffer || this.playing || this.position >= this.total) return;
    this.playing = true;
    this.lastTime = this.now();
    this.ensureLoop();
  }

  /** Stops playback on the current step. */
  pause(): void {
    this.playing = false;
  }

  /** Applies one step and stops playback. Returns false when there is no next step. */
  stepForward(): boolean {
    if (!this.buffer || this.position >= this.total) return false;
    this.playing = false;
    const i = this.position;
    this.apply(i);
    this.position++;
    this.show(i, this.forwardTween(i));
    if (this.position === this.total) this.finish();
    return true;
  }

  /** Undoes one step (clearing any completion) and stops playback. False at the start. */
  stepBack(): boolean {
    if (!this.buffer || this.position === 0) return false;
    this.playing = false;
    this.completion = null;
    const i = --this.position;
    this.undo(i);
    this.show(i, this.backwardTween(i));
    return true;
  }

  /** Stops playback and returns to the original order at position 0. */
  reset(): void {
    this.playing = false;
    this.current = this.original.slice();
    this.sorted = new Uint8Array(this.original.length);
    this.position = 0;
    this.comparisons = 0;
    this.moves = 0;
    this.elapsedMs = 0;
    this.budget = 0;
    this.highlight = null;
    this.tween = null;
    this.completion = null;
    this.reportProgress();
    this.invalidate();
  }

  /** Steps per second; applies from the next frame. */
  setSpeed(stepsPerSecond: number): void {
    this.speed = stepsPerSecond;
  }

  /** With reduced motion, bars never slide and the completion sweep is instant. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (!reduced) return;
    this.tween = null;
    if (this.completion) this.completion.startedAt = this.now() - COMPLETION_SWEEP_MS;
    this.invalidate();
  }

  /** Slide progress of the current tween, 0…1 (1 when there is none). */
  tweenProgress(): number {
    if (!this.tween) return 1;
    return Math.min(1, (this.now() - this.tween.startedAt) / this.tween.duration);
  }

  /** Completion sweep progress, 0…1, or null when the run is not finished. */
  sweepProgress(): number | null {
    if (!this.completion) return null;
    return Math.min(1, (this.now() - this.completion.startedAt) / COMPLETION_SWEEP_MS);
  }

  /** The recorded step at index `i`, or null outside the run. */
  stepAt(i: number): (Highlight & { value: number; previous: number }) | null {
    const buf = this.buffer;
    if (!buf || i < 0 || i >= buf.length) return null;
    return {
      kind: buf.kind[i] as StepKind,
      a: buf.a[i]!,
      b: buf.b[i]!,
      value: buf.value[i]!,
      previous: buf.previous[i]!,
    };
  }

  /** Calls `listener` on each frame where the picture changed. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Stops the loop and drops listeners. */
  dispose(): void {
    this.playing = false;
    if (this.frameId !== null) this.options.cancelFrame(this.frameId);
    this.frameId = null;
    this.listeners.clear();
  }

  private readonly frame = (): void => {
    this.frameId = null;
    if (this.playing) this.advance();
    const animating = this.isAnimating();
    if (this.tween && !animating) this.tween = null;
    if (this.dirty || animating || this.wasAnimating) {
      this.dirty = false;
      for (const listener of this.listeners) listener();
    }
    this.wasAnimating = animating;
    this.ensureLoop();
  };

  private advance(): void {
    const t = this.now();
    const dt = Math.min(t - this.lastTime, MAX_FRAME_DELTA_MS);
    this.lastTime = t;
    this.elapsedMs += dt;
    this.budget += (this.speed * dt) / 1000;
    const due = Math.floor(this.budget);
    this.budget -= due;
    const count = Math.min(due, this.total - this.position);
    if (count > 0) {
      for (let k = 0; k < count; k++) this.apply(this.position++);
      const last = this.position - 1;
      this.highlight = this.highlightOf(last);
      this.tween = count === 1 ? this.forwardTween(last) : null;
      this.options.onStep(this.highlight, this.current[this.highlight.a]!);
      this.dirty = true;
    }
    this.reportProgress();
    if (this.position === this.total) this.finish();
  }

  private apply(i: number): void {
    applyStep(this.buffer!, i, this.current, this.sorted);
    this.count(i, 1);
  }

  private undo(i: number): void {
    undoStep(this.buffer!, i, this.current, this.sorted);
    this.count(i, -1);
  }

  private count(i: number, delta: number): void {
    const kind = this.buffer!.kind[i];
    if (kind === StepKind.Compare || kind === StepKind.Read) this.comparisons += delta;
    else if (kind === StepKind.Swap || kind === StepKind.Write) this.moves += delta;
  }

  /** Shows step `i` after a manual move and reports it. */
  private show(i: number, tween: Tween | null): void {
    this.highlight = this.highlightOf(i);
    this.tween = tween;
    this.options.onStep(this.highlight, this.current[this.highlight.a]!);
    this.reportProgress();
    this.invalidate();
  }

  private finish(): void {
    this.playing = false;
    this.highlight = null;
    this.tween = null;
    const now = this.now();
    this.completion = { startedAt: this.reducedMotion ? now - COMPLETION_SWEEP_MS : now };
    this.invalidate();
    this.options.onFinish();
  }

  private highlightOf(i: number): Highlight {
    const buf = this.buffer!;
    return { kind: buf.kind[i] as StepKind, a: buf.a[i]!, b: buf.b[i]! };
  }

  private forwardTween(i: number): Tween | null {
    return this.makeTween(i, this.buffer!.previous[i]!);
  }

  private backwardTween(i: number): Tween | null {
    return this.makeTween(i, this.buffer!.value[i]!);
  }

  private makeTween(i: number, fromValue: number): Tween | null {
    const stepMs = 1000 / this.speed;
    const kind = this.buffer!.kind[i];
    if (this.reducedMotion || stepMs <= FRAME_MS) return null;
    if (kind !== StepKind.Swap && kind !== StepKind.Write) return null;
    return {
      ...this.highlightOf(i),
      fromValue,
      startedAt: this.now(),
      duration: Math.min(stepMs, MAX_TWEEN_MS),
    };
  }

  private isAnimating(): boolean {
    const sweep = this.sweepProgress();
    return this.tweenProgress() < 1 || (sweep !== null && sweep < 1);
  }

  private reportProgress(): void {
    this.options.onProgress({
      position: this.position,
      total: this.total,
      comparisons: this.comparisons,
      moves: this.moves,
      elapsedMs: this.elapsedMs,
    });
  }

  private invalidate(): void {
    this.dirty = true;
    this.ensureLoop();
  }

  private ensureLoop(): void {
    if (this.frameId !== null) return;
    if (this.playing || this.dirty || this.isAnimating() || this.wasAnimating) {
      this.frameId = this.options.requestFrame(this.frame);
    }
  }
}
