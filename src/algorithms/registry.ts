import type { StepBuffer } from '../engine/stepBuffer';
import { binaryInsertionSort } from './binary-insertion';
import { bubbleSort } from './bubble';
import { bucketSort } from './bucket';
import { cocktailShakerSort } from './cocktail-shaker';
import { combSort } from './comb';
import { countingSort } from './counting';
import { cycleSort } from './cycle';
import { gnomeSort } from './gnome';
import { heapSort } from './heap';
import { insertionSort } from './insertion';
import { introSort } from './intro';
import { mergeSort } from './merge';
import { oddEvenSort } from './odd-even';
import { pancakeSort } from './pancake';
import { quickSort } from './quick';
import { radixLsdSort } from './radix-lsd';
import { radixMsdSort } from './radix-msd';
import { createRecorder } from './recorder';
import { selectionSort } from './selection';
import { shellSort } from './shell';
import { timSort } from './tim';
import type { AlgorithmDefinition, AlgorithmFamily, DatasetFacts, Support } from './types';

/** All algorithms, in picker order (FR-009). */
export const ALGORITHMS: readonly AlgorithmDefinition[] = [
  bubbleSort,
  cocktailShakerSort,
  oddEvenSort,
  combSort,
  gnomeSort,
  selectionSort,
  cycleSort,
  heapSort,
  pancakeSort,
  insertionSort,
  binaryInsertionSort,
  shellSort,
  mergeSort,
  quickSort,
  timSort,
  introSort,
  countingSort,
  radixLsdSort,
  radixMsdSort,
  bucketSort,
];

/** Picker group labels, in picker order. */
export const FAMILY_LABELS: Readonly<Record<AlgorithmFamily, string>> = {
  exchange: 'Exchange',
  selection: 'Selection',
  insertion: 'Insertion',
  'divide-and-conquer': 'Divide and conquer',
  hybrid: 'Hybrid',
  'non-comparison': 'Non-comparison',
};

const byId = new Map(ALGORITHMS.map((a) => [a.id, a]));

/** Returns the algorithm with `id`. Throws `Error` if there is none. */
export function getAlgorithm(id: string): AlgorithmDefinition {
  const algorithm = byId.get(id);
  if (!algorithm) throw new Error(`Unknown algorithm "${id}"`);
  return algorithm;
}

/** Whether `algorithm` can sort a dataset with these facts (FR-009a). */
export function checkSupport(algorithm: AlgorithmDefinition, facts: DatasetFacts): Support {
  return algorithm.supports ? algorithm.supports(facts) : { ok: true };
}

/**
 * Sorts a copy of `values` with algorithm `id` and returns the trimmed list of steps and
 * the sorted result. Throws `Error` for an unknown id. Used by the step worker and tests.
 */
export function runAlgorithm(
  id: string,
  values: ArrayLike<number>,
): { buffer: StepBuffer; result: Float64Array } {
  const recorder = createRecorder(values);
  getAlgorithm(id).sort(recorder);
  recorder.buffer.trim();
  return { buffer: recorder.buffer, result: recorder.result() };
}
