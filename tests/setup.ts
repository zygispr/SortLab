import '@testing-library/jest-dom/vitest';
import { runAlgorithm } from '../src/algorithms/registry';
import type { GenerateRequest, WorkerResponse } from '../src/engine/stepsClient';

/** One call made on the fake canvas 2D context. */
export interface RecordedCall {
  name: string;
  args: unknown[];
}

/**
 * Returns the calls recorded on a context created by the canvas stub below, so renderer
 * tests can assert what was drawn. Throws if the context did not come from the stub.
 */
export function getRecordedCalls(ctx: unknown): RecordedCall[] {
  const calls = recordedCalls.get(ctx as object);
  if (!calls) throw new Error('Context was not created by the test canvas stub');
  return calls;
}

const recordedCalls = new WeakMap<object, RecordedCall[]>();

// jsdom has no canvas. This fake records every method call and stores property writes,
// which is enough for the renderer's tests without pulling in a native canvas package.
function createRecordingContext(canvas: HTMLCanvasElement): object {
  const calls: RecordedCall[] = [];
  const properties: Record<string | symbol, unknown> = { canvas };
  const context = new Proxy(properties, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        calls.push({ name: String(prop), args });
        return prop === 'measureText' ? { width: 0 } : undefined;
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  recordedCalls.set(context, calls);
  return context;
}

const contexts = new WeakMap<HTMLCanvasElement, object>();

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value(this: HTMLCanvasElement, type: string) {
    if (type !== '2d') return null;
    let context = contexts.get(this);
    if (!context) {
      context = createRecordingContext(this);
      contexts.set(this, context);
    }
    return context;
  },
});

class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

// jsdom lacks a working ResizeObserver and matchMedia (its matchMedia key exists but is not
// a function). The checks keep real implementations if a future jsdom adds them.
if (typeof (globalThis as Partial<typeof globalThis>).ResizeObserver !== 'function') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverStub,
  });
}

if (typeof (window as Partial<Window>).matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    // The deprecated addListener/removeListener members are left out on purpose.
    value: (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as Partial<MediaQueryList> as MediaQueryList,
  });
}

// jsdom has no Worker. This stand-in answers step requests with the real runAlgorithm on
// a later task, like the real worker, so components can be tested against real steps.
class StepWorkerStub {
  onmessage: ((e: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  postMessage({ requestId, algorithmId, values }: GenerateRequest): void {
    setTimeout(() => {
      const steps = runAlgorithm(algorithmId, values).buffer.toTransfer();
      this.onmessage?.({
        data: { type: 'done', requestId, steps },
      } as MessageEvent<WorkerResponse>);
    }, 0);
  }

  terminate(): void {
    this.onmessage = null;
  }
}

if (typeof (globalThis as Partial<typeof globalThis>).Worker !== 'function') {
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: StepWorkerStub,
  });
}

afterEach(() => {
  localStorage.clear();
});
