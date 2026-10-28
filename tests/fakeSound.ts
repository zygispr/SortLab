import type { SoundEngine } from '../src/audio/soundEngine';

/** A sound engine whose every method is a spy, for store tests. */
export function fakeSoundEngine(supported = true) {
  return {
    isSupported: vi.fn(() => supported),
    enable: vi.fn(),
    setMuted: vi.fn(),
    setVolume: vi.fn(),
    beginFrame: vi.fn(),
    playStep: vi.fn(),
    playCompletionSweep: vi.fn(),
    dispose: vi.fn(),
  } satisfies SoundEngine;
}
