import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSoundEngine, type SoundEngine } from '../audio/soundEngine';
import { checkSupport, getAlgorithm } from '../algorithms/registry';
import { createDataset, type Dataset, toFacts } from '../dataset/facts';
import { clampDatasetSize, DEFAULT_SIZE, randomLabel, randomValues } from '../dataset/random';
import { type Highlight, Player, type PlayerOptions } from '../engine/player';
import { StepKind } from '../engine/stepBuffer';
import { createStepsClient, type StepsClient } from '../engine/stepsClient';
import { clamp } from '../util/clamp';

/** Algorithm selected on arrival (spec Assumptions). */
const DEFAULT_ALGORITHM_ID = 'bubble';

/** Playback speed limits and default, in steps per second (research §4). */
export const MIN_SPEED = 2;
export const MAX_SPEED = 60_000;
export const DEFAULT_SPEED = 100;

/** Sound settings remembered on this device (data-model.md → Settings). */
export interface SoundSettings {
  muted: boolean;
  /** Master volume, 0–1. */
  volume: number;
}

/** `localStorage` key and schema version of the persisted settings. */
export const SETTINGS_KEY = 'sortlab:settings';
export const SETTINGS_VERSION = 1;
/** Sound is off for first-time visitors (FR-026a), at half volume once unmuted. */
export const DEFAULT_SETTINGS: Readonly<SoundSettings> = {
  muted: true,
  volume: 0.5,
};

/** Valid fields of stored settings; missing or malformed fields fall back to the defaults. */
function readSettings(stored: unknown): SoundSettings {
  const s: Partial<Record<keyof SoundSettings, unknown>> =
    typeof stored === 'object' && stored !== null ? stored : {};
  const { muted, volume } = s;
  return {
    muted: typeof muted === 'boolean' ? muted : DEFAULT_SETTINGS.muted,
    volume:
      typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : DEFAULT_SETTINGS.volume,
  };
}

/** Run status (data-model.md → RunStatus state machine). */
export type RunStatus = 'preparing' | 'ready' | 'running' | 'paused' | 'finished';

/** The UI-facing part of the current run; per-frame details live in the player. */
export interface RunState {
  status: RunStatus;
  /** Steps applied so far, 0…total. */
  position: number;
  /** Number of steps in the run; 0 until the steps are prepared. */
  total: number;
  comparisons: number;
  moves: number;
  /** Time spent running (not paused). */
  elapsedMs: number;
  /** True when step generation failed and the user needs to retry. */
  prepareError: boolean;
}

/** One row of the run summary (data-model.md → RunRecord, FR-022). */
export interface RunRecord {
  algorithmId: string;
  comparisons: number;
  moves: number;
  elapsedMs: number;
  datasetId: number;
}

/** One message for the polite live region; `seq` changes on every call. */
export interface Announcement {
  text: string;
  seq: number;
}

export interface AppState extends SoundSettings {
  dataset: Dataset;
  /** Size used by the next Generate (10–1,000, step 10). */
  datasetSize: number;
  algorithmId: string;
  run: RunState;
  /** Start was pressed while steps were still being prepared. */
  startQueued: boolean;
  /** Finished runs on the current dataset, oldest first; cleared when the dataset changes. */
  history: RunRecord[];
  /** Playback speed in steps per second (2–60,000). */
  speed: number;
  announcement: Announcement | null;
  /** Why the last upload or paste was rejected, until the next successful load. */
  dataError: string | null;
  /** Why the selection was switched to Bubble Sort, until the user picks again. */
  algorithmNotice: string | null;
  /** The browser has Web Audio; without it the sound controls are replaced by a note. */
  soundSupported: boolean;

