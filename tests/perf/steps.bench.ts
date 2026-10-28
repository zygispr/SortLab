import { runAlgorithm } from '../../src/algorithms/registry';
import { seeded, shuffled } from '../seeded';

/**
 * Step generation cost for the largest dataset (quickstart.md → Performance checks).
 * Target: Gnome Sort on 1,000 reversed values in under 300 ms, the worst case the worker
 * has to prepare before a run can start.
 */

const reversed = Float64Array.from({ length: 1000 }, (_, i) => 1000 - i);
const random = Float64Array.from(
  shuffled(
    Array.from({ length: 1000 }, (_, i) => i + 1),
    seeded(1),
  ),
);

describe('step generation, 1,000 values', () => {
  test('gnome, reversed (target < 300 ms)', async ({ bench }) => {
    const result = await bench('gnome, reversed', () => {
      runAlgorithm('gnome', reversed);
    }).run();
    expect(result.latency.mean).toBeLessThan(300);
  });

  test('bubble, reversed', async ({ bench }) => {
    await bench('bubble, reversed', () => {
      runAlgorithm('bubble', reversed);
    }).run();
  });

  test('merge, random', async ({ bench }) => {
    await bench('merge, random', () => {
      runAlgorithm('merge', random);
    }).run();
  });
});
