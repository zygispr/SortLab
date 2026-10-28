import { create } from 'zustand';
import { getAlgorithm } from '../algorithms/registry';
import { createDataset, type Dataset } from '../dataset/facts';
import { clampDatasetSize, DEFAULT_SIZE, randomLabel, randomValues } from '../dataset/random';
import { type Highlight, Player, type PlayerOptions } from '../engine/player';
import { StepKind } from '../engine/stepBuffer';
import { createStepsClient, type StepsClient } from '../engine/stepsClient';

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

export interface AppState {
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

  /** Sets the size for the next Generate, rounded to a step of 10 within 10–1,000. */
  setDatasetSize: (size: number) => void;
  /** Replaces the dataset with a new random one of `datasetSize` values (FR-002, FR-014). */
  generateDataset: () => void;
  /**
   * Replaces the dataset with `values` and prepares a new run (FR-014). Throws
   * `RangeError` if the values are not 2–1,000 finite numbers; callers validate first.
   */
  setDataset: (values: readonly number[], source: Dataset['source'], label: string) => void;
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
}

/** Options for tests; the app uses the defaults. */
export interface StoreOptions {
  rng?: () => number;
  stepsClient?: StepsClient;
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
 * Creates an independent store with its own player and steps client, and starts
 * preparing the first run. The app uses the shared `useAppStore`; tests create their own.
 */
export function createAppStore(options: StoreOptions = {}) {
  const rng = options.rng ?? Math.random;
  const client = options.stepsClient ?? createStepsClient();
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
    onFinish: () => {
      const { run, algorithmId, dataset, history, announce } = store.getState();
      store.setState({ run: { ...run, status: 'finished' } });
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

  const store = create<AppState>()((set, get) => {
    const setStatus = (status: RunStatus) => {
      set((s) => ({ run: { ...s.run, status } }));
    };

    const play = () => {
      player.play();
      if (player.isPlaying) setStatus('running');
    };

    const announceLoaded = () => {
      const { dataset, announce } = get();
      announce(`Loaded ${String(dataset.original.length)} values from ${dataset.label}.`);
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

      setDatasetSize: (size) => {
        set({ datasetSize: clampDatasetSize(size) });
      },

      generateDataset: () => {
        const { datasetSize, dataset } = get();
        set({
          dataset: randomDataset(datasetSize, dataset.id + 1),
          startQueued: false,
          history: [],
        });
        get().retryPrepare();
        announceLoaded();
      },

      setDataset: (values, source, label) => {
        const dataset = createDataset(values, source, label, get().dataset.id + 1);
        set({ dataset, startQueued: false, history: [] });
        get().retryPrepare();
      },

      selectAlgorithm: (id) => {
        if (id === get().algorithmId) return;
        set({ algorithmId: id, startQueued: false });
        get().retryPrepare();
      },

      setSpeed: (stepsPerSecond) => {
        const speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, stepsPerSecond));
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
        if (get().run.status === 'paused') play();
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
        const step = player.stepAt(player.position);
        if (step) get().announce(describeStep(step));
        player.stepForward();
        if (!player.isFinished) setStatus('paused');
      },

      stepBack: () => {
        if (!canStepBack(get().run)) return;
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
    };
  });

  store.getState().retryPrepare();
  return Object.assign(store, { player });
}

/** The app-wide store. */
export const useAppStore = createAppStore();

/** The app-wide player, read directly by the canvas on each frame. */
export const player = useAppStore.player;