  /** Sets the size for the next Generate, rounded to a step of 10 within 10–1,000. */
  setDatasetSize: (size: number) => void;
  /** Replaces the dataset with a new random one of `datasetSize` values (FR-002, FR-014). */
  generateDataset: () => void;
  /**
   * Replaces the dataset with uploaded or pasted `values`, clears history and any data
   * error, and prepares a new run (FR-014). If the selected algorithm cannot sort the data
   * (FR-009a), switches to Bubble Sort and says why. Throws `RangeError` if the values are
   * not 2–1,000 finite numbers; callers parse and validate first.
   */
  loadUserDataset: (values: readonly number[], source: 'upload' | 'paste', label: string) => void;
  /** Shows and announces why an upload or paste was rejected; the dataset is unchanged. */
  setDataError: (message: string) => void;
  /** Selects another algorithm and prepares a new run; the current one does nothing. */
  selectAlgorithm: (id: string) => void;
  /** Sets the playback speed, clamped to 2–60,000 steps per second. */
  setSpeed: (stepsPerSecond: number) => void;
  /** Sends `text` to the live region; repeated text is announced again. */
  announce: (text: string) => void;
  /** (Re)generates the steps for the current dataset and algorithm in the worker. */
  retryPrepare: () => void;
  /** Starts playback; queues it while preparing; restarts from the beginning if finished. */
  start: () => void;
  /** Pauses a running sort on the current step. */
  pause: () => void;
  /** Continues a paused sort from the step shown. */
  resume: () => void;
  /** Start / Pause / Resume, whichever applies (the Space key and the toggle button). */
  togglePlay: () => void;
  /** Shows the next step and stays paused (FR-012a). Ignored when not allowed. */
  stepForward: () => void;
  /** Undoes the last shown step and stays paused (FR-012a). Ignored when not allowed. */
  stepBack: () => void;
  /** Returns to the original order at step 0 without starting (US2 scenario 4). */
  reset: () => void;
  /**
   * Mute / Unmute, applied at once (FR-025). Unmuting also creates the audio if needed,
   * so call it from a user gesture.
   */
  toggleMute: () => void;
  /** Sets the volume, clamped to 0–1, applied at once (FR-025). */
  setVolume: (volume: number) => void;
}

/** Options for tests; the app uses the defaults. */
export interface StoreOptions {
  rng?: () => number;
  stepsClient?: StepsClient;
  soundEngine?: SoundEngine;
  playerOptions?: Pick<PlayerOptions, 'now' | 'requestFrame' | 'cancelFrame'>;
}

function initialRun(): RunState {
  return {
    status: 'preparing',
    position: 0,
    total: 0,
    comparisons: 0,
    moves: 0,
    elapsedMs: 0,
    prepareError: false,
  };
}

/** Step forward is enabled in `ready` or `paused` before the last step. */
export const canStepForward = (run: RunState) =>
  (run.status === 'ready' || run.status === 'paused') && run.position < run.total;

/** Step back is enabled in `paused` or `finished` after the first step. */
export const canStepBack = (run: RunState) =>
  (run.status === 'paused' || run.status === 'finished') && run.position > 0;

/** Reset is enabled once any step has been shown. */
export const canReset = (run: RunState) => run.status !== 'preparing' && run.position > 0;

/** Live-region text for a manually shown step, with 1-based positions. */
export function describeStep(step: Highlight & { value: number }): string {
  const a = step.a + 1;
  const b = step.b + 1;
  switch (step.kind) {
    case StepKind.Compare:
      return `Comparing positions ${String(a)} and ${String(b)}.`;
    case StepKind.Read:
      return `Reading position ${String(a)}.`;
    case StepKind.Swap:
      return `Swapped positions ${String(a)} and ${String(b)}.`;
    case StepKind.Write:
      return `Wrote ${String(step.value)} at position ${String(a)}.`;
    case StepKind.MarkSorted:
      return `Position ${String(a)} is in its final place.`;
  }
}

/**
 * Creates an independent store with its own player, steps client, and sound engine,
 * restores the sound settings from `localStorage`, and starts preparing the first run.
 * The app uses the shared `useAppStore`; tests create their own.
 */
