import { createSoundEngine, pitchFor } from '../../src/audio/soundEngine';

/** One scheduling call made on a fake `AudioParam`. */
type ParamCall = [method: string, value: number, time: number, ...rest: number[]];

class FakeParam {
  value = 1;
  calls: ParamCall[] = [];
  setValueAtTime(value: number, time: number) {
    this.calls.push(['setValueAtTime', value, time]);
    this.value = value;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.calls.push(['linearRampToValueAtTime', value, time]);
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.calls.push(['exponentialRampToValueAtTime', value, time]);
  }
  setTargetAtTime(value: number, time: number, constant: number) {
    this.calls.push(['setTargetAtTime', value, time, constant]);
  }
  cancelScheduledValues(time: number) {
    this.calls.push(['cancelScheduledValues', 0, time]);
  }
}

class FakeNode {
  connections: unknown[] = [];
  connect(node: unknown) {
    this.connections.push(node);
    return node;
  }
  disconnect() {
    this.connections = [];
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  start(time: number) {
    this.startedAt = time;
  }
  stop(time: number) {
    this.stoppedAt = time;
  }
}

class FakeCompressor extends FakeNode {}

/** Records every node it creates so tests can follow the audio graph. */
class FakeAudioContext {
  currentTime = 10;
  state = 'running';
  destination = new FakeNode();
  gains: FakeGain[] = [];
  oscillators: FakeOscillator[] = [];
  compressors: FakeCompressor[] = [];
  closed = false;
  createGain() {
    const node = new FakeGain();
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = new FakeOscillator();
    this.oscillators.push(node);
    return node;
  }
  createDynamicsCompressor() {
    const node = new FakeCompressor();
    this.compressors.push(node);
    return node;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

function setup() {
  const contexts: FakeAudioContext[] = [];
  const engine = createSoundEngine(() => {
    const ctx = new FakeAudioContext();
    contexts.push(ctx);
    return ctx as unknown as AudioContext;
  });
  const ctx = () => {
    const c = contexts[0];
    if (!c) throw new Error('No AudioContext was created');
    return c;
  };
  // The master gain is the first gain node; per-note envelopes come after it.
  const master = () => ctx().gains[0]!;
  return { engine, contexts, ctx, master };
}

/** Enabled and unmuted at full volume, as after "Turn on sound". */
function enabled() {
  const s = setup();
  s.engine.setVolume(1);
  s.engine.enable();
  s.engine.setMuted(false);
  return s;
}

describe('pitchFor', () => {
  it('maps the smallest value to 200 Hz and the largest to 1,200 Hz', () => {
    expect(pitchFor(1, 1, 1000)).toBeCloseTo(200);
    expect(pitchFor(1000, 1, 1000)).toBeCloseTo(1200);
  });

  it('is exponential: the midpoint value is the geometric mean of the range', () => {
    expect(pitchFor(50, 0, 100)).toBeCloseTo(Math.sqrt(200 * 1200));
    expect(pitchFor(-5, -10, 0)).toBeCloseTo(Math.sqrt(200 * 1200));
  });

  it('rises with value', () => {
    expect(pitchFor(3, 0, 10)).toBeLessThan(pitchFor(4, 0, 10));
  });

  it('returns 200 Hz when every value is equal', () => {
    expect(pitchFor(7, 7, 7)).toBe(200);
  });
});

describe('sound engine', () => {
  it('creates no AudioContext before enable()', () => {
    const { engine, contexts } = setup();
    engine.setMuted(false);
    engine.setVolume(0.8);
    engine.beginFrame();
    engine.playStep(5, 0, 10);
    engine.playCompletionSweep([1, 2, 3]);
    expect(contexts).toHaveLength(0);
    engine.enable();
    expect(contexts).toHaveLength(1);
    engine.enable();
    expect(contexts).toHaveLength(1);
  });

  it('routes tones through a per-note envelope, master gain, and a compressor', () => {
    const { engine, ctx, master } = enabled();
    engine.beginFrame();
    engine.playStep(5, 0, 10);
    const [osc] = ctx().oscillators;
    const envelope = ctx().gains[1]!;
    const [compressor] = ctx().compressors;
    expect(osc?.connections).toEqual([envelope]);
    expect(envelope.connections).toEqual([master()]);
    expect(master().connections).toEqual([compressor]);
    expect(compressor?.connections).toEqual([ctx().destination]);
  });

  it('plays a short tone at the value pitch with a ≈2 ms attack and ≈80 ms decay', () => {
    const { engine, ctx } = enabled();
    engine.beginFrame();
    engine.playStep(10, 0, 10);
    const osc = ctx().oscillators[0]!;
    const t = osc.startedAt!;
    expect(osc.frequency.calls[0]).toEqual(['setValueAtTime', 1200, t]);
    const calls = ctx().gains[1]!.gain.calls;
    const attack = calls.find(([m]) => m === 'linearRampToValueAtTime')!;
    const decay = calls.find(([m]) => m === 'exponentialRampToValueAtTime')!;
    expect(calls[0]).toEqual(['setValueAtTime', 0, t]);
    expect(attack[2] - t).toBeCloseTo(0.002, 4);
    expect(decay[2] - attack[2]).toBeCloseTo(0.08, 3);
    expect(decay[1]).toBeGreaterThan(0);
    expect(osc.stoppedAt).toBeGreaterThanOrEqual(decay[2]);
  });

  it('starts each tone within 50 ms of the audio clock (SC-006)', () => {
    const { engine, ctx } = enabled();
    for (let i = 0; i < 5; i++) {
      ctx().currentTime += 0.016;
      engine.beginFrame();
      engine.playStep(i, 0, 4);
      const osc = ctx().oscillators[i]!;
      expect(osc.startedAt! - ctx().currentTime).toBeGreaterThanOrEqual(0);
      expect(osc.startedAt! - ctx().currentTime).toBeLessThanOrEqual(0.05);
    }
  });

  it('plays at most one tone per frame', () => {
    const { engine, ctx } = enabled();
    engine.beginFrame();
    engine.playStep(1, 0, 10);
    engine.playStep(2, 0, 10);
    engine.playStep(3, 0, 10);
    expect(ctx().oscillators).toHaveLength(1);
    engine.beginFrame();
    engine.playStep(4, 0, 10);
    expect(ctx().oscillators).toHaveLength(2);
  });

  it('plays nothing while muted', () => {
    const { engine, ctx } = enabled();
    engine.setMuted(true);
    engine.beginFrame();
    engine.playStep(1, 0, 10);
    engine.playCompletionSweep([1, 2, 3]);
    expect(ctx().oscillators).toHaveLength(0);
  });

  it('silences the master gain immediately on mute and restores the volume on unmute', () => {
    const { engine, ctx, master } = enabled();
    engine.setVolume(0.4);
    engine.setMuted(true);
    expect(master().gain.calls.at(-1)).toEqual(['setValueAtTime', 0, ctx().currentTime]);
    engine.setMuted(false);
    expect(master().gain.calls.at(-1)).toEqual(['setValueAtTime', 0.4, ctx().currentTime]);
  });

  it('starts the master gain at 0 when enabled while muted', () => {
    const { engine, ctx, master } = setup();
    engine.enable();
    expect(master().gain.calls.at(-1)).toEqual(['setValueAtTime', 0, ctx().currentTime]);
  });

  it('applies a volume change on the next audio tick', () => {
    const { engine, ctx, master } = enabled();
    engine.setVolume(0.3);
    const [method, value, time, constant] = master().gain.calls.at(-1)!;
    expect(method).toBe('setTargetAtTime');
    expect(value).toBe(0.3);
    expect(time).toBe(ctx().currentTime);
    expect(constant).toBeLessThanOrEqual(0.02);
  });

  it('clamps the volume to 0–1', () => {
    const { engine, master } = enabled();
    engine.setVolume(3);
    expect(master().gain.calls.at(-1)?.[1]).toBe(1);
    engine.setVolume(-1);
    expect(master().gain.calls.at(-1)?.[1]).toBe(0);
  });

  it('plays a rising completion sweep of at most 64 tones over 800 ms', () => {
    const { engine, ctx } = enabled();
    const sorted = Array.from({ length: 1000 }, (_, i) => i + 1);
    engine.playCompletionSweep(sorted);
    const tones = ctx().oscillators;
    expect(tones.length).toBeGreaterThan(1);
    expect(tones.length).toBeLessThanOrEqual(64);
    const starts = tones.map((o) => o.startedAt! - ctx().currentTime);
    const pitches = tones.map((o) => o.frequency.calls[0]![1]);
    expect(starts[0]).toBeCloseTo(0);
    expect(Math.max(...starts)).toBeLessThan(0.8);
    for (let i = 1; i < tones.length; i++) {
      expect(starts[i]).toBeGreaterThan(starts[i - 1]!);
      expect(pitches[i]).toBeGreaterThan(pitches[i - 1]!);
    }
    expect(pitches[0]).toBeCloseTo(200);
    expect(pitches.at(-1)).toBeCloseTo(1200);
  });

  it('plays one tone per value for a short sweep', () => {
    const { engine, ctx } = enabled();
    engine.playCompletionSweep([1, 2, 3, 4]);
    expect(ctx().oscillators).toHaveLength(4);
  });

  it('resumes a suspended context on enable()', () => {
    const { engine, ctx } = enabled();
    ctx().state = 'suspended';
    engine.enable();
    expect(ctx().state).toBe('running');
  });

  it('closes the context on dispose()', () => {
    const { engine, ctx } = enabled();
    engine.dispose();
    expect(ctx().closed).toBe(true);
  });
});

describe('sound support', () => {
  const g = globalThis as { AudioContext?: unknown; webkitAudioContext?: unknown };

  afterEach(() => {
    delete g.AudioContext;
    delete g.webkitAudioContext;
  });

  it('is unsupported when neither AudioContext nor webkitAudioContext exists', () => {
    delete g.AudioContext;
    delete g.webkitAudioContext;
    const engine = createSoundEngine();
    expect(engine.isSupported()).toBe(false);
    expect(() => {
      engine.enable();
    }).not.toThrow();
  });

  it('uses AudioContext, or webkitAudioContext on older Safari', () => {
    g.webkitAudioContext = FakeAudioContext;
    expect(createSoundEngine().isSupported()).toBe(true);
    delete g.webkitAudioContext;
    g.AudioContext = FakeAudioContext;
    expect(createSoundEngine().isSupported()).toBe(true);
  });

  it('is supported when a context factory is injected', () => {
    expect(createSoundEngine(() => new FakeAudioContext() as unknown as AudioContext)).toSatisfy(
      (e: ReturnType<typeof createSoundEngine>) => e.isSupported(),
    );
  });
});
