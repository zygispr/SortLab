import { runAlgorithm } from '../../src/algorithms/registry';
import { COMPLETION_SWEEP_MS, Player, type PlayerOptions } from '../../src/engine/player';
import { StepKind } from '../../src/engine/stepBuffer';

const REVERSED = Array.from({ length: 20 }, (_, i) => 20 - i);

function setup(options: Partial<PlayerOptions> = {}, input: number[] = REVERSED) {
  let time = 1000;
  let scheduled: (() => void) | null = null;
  const onProgress = vi.fn();
  const onStep = vi.fn();
  const onFinish = vi.fn();
  const player = new Player({
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
    onProgress,
    onStep,
    onFinish,
    ...options,
  });
  const { buffer, result } = runAlgorithm('bubble', input);
  player.load(input, buffer);
  onProgress.mockClear();
  /** Advances the clock by `ms` and runs the pending animation frame, if any. */
  const tick = (ms: number) => {
    time += ms;
    const run = scheduled;
    scheduled = null;
    run?.();
  };
  const hasFrame = () => scheduled !== null;
  return { player, buffer, result, tick, hasFrame, onProgress, onStep, onFinish, input };
}

describe('Player playback', () => {
  it('advances speed × elapsed seconds per frame, carrying the fraction', () => {
    const { player, tick } = setup();
    player.setSpeed(100);
    player.play();
    tick(16);
    expect(player.position).toBe(1);
    tick(16);
    expect(player.position).toBe(3);
    tick(20);
    expect(player.position).toBe(5);
  });

  it('reports progress at most once per frame, however many steps it applies', () => {
    const { player, tick, onProgress } = setup();
    player.setSpeed(60_000);
    player.play();
    tick(10);
    expect(player.position).toBe(600 > player.total ? player.total : 600);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ position: player.position, total: player.total }),
    );
  });

  it('counts elapsed time only while playing', () => {
    const { player, tick } = setup();
    player.setSpeed(2);
    player.play();
    tick(100);
    tick(100);
    player.pause();
    tick(500);
    expect(player.elapsedMs).toBe(200);
  });

  it('pause() freezes the position', () => {
    const { player, tick } = setup();
    player.setSpeed(100);
    player.play();
    tick(50);
    const frozen = player.position;
    player.pause();
    tick(1000);
    expect(player.position).toBe(frozen);
    expect(player.isPlaying).toBe(false);
  });

  it('setSpeed() takes effect on the next frame without restarting', () => {
    const { player, tick } = setup();
    player.setSpeed(100);
    player.play();
    tick(20);
    expect(player.position).toBe(2);
    player.setSpeed(1000);
    tick(10);
    expect(player.position).toBe(12);
  });

  it('finishes once when playback reaches the end and starts the completion sweep', () => {
    const { player, tick, onFinish, result } = setup();
    player.setSpeed(60_000);
    player.play();
    tick(100);
    expect(player.position).toBe(player.total);
    expect(player.isFinished).toBe(true);
    expect(player.isPlaying).toBe(false);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(Array.from(player.current)).toEqual(Array.from(result));
    expect(player.highlight).toBeNull();
    expect(player.sweepProgress()).toBe(0);
    tick(COMPLETION_SWEEP_MS / 2);
    expect(player.sweepProgress()).toBeCloseTo(0.5);
  });
});

