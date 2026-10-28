import { runAlgorithm } from '../../src/algorithms/registry';
import type { StepsClient } from '../../src/engine/stepsClient';
import {
  canReset,
  canStepBack,
  canStepForward,
  createAppStore,
  DEFAULT_SPEED,
  describeStep,
  MAX_SPEED,
  MIN_SPEED,
} from '../../src/store/appStore';
import { StepKind } from '../../src/engine/stepBuffer';
import { seeded } from '../seeded';

/** Steps client that answers from `runAlgorithm` on the next task, or fails on demand. */
interface FakeClient extends StepsClient {
  fail: boolean;
  requests: number;
}

function fakeClient(): FakeClient {
  const client: FakeClient = {
    fail: false,
    requests: 0,
    generate(algorithmId, values) {
      client.requests++;
      return client.fail
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(runAlgorithm(algorithmId, values).buffer);
    },
    dispose: () => undefined,
  };
  return client;
}

/** A store with a fake steps client and a manually driven animation clock. */
function lifecycleStore() {
  let time = 0;
  let scheduled: (() => void) | null = null;
  const client = fakeClient();
  const store = createAppStore({
    rng: seeded(1),
    stepsClient: client,
    playerOptions: {
      now: () => time,
      requestFrame: (cb) => {
        scheduled = () => {
          cb(time);
        };
        return 1;
      },
      cancelFrame: () => {
        scheduled = null;
      },
    },
  });
  const tick = (ms: number) => {
    time += ms;
    const run = scheduled;
    scheduled = null;
    run?.();
  };
  const run = () => store.getState().run;
  const announced = () => store.getState().announcement?.text;
  return { store, client, tick, run, announced };
}

const flush = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('app store (foundation)', () => {
  it('starts with a random 50-value dataset, Bubble Sort, speed 100, preparing', () => {
    const { dataset, datasetSize, algorithmId, speed, run, announcement } =
      createAppStore().getState();
    expect(dataset.original).toHaveLength(50);
    expect(dataset.source).toBe('random');
    expect(dataset.label).toBe('Random · 50 values');
    expect(datasetSize).toBe(50);
    expect(algorithmId).toBe('bubble');
    expect(speed).toBe(DEFAULT_SPEED);
    expect(speed).toBe(100);
    expect(run).toEqual({
      status: 'preparing',
      position: 0,
      total: 0,
      comparisons: 0,
      moves: 0,
      elapsedMs: 0,
      prepareError: false,
    });
    expect(announcement).toBeNull();
  });

  it('generateDataset() uses the chosen size and a new dataset id', () => {
    const store = createAppStore();
    const firstId = store.getState().dataset.id;
    store.getState().setDatasetSize(200);
    store.getState().generateDataset();
    const { dataset } = store.getState();
    expect(dataset.original).toHaveLength(200);
    expect(dataset.label).toBe('Random · 200 values');
    expect(dataset.id).toBe(firstId + 1);
  });

  it.each([
    [5, 10],
    [200, 200],
    [204, 200],
    [1500, 1000],
  ])('setDatasetSize(%d) stores %d', (input, expected) => {
    const store = createAppStore();
    store.getState().setDatasetSize(input);
    expect(store.getState().datasetSize).toBe(expected);
  });

  it('setDataset() stores the values with a new id and source', () => {
    const store = createAppStore();
    const firstId = store.getState().dataset.id;
    store.getState().setDataset([5, 3, 8, 1], 'paste', 'Pasted numbers');
    const { dataset } = store.getState();
    expect(dataset).toMatchObject({
      id: firstId + 1,
      source: 'paste',
      label: 'Pasted numbers',
      original: [5, 3, 8, 1],
    });
  });

  it('a new dataset or algorithm resets the run to preparing', () => {
    const store = createAppStore();
    store.setState({
      run: { ...store.getState().run, status: 'paused', position: 4, total: 10, comparisons: 3 },
    });
    store.getState().generateDataset();
    expect(store.getState().run).toMatchObject({ status: 'preparing', position: 0, total: 0 });

    store.setState({ run: { ...store.getState().run, status: 'finished', position: 10 } });
    store.getState().selectAlgorithm('merge');
    expect(store.getState().algorithmId).toBe('merge');
    expect(store.getState().run).toMatchObject({ status: 'preparing', position: 0 });
  });

  it('selecting the algorithm that is already selected changes nothing', () => {
    const store = createAppStore();
    store.setState({ run: { ...store.getState().run, status: 'paused', position: 4 } });
    store.getState().selectAlgorithm('bubble');
    expect(store.getState().run).toMatchObject({ status: 'paused', position: 4 });
  });

  it.each([
    [1, MIN_SPEED],
    [250, 250],
    [1_000_000, MAX_SPEED],
  ])('setSpeed(%d) stores %d', (input, expected) => {
    const store = createAppStore();
    store.getState().setSpeed(input);
    expect(store.getState().speed).toBe(expected);
  });

  it('announce() sets the text with a fresh seq, even for repeated text', () => {
    const store = createAppStore();
    store.getState().announce('Paused.');
    const first = store.getState().announcement;
    store.getState().announce('Paused.');
    const second = store.getState().announcement;
    expect(first?.text).toBe('Paused.');
    expect(second?.text).toBe('Paused.');
    expect(second?.seq).toBeGreaterThan(first?.seq ?? Infinity);
  });
});

