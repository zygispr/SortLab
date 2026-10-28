import { COMPLETION_SWEEP_MS } from '../engine/player';
import { clamp } from '../util/clamp';

/** Pitch of the smallest and largest values, in hertz (research §5). */
const MIN_PITCH_HZ = 200;
const MAX_PITCH_HZ = 1200;
/** Most tones in the completion sweep, however many values there are. */
const MAX_SWEEP_TONES = 64;

const ATTACK_S = 0.002;
const DECAY_S = 0.08;
/** Peak gain of one note before the master gain; low enough that overlaps stay soft. */
const NOTE_PEAK = 0.25;
/** Exponential ramps cannot reach 0, so notes decay to this instead. */
const SILENT = 0.0001;
/** Time constant for volume changes: fast enough to feel instant, slow enough not to click. */
const VOLUME_SMOOTHING_S = 0.01;
const SWEEP_S = COMPLETION_SWEEP_MS / 1000;

/**
 * Frequency for `value` on an exponential scale from 200 Hz at `min` to 1,200 Hz at `max`,
 * so equal value steps sound like equal musical intervals. Returns 200 Hz when
 * `min === max`; values outside the range are clamped to it.
 */
export function pitchFor(value: number, min: number, max: number): number {
  if (!(max > min)) return MIN_PITCH_HZ;
  const t = clamp((value - min) / (max - min), 0, 1);
  return MIN_PITCH_HZ * (MAX_PITCH_HZ / MIN_PITCH_HZ) ** t;
}

/** Tones for the sort (FR-023–FR-027). Every method is safe to call before `enable()`. */
export interface SoundEngine {
  /** True when the browser has Web Audio. */
  isSupported(): boolean;
  /**
   * Creates the audio context on first call and resumes it if the browser suspended it.
   * Call from a user gesture so the browser allows sound. Does nothing when unsupported.
   */
  enable(): void;
  /** Silences or restores the master gain at once (FR-025). Starts muted. */
  setMuted(muted: boolean): void;
  /** Sets the master volume, clamped to 0–1, from the next audio tick. Starts at 0.5. */
  setVolume(volume: number): void;
  /** Starts a new animation frame; allows one more tone (FR-027). */
  beginFrame(): void;
  /** Plays one short tone pitched by `value` within `min…max`, at most once per frame. */
  playStep(value: number, min: number, max: number): void;
  /** Plays a rising sweep of up to 64 tones across `sortedValues` over 800 ms (FR-024). */
  playCompletionSweep(sortedValues: ArrayLike<number>): void;
  /** Closes the audio context; a later `enable()` creates a new one. */
  dispose(): void;
}

type ContextFactory = () => AudioContext;

/** The browser's AudioContext constructor (prefixed on older Safari), or null. */
function browserContextFactory(): ContextFactory | null {
  const g = globalThis as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Context = g.AudioContext ?? g.webkitAudioContext;
  return Context ? () => new Context() : null;
}

/**
 * Creates a sound engine using Web Audio: each tone is an oscillator with a short
 * attack/decay envelope, mixed through a master gain and a compressor so fast playback
 * does not build up loudness (research §5). The audio context is created lazily by
 * `enable()`. `createContext` replaces the browser's AudioContext (for tests).
 */
export function createSoundEngine(createContext?: ContextFactory): SoundEngine {
  const factory = createContext ?? browserContextFactory();
  let audio: { ctx: AudioContext; master: GainNode } | null = null;
  let muted = true;
  let volume = 0.5;
  let toneThisFrame = false;

  const note = (frequency: number, at: number) => {
    if (!audio) return;
    const { ctx, master } = audio;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    const end = at + ATTACK_S + DECAY_S;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, at);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(NOTE_PEAK, at + ATTACK_S);
    envelope.gain.exponentialRampToValueAtTime(SILENT, end);
    osc.connect(envelope);
    envelope.connect(master);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
    };
    osc.start(at);
    osc.stop(end + 0.01);
  };

  return {
    isSupported: () => factory !== null,

    enable() {
      if (!factory) return;
      if (!audio) {
        const ctx = factory();
        const master = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        master.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
        master.connect(compressor);
        compressor.connect(ctx.destination);
        audio = { ctx, master };
      }
      if (audio.ctx.state === 'suspended') void audio.ctx.resume();
    },

    setMuted(value) {
      muted = value;
      if (!audio) return;
      const { ctx, master } = audio;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
    },

    setVolume(value) {
      volume = clamp(value, 0, 1);
      if (!audio || muted) return;
      const { ctx, master } = audio;
      master.gain.setTargetAtTime(volume, ctx.currentTime, VOLUME_SMOOTHING_S);
    },

    beginFrame() {
      toneThisFrame = false;
    },

    playStep(value, min, max) {
      if (!audio || muted || toneThisFrame) return;
      toneThisFrame = true;
      note(pitchFor(value, min, max), audio.ctx.currentTime);
    },

    playCompletionSweep(sortedValues) {
      const n = sortedValues.length;
      if (!audio || muted || n === 0) return;
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < n; i++) {
        min = Math.min(min, sortedValues[i]!);
        max = Math.max(max, sortedValues[i]!);
      }
      const count = Math.min(MAX_SWEEP_TONES, n);
      const start = audio.ctx.currentTime;
      for (let k = 0; k < count; k++) {
        const index = count === 1 ? 0 : Math.round((k * (n - 1)) / (count - 1));
        note(pitchFor(sortedValues[index]!, min, max), start + (k * SWEEP_S) / count);
      }
    },

    dispose() {
      void audio?.ctx.close();
      audio = null;
    },
  };
}