export function createAppStore(options: StoreOptions = {}) {
  const rng = options.rng ?? Math.random;
  const client = options.stepsClient ?? createStepsClient();
  const sound = options.soundEngine ?? createSoundEngine();
  let prepareToken = 0;
  // A run is recorded once. Stepping back from finished and forward again is the same run;
  // new steps, Reset, and Start-from-finished begin a new one.
  let runRecorded = false;

  const randomDataset = (size: number, id: number) =>
    createDataset(randomValues(size, rng), 'random', randomLabel(size), id);

  const player = new Player({
    ...options.playerOptions,
    onProgress: ({ position, comparisons, moves, elapsedMs }) => {
      store.setState((s) => ({ run: { ...s.run, position, comparisons, moves, elapsedMs } }));
    },
    // The player reports at most one step per frame, so this plays at most one tone per frame.
    onStep: (_highlight, value) => {
      const { muted, dataset } = store.getState();
      if (muted) return;
      sound.beginFrame();
      sound.playStep(value, dataset.min, dataset.max);
    },
    onFinish: () => {
      const { run, algorithmId, dataset, history, announce, muted } = store.getState();
      store.setState({ run: { ...run, status: 'finished' } });
      if (!muted) sound.playCompletionSweep(player.current);
      if (!runRecorded) {
        runRecorded = true;
        const { comparisons, moves, elapsedMs } = run;
        store.setState({
          history: [
            ...history,
            { algorithmId, comparisons, moves, elapsedMs, datasetId: dataset.id },
          ],
        });
      }
      const { name } = getAlgorithm(algorithmId);
      announce(
        `Sorted with ${name}: ${run.comparisons.toLocaleString()} comparisons, ${run.moves.toLocaleString()} moves.`,
      );
    },
  });
  player.setSpeed(DEFAULT_SPEED);

  const store = create<AppState>()(
    persist<AppState, [], [], SoundSettings>(
      (set, get) => {
        const setStatus = (status: RunStatus) => {
          set((s) => ({ run: { ...s.run, status } }));
        };

        // Sound left on from an earlier visit has no audio context yet; the user's Start or step
        // press is the gesture that lets the browser create (or resume) it.
        const wakeSound = () => {
          if (!get().muted) sound.enable();
        };

        const play = () => {
          player.play();
          if (player.isPlaying) setStatus('running');
        };

        const loadedMessage = () => {
          const { dataset } = get();
          return `Loaded ${String(dataset.original.length)} values from ${dataset.label}.`;
        };

        return {
          dataset: randomDataset(DEFAULT_SIZE, 1),
          datasetSize: DEFAULT_SIZE,
          algorithmId: DEFAULT_ALGORITHM_ID,
          run: initialRun(),
          startQueued: false,
          history: [],
          speed: DEFAULT_SPEED,
          announcement: null,
          dataError: null,
          algorithmNotice: null,
          soundSupported: sound.isSupported(),
          ...DEFAULT_SETTINGS,

          setDatasetSize: (size) => {
            set({ datasetSize: clampDatasetSize(size) });
          },

          generateDataset: () => {
            const { datasetSize, dataset } = get();
            set({
              dataset: randomDataset(datasetSize, dataset.id + 1),
              startQueued: false,
              history: [],
              dataError: null,
            });
            get().retryPrepare();
            get().announce(loadedMessage());
          },

          loadUserDataset: (values, source, label) => {
            const dataset = createDataset(values, source, label, get().dataset.id + 1);
            const current = getAlgorithm(get().algorithmId);
            const support = checkSupport(current, toFacts(dataset));
            const notice = support.ok
              ? null
              : `${current.name} can't sort this data (${support.reason}). Switched to ${getAlgorithm(DEFAULT_ALGORITHM_ID).name}.`;
            set({
              dataset,
              startQueued: false,
              history: [],
              dataError: null,
              ...(notice && { algorithmId: DEFAULT_ALGORITHM_ID, algorithmNotice: notice }),
            });
            get().retryPrepare();
            get().announce(notice ? `${loadedMessage()} ${notice}` : loadedMessage());
          },

          setDataError: (message) => {
            set({ dataError: message });
            get().announce(message);
          },

          selectAlgorithm: (id) => {
            if (id === get().algorithmId) return;
            set({ algorithmId: id, startQueued: false, algorithmNotice: null });
            get().retryPrepare();
          },

          setSpeed: (stepsPerSecond) => {
            const speed = clamp(stepsPerSecond, MIN_SPEED, MAX_SPEED);
            player.setSpeed(speed);
            set({ speed });
          },

          announce: (text) => {
            set({ announcement: { text, seq: (get().announcement?.seq ?? 0) + 1 } });
          },

          retryPrepare: () => {
            const { dataset, algorithmId } = get();
            const token = ++prepareToken;
            runRecorded = false;
            player.load(dataset.original, null);
            set({ run: initialRun() });
            client.generate(algorithmId, Float64Array.from(dataset.original)).then(
              (steps) => {
                if (!steps || token !== prepareToken) return;
                player.load(dataset.original, steps);
                set((s) => ({ run: { ...s.run, status: 'ready', total: steps.length } }));
                if (get().startQueued) {
                  set({ startQueued: false });
                  play();
                }
              },
              () => {
                if (token !== prepareToken) return;
                set((s) => ({ run: { ...s.run, prepareError: true }, startQueued: false }));
              },
            );
          },

          start: () => {
            const { run } = get();
            if (run.status === 'preparing') {
              if (!run.prepareError) set({ startQueued: true });
              return;
            }
            if (run.status === 'running') return;
            wakeSound();
            if (run.status === 'finished') {
              runRecorded = false;
              player.reset();
            }
            play();
          },

          pause: () => {
            if (get().run.status !== 'running') return;
            player.pause();
            setStatus('paused');
          },

          resume: () => {
            if (get().run.status !== 'paused') return;
            wakeSound();
            play();
          },

          togglePlay: () => {
            const { run, startQueued, pause, resume, start } = get();
            if (run.status === 'running') pause();
            else if (run.status === 'paused') resume();
            else if (run.status === 'preparing' && startQueued) set({ startQueued: false });
            else start();
          },

          stepForward: () => {
            if (!canStepForward(get().run)) return;
            wakeSound();
            const step = player.stepAt(player.position);
            if (step) get().announce(describeStep(step));
            player.stepForward();
            if (!player.isFinished) setStatus('paused');
          },

          stepBack: () => {
            if (!canStepBack(get().run)) return;
            wakeSound();
            const step = player.stepAt(player.position - 1);
            player.stepBack();
            setStatus('paused');
            if (step) get().announce(`Undid: ${describeStep(step)}`);
          },

          reset: () => {
            if (get().run.status === 'preparing') return;
            runRecorded = false;
            player.reset();
            set({ startQueued: false });
            setStatus('ready');
          },

          toggleMute: () => {
            const muted = !get().muted;
            if (!muted) sound.enable();
            sound.setMuted(muted);
            set({ muted });
          },

          setVolume: (value) => {
            const volume = clamp(value, 0, 1);
            sound.setVolume(volume);
            set({ volume });
          },
        };
      },
      {
        name: SETTINGS_KEY,
        version: SETTINGS_VERSION,
        storage: createJSONStorage(() => localStorage),
        partialize: ({ muted, volume }) => ({ muted, volume }),
        // Settings from another schema version are not trusted: start from the defaults.
        migrate: () => ({ ...DEFAULT_SETTINGS }),
        merge: (stored, current) => ({ ...current, ...readSettings(stored) }),
      },
    ),
  );

  // localStorage is synchronous, so the settings are already restored here.
  const { muted, volume } = store.getState();
  sound.setMuted(muted);
  sound.setVolume(volume);
  store.getState().retryPrepare();
  return Object.assign(store, { player, soundEngine: sound });
}

/** The app-wide store. */
export const useAppStore = createAppStore();

/** The app-wide player, read directly by the canvas on each frame. */
export const player = useAppStore.player;

/** The app-wide sound engine, for checks such as `isSupported()`. */
export const soundEngine = useAppStore.soundEngine;