describe('run lifecycle (T045)', () => {
  it('prepares steps on creation, then becomes ready with the run length', async () => {
    const { store, run } = lifecycleStore();
    expect(run().status).toBe('preparing');
    await flush();
    const expected = runAlgorithm('bubble', store.getState().dataset.original).buffer.length;
    expect(run()).toMatchObject({ status: 'ready', position: 0, total: expected });
  });

  it('queues Start pressed while preparing and begins when steps arrive', async () => {
    const { store, run } = lifecycleStore();
    store.getState().start();
    expect(store.getState().startQueued).toBe(true);
    await flush();
    expect(run().status).toBe('running');
    expect(store.getState().startQueued).toBe(false);
    expect(store.player.isPlaying).toBe(true);
  });

  it('plays, pauses, and resumes; togglePlay switches between them', async () => {
    const { store, run, tick } = lifecycleStore();
    await flush();
    store.getState().setSpeed(1000);
    store.getState().start();
    tick(16);
    expect(run()).toMatchObject({ status: 'running', position: 16 });
    store.getState().pause();
    tick(100);
    expect(run()).toMatchObject({ status: 'paused', position: 16 });
    store.getState().resume();
    expect(run().status).toBe('running');
    store.getState().togglePlay();
    expect(run().status).toBe('paused');
    store.getState().togglePlay();
    expect(run().status).toBe('running');
  });

  it('forwards speed changes to the player', () => {
    const { store } = lifecycleStore();
    store.getState().setSpeed(2500);
    expect(store.player.speed).toBe(2500);
  });

  it('steps forward from ready into paused and announces the step', async () => {
    const { store, run, announced } = lifecycleStore();
    await flush();
    store.getState().stepForward();
    expect(run()).toMatchObject({ status: 'paused', position: 1, comparisons: 1 });
    expect(announced()).toBe('Comparing positions 1 and 2.');
    store.getState().stepBack();
    expect(run()).toMatchObject({ status: 'paused', position: 0, comparisons: 0 });
    expect(announced()).toBe('Undid: Comparing positions 1 and 2.');
  });

  it('finishes when Step forward reaches the end, and Step back returns to paused', async () => {
    const { store, run, announced } = lifecycleStore();
    await flush();
    while (canStepForward(run())) store.getState().stepForward();
    expect(run().status).toBe('finished');
    expect(run().position).toBe(run().total);
    expect(announced()).toMatch(/^Sorted with Bubble Sort: [\d,]+ comparisons, [\d,]+ moves\.$/);
    store.getState().stepBack();
    expect(run()).toMatchObject({ status: 'paused', position: run().total - 1 });
  });

  it('finishes when playback reaches the end', async () => {
    const { store, run, tick } = lifecycleStore();
    await flush();
    store.getState().setSpeed(MAX_SPEED);
    store.getState().start();
    tick(200);
    expect(run().status).toBe('finished');
    expect(run().elapsedMs).toBeGreaterThan(0);
  });

  it('Reset returns to ready at step 0 with the original order', async () => {
    const { store, run, tick } = lifecycleStore();
    await flush();
    store.getState().setSpeed(1000);
    store.getState().start();
    tick(16);
    store.getState().reset();
    expect(run()).toMatchObject({ status: 'ready', position: 0, comparisons: 0, elapsedMs: 0 });
    expect(Array.from(store.player.current)).toEqual(store.getState().dataset.original);
  });

  it('Start after finishing resets and runs again', async () => {
    const { store, run, tick } = lifecycleStore();
    await flush();
    store.getState().setSpeed(MAX_SPEED);
    store.getState().start();
    tick(200);
    store.getState().start();
    expect(run()).toMatchObject({ status: 'running', position: 0 });
  });

  it('a new dataset or algorithm mid-run stops playback and prepares again', async () => {
    const { store, run, client } = lifecycleStore();
    await flush();
    store.getState().start();
    store.getState().generateDataset();
    expect(run().status).toBe('preparing');
    expect(store.player.isPlaying).toBe(false);
    expect(Array.from(store.player.current)).toEqual(store.getState().dataset.original);
    await flush();
    expect(run().status).toBe('ready');

    store.getState().start();
    store.getState().selectAlgorithm('merge');
    expect(run().status).toBe('preparing');
    expect(store.player.isPlaying).toBe(false);
    await flush();
    expect(run().total).toBe(
      runAlgorithm('merge', store.getState().dataset.original).buffer.length,
    );
    expect(client.requests).toBe(3);
  });

  it('shows a prepare error and recovers on retry', async () => {
    const { store, run, client } = lifecycleStore();
    client.fail = true;
    store.getState().retryPrepare();
    await flush();
    expect(run()).toMatchObject({ status: 'preparing', prepareError: true });
    client.fail = false;
    store.getState().retryPrepare();
    expect(run().prepareError).toBe(false);
    await flush();
    expect(run().status).toBe('ready');
  });

  it('exposes which controls are enabled (ui-contract.md → Controls)', () => {
    const base = { position: 0, total: 10, comparisons: 0, moves: 0, elapsedMs: 0 };
    const at = (
      status: 'preparing' | 'ready' | 'running' | 'paused' | 'finished',
      position: number,
    ) => ({
      ...base,
      status,
      position,
      prepareError: false,
    });
    expect(canStepForward(at('ready', 0))).toBe(true);
    expect(canStepForward(at('running', 3))).toBe(false);
    expect(canStepForward(at('paused', 10))).toBe(false);
    expect(canStepBack(at('paused', 0))).toBe(false);
    expect(canStepBack(at('finished', 10))).toBe(true);
    expect(canStepBack(at('running', 5))).toBe(false);
    expect(canReset(at('running', 5))).toBe(true);
    expect(canReset(at('ready', 0))).toBe(false);
    expect(canReset(at('preparing', 0))).toBe(false);
  });

  it.each([
    [{ kind: StepKind.Compare, a: 3, b: 4, value: 0 }, 'Comparing positions 4 and 5.'],
    [{ kind: StepKind.Read, a: 11, b: -1, value: 0 }, 'Reading position 12.'],
    [{ kind: StepKind.Swap, a: 3, b: 4, value: 0 }, 'Swapped positions 4 and 5.'],
    [{ kind: StepKind.Write, a: 11, b: -1, value: 37 }, 'Wrote 37 at position 12.'],
    [{ kind: StepKind.MarkSorted, a: 11, b: -1, value: 0 }, 'Position 12 is in its final place.'],
  ])('describeStep(%o) → %s', (step, text) => {
    expect(describeStep(step)).toBe(text);
  });
});
