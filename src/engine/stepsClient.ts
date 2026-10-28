import { StepBuffer, type StepTransfer } from './stepBuffer';

/** Main → worker message (contracts/algorithm-contract.md → Worker protocol). */
export interface GenerateRequest {
  type: 'generate';
  requestId: number;
  algorithmId: string;
  values: Float64Array;
}

/** Worker → main messages. The `steps` buffers are transferred, not copied. */
export type WorkerResponse =
  | { type: 'done'; requestId: number; steps: StepTransfer }
  | { type: 'error'; requestId: number; message: string };

export interface StepsClient {
  /**
   * Asks the worker for the steps of `algorithmId` on `values`. Resolves with the steps,
   * or with `null` if a newer request (or `dispose`) superseded this one. Rejects with the
   * worker's error message if generation fails.
   */
  generate(algorithmId: string, values: Float64Array): Promise<StepBuffer | null>;
  /** Terminates the worker and resolves any pending request with `null`. */
  dispose(): void;
}

interface Pending {
  requestId: number;
  resolve: (steps: StepBuffer | null) => void;
  reject: (error: Error) => void;
}

function createDefaultWorker(): Worker {
  return new Worker(new URL('./steps.worker.ts', import.meta.url), { type: 'module' });
}

/**
 * Creates a client for the step worker. The worker is started on the first request and
 * reused. Only the latest request is ever answered, so a dataset or algorithm change
 * mid-generation never shows stale steps.
 */
export function createStepsClient(createWorker: () => Worker = createDefaultWorker): StepsClient {
  let worker: Worker | null = null;
  let lastRequestId = 0;
  let pending: Pending | null = null;

  const settle = (requestId: number): Pending | null => {
    if (pending?.requestId !== requestId) return null;
    const p = pending;
    pending = null;
    return p;
  };

  const ensureWorker = (): Worker => {
    if (worker) return worker;
    const w = createWorker();
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const p = settle(e.data.requestId);
      if (!p) return;
      if (e.data.type === 'done') p.resolve(StepBuffer.fromTransfer(e.data.steps));
      else p.reject(new Error(e.data.message));
    };
    w.onerror = (e: ErrorEvent) => {
      const p = pending;
      pending = null;
      p?.reject(new Error(`Step worker failed: ${e.message}`));
    };
    worker = w;
    return w;
  };

  return {
    generate(algorithmId, values) {
      const w = ensureWorker();
      pending?.resolve(null);
      const requestId = ++lastRequestId;
      return new Promise((resolve, reject) => {
        pending = { requestId, resolve, reject };
        const request: GenerateRequest = { type: 'generate', requestId, algorithmId, values };
        w.postMessage(request);
      });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      pending?.resolve(null);
      pending = null;
    },
  };
}
