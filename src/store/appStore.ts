import { create } from 'zustand';
import { createDataset, type Dataset } from '../dataset/facts';
import { clampDatasetSize, DEFAULT_SIZE, randomLabel, randomValues } from '../dataset/random';

/** Algorithm selected on arrival (spec Assumptions). */
export const DEFAULT_ALGORITHM_ID = 'bubble';

/** Playback speed limits and default, in steps per second (research §4). */
export const MIN_SPEED = 2;
export const MAX_SPEED = 60_000;
export const DEFAULT_SPEED = 100;

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

/** One message for the polite live region; `seq` changes on every call. */
export interface Announcement {
  text: string;
  seq: number;
}

export interface AppState {
  dataset: Dataset;
  /** Size used by the next Generate (10–1,000, step 10). */
  datasetSize: number;
  algorithmId: string;
  run: RunState;
  /** Playback speed in steps per second (2–60,000). */
  speed: number;
  announcement: Announcement | null;

  /** Sets the size for the next Generate, rounded to a step of 10 within 10–1,000. */
  setDatasetSize: (size: number) => void;
  /** Replaces the dataset with a new random one of `datasetSize` values (FR-002, FR-014). */
  generateDataset: () => void;
  /**
   * Replaces the dataset with `values` and resets the run (FR-014). Throws `RangeError` if
   * the values are not 2–1,000 finite numbers; callers validate input first.
   */
  setDataset: (values: readonly number[], source: Dataset['source'], label: string) => void;
  /** Selects another algorithm and resets the run; selecting the current one does nothing. */
  selectAlgorithm: (id: string) => void;
  /** Sets the playback speed, clamped to 2–60,000 steps per second. */
  setSpeed: (stepsPerSecond: number) => void;
  /** Sends `text` to the live region; repeated text is announced again. */
  announce: (text: string) => void;
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

/**
 * Creates an independent store. The app uses the shared `useAppStore`; tests create their
 * own so they start from a clean state. `rng` drives random datasets.
 */
export function createAppStore(rng: () => number = Math.random) {
  const randomDataset = (size: number, id: number) =>
    createDataset(randomValues(size, rng), 'random', randomLabel(size), id);

  return create<AppState>()((set, get) => ({
    dataset: randomDataset(DEFAULT_SIZE, 1),
    datasetSize: DEFAULT_SIZE,
    algorithmId: DEFAULT_ALGORITHM_ID,
    run: initialRun(),
    speed: DEFAULT_SPEED,
    announcement: null,

    setDatasetSize: (size) => {
      set({ datasetSize: clampDatasetSize(size) });
    },

    generateDataset: () => {
      const { datasetSize, dataset } = get();
      set({ dataset: randomDataset(datasetSize, dataset.id + 1), run: initialRun() });
    },

    setDataset: (values, source, label) => {
      const dataset = createDataset(values, source, label, get().dataset.id + 1);
      set({ dataset, run: initialRun() });
    },

    selectAlgorithm: (id) => {
      if (id === get().algorithmId) return;
      set({ algorithmId: id, run: initialRun() });
    },

    setSpeed: (stepsPerSecond) => {
      set({ speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, stepsPerSecond)) });
    },

    announce: (text) => {
      set({ announcement: { text, seq: (get().announcement?.seq ?? 0) + 1 } });
    },
  }));
}

/** The app-wide store. */
export const useAppStore = createAppStore();
