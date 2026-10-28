import { runAlgorithm } from '../algorithms/registry';
import type { GenerateRequest, WorkerResponse } from './stepsClient';

/**
 * Step worker: generates a run's steps off the main thread so large runs (up to ~1.5 M
 * steps) never block input. Replies with the step arrays transferred, not copied.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (e: MessageEvent<GenerateRequest>) => {
  const { requestId, algorithmId, values } = e.data;
  try {
    const steps = runAlgorithm(algorithmId, values).buffer.toTransfer();
    const response: WorkerResponse = { type: 'done', requestId, steps };
    scope.postMessage(response, [steps.kind, steps.a, steps.b, steps.value, steps.previous]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response: WorkerResponse = { type: 'error', requestId, message };
    scope.postMessage(response);
  }
};
