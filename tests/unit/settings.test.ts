import type { StepsClient } from '../../src/engine/stepsClient';
import {
  createAppStore,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SETTINGS_VERSION,
} from '../../src/store/appStore';
import { fakeSoundEngine } from '../fakeSound';

/** A client that never answers, so these tests only see settings. */
const idleClient: StepsClient = {
  generate: () => new Promise(() => undefined),
  dispose: () => undefined,
};

function store() {
  const sound = fakeSoundEngine();
  return { store: createAppStore({ stepsClient: idleClient, soundEngine: sound }), sound };
}

const stored = () => JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as unknown;

const settingsOf = (s: ReturnType<typeof store>['store']) => {
  const { muted, volume, soundPromptAnswered } = s.getState();
  return { muted, volume, soundPromptAnswered };
};

describe('settings (data-model.md → Settings)', () => {
  it('defaults to muted, volume 0.5, prompt not answered', () => {
    expect(DEFAULT_SETTINGS).toEqual({ muted: true, volume: 0.5, soundPromptAnswered: false });
    expect(settingsOf(store().store)).toEqual(DEFAULT_SETTINGS);
  });

  it('persists changes under sortlab:settings with version 1', () => {
    const { store: s } = store();
    s.getState().enableSound();
    s.getState().setVolume(0.8);
    expect(SETTINGS_KEY).toBe('sortlab:settings');
    expect(stored()).toEqual({
      state: { muted: false, volume: 0.8, soundPromptAnswered: true },
      version: SETTINGS_VERSION,
    });
    expect(SETTINGS_VERSION).toBe(1);
  });

  it('restores stored settings in a new store and applies them to the sound engine', () => {
    store().store.getState().dismissSoundPrompt();
    const first = store().store;
    first.getState().toggleMute();
    first.getState().setVolume(0.2);

    const { store: next, sound } = store();
    expect(settingsOf(next)).toEqual({ muted: false, volume: 0.2, soundPromptAnswered: true });
    expect(sound.setMuted).toHaveBeenLastCalledWith(false);
    expect(sound.setVolume).toHaveBeenLastCalledWith(0.2);
  });

  it('does not persist speed, algorithm, or dataset', () => {
    const { store: s } = store();
    s.getState().setSpeed(5000);
    s.getState().selectAlgorithm('merge');
    s.getState().setDatasetSize(300);
    s.getState().generateDataset();
    s.getState().setVolume(0.3);
    const { state } = stored() as { state: Record<string, unknown> };
    expect(Object.keys(state).sort()).toEqual(['muted', 'soundPromptAnswered', 'volume']);

    const next = store().store.getState();
    expect(next.speed).toBe(100);
    expect(next.algorithmId).toBe('bubble');
    expect(next.dataset.original).toHaveLength(50);
  });

  it.each([
    ['missing', null],
    ['malformed JSON', '{not json'],
    ['an unknown version', JSON.stringify({ state: { muted: false, volume: 0.9 }, version: 7 })],
    ['wrong field types', JSON.stringify({ state: { muted: 'no', volume: 5 }, version: 1 })],
    ['a non-object state', JSON.stringify({ state: 42, version: 1 })],
  ])('falls back to defaults when storage is %s', (_, raw) => {
    if (raw !== null) localStorage.setItem(SETTINGS_KEY, raw);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(settingsOf(store().store)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields when only some stored fields are bad', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ state: { muted: false, volume: 'loud' }, version: 1 }),
    );
    expect(settingsOf(store().store)).toEqual({ ...DEFAULT_SETTINGS, muted: false });
  });
});