describe('Player stepping', () => {
  it('stepForward and stepBack move exactly one step and update counters and highlight', () => {
    const { player, buffer } = setup();
    expect(player.stepForward()).toBe(true);
    expect(player.position).toBe(1);
    expect(player.comparisons).toBe(1);
    expect(player.highlight).toEqual({ kind: StepKind.Compare, a: 0, b: 1 });
    player.stepForward();
    expect(player.moves).toBe(1);
    expect(player.highlight).toEqual({ kind: StepKind.Swap, a: 0, b: 1 });
    expect(Array.from(player.current.slice(0, 2))).toEqual([19, 20]);
    expect(player.stepBack()).toBe(true);
    expect(player.position).toBe(1);
    expect(player.moves).toBe(0);
    expect(Array.from(player.current.slice(0, 2))).toEqual([20, 19]);
    expect(player.highlight).toEqual({ kind: StepKind.Swap, a: 0, b: 1 });
    expect(buffer.length).toBeGreaterThan(2);
  });

  it('replays identically after stepping back to the start and forward again', () => {
    const { player } = setup();
    const snapshots: string[] = [];
    while (player.position < player.total) {
      player.stepForward();
      snapshots.push(`${String(player.comparisons)}|${Array.from(player.current).join()}`);
    }
    while (player.position > 0) player.stepBack();
    expect(Array.from(player.current)).toEqual(REVERSED);
    expect(player.comparisons + player.moves).toBe(0);
    for (const expected of snapshots) {
      player.stepForward();
      expect(`${String(player.comparisons)}|${Array.from(player.current).join()}`).toBe(expected);
    }
  });

  it('updates sorted flags forwards and backwards', () => {
    const { player, buffer } = setup();
    let i = 0;
    while (buffer.kind[i] !== StepKind.MarkSorted) i++;
    for (let k = 0; k <= i; k++) player.stepForward();
    const marked = buffer.a[i]!;
    expect(player.sorted[marked]).toBe(1);
    player.stepBack();
    expect(player.sorted[marked]).toBe(0);
  });

  it('stepForward onto the last step finishes once and starts the sweep', () => {
    const { player, onFinish } = setup();
    while (player.position < player.total - 1) player.stepForward();
    expect(onFinish).not.toHaveBeenCalled();
    player.stepForward();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(player.isFinished).toBe(true);
    expect(player.sweepProgress()).toBe(0);
    expect(player.stepForward()).toBe(false);
  });

  it('stepBack from finished clears the completion', () => {
    const { player } = setup();
    while (player.position < player.total) player.stepForward();
    player.stepBack();
    expect(player.isFinished).toBe(false);
    expect(player.sweepProgress()).toBeNull();
  });

  it('reports each manual step to onStep with the value now at its position', () => {
    const { player, onStep } = setup();
    player.stepForward();
    expect(onStep).toHaveBeenLastCalledWith({ kind: StepKind.Compare, a: 0, b: 1 }, 20);
    player.stepForward();
    expect(onStep).toHaveBeenLastCalledWith({ kind: StepKind.Swap, a: 0, b: 1 }, 19);
    player.stepBack();
    expect(onStep).toHaveBeenLastCalledWith({ kind: StepKind.Swap, a: 0, b: 1 }, 20);
    expect(onStep).toHaveBeenCalledTimes(3);
  });

  it('reports one step to onStep per frame during playback', () => {
    const { player, tick, onStep } = setup();
    player.setSpeed(1000);
    player.play();
    tick(16);
    tick(16);
    expect(player.position).toBe(32);
    expect(onStep).toHaveBeenCalledTimes(2);
  });

  it('reset() restores the original order and position 0', () => {
    const { player, tick } = setup();
    player.setSpeed(1000);
    player.play();
    tick(30);
    player.reset();
    expect(player.position).toBe(0);
    expect(player.isPlaying).toBe(false);
    expect(Array.from(player.current)).toEqual(REVERSED);
    expect(player.comparisons + player.moves + player.elapsedMs).toBe(0);
    expect(player.sorted.every((f) => f === 0)).toBe(true);
    expect(player.highlight).toBeNull();
  });

  it('cannot step or play without steps', () => {
    const player = new Player({ requestFrame: () => 0, cancelFrame: () => undefined });
    player.load([2, 1], null);
    expect(player.stepForward()).toBe(false);
    player.play();
    expect(player.isPlaying).toBe(false);
    expect(Array.from(player.current)).toEqual([2, 1]);
  });
});

describe('Player motion', () => {
  it('slides moved bars only when a step lasts longer than a frame', () => {
    const { player } = setup();
    player.setSpeed(100);
    player.stepForward();
    player.stepForward();
    expect(player.tween).toBeNull();

    player.setSpeed(50);
    player.stepBack();
    expect(player.tween).toMatchObject({ kind: StepKind.Swap, a: 0, b: 1, duration: 20 });

    player.setSpeed(2);
    player.stepForward();
    expect(player.tween?.duration).toBe(250);
  });

  it('never slides bars with reduced motion, and the sweep completes at once', () => {
    const { player } = setup();
    player.setReducedMotion(true);
    player.setSpeed(2);
    player.stepForward();
    player.stepForward();
    expect(player.tween).toBeNull();
    while (player.position < player.total) player.stepForward();
    expect(player.sweepProgress()).toBe(1);
  });

  it('notifies frame listeners only when something changed', () => {
    const { player, tick, hasFrame } = setup();
    const listener = vi.fn();
    player.subscribe(listener);
    tick(16);
    const afterLoad = listener.mock.calls.length;
    tick(16);
    expect(hasFrame()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(afterLoad);
    player.stepForward();
    tick(16);
    expect(listener).toHaveBeenCalledTimes(afterLoad + 1);
  });
});
