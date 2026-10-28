import { runAlgorithm } from '../../src/algorithms/registry';
import {
  createStepsClient,
  type GenerateRequest,
  type WorkerResponse,
} from '../../src/engine/stepsClient';

/** Minimal Worker stand-in: records posted messages and lets the test reply. */
class FakeWorker {
  posted: GenerateRequest[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  postMessage(message: GenerateRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(response: WorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
  }

  replyDone(request: GenerateRequest): void {
    const { buffer } = runAlgorithm(request.algorithmId, request.values);
    this.reply({ type: 'done', requestId: request.requestId, steps: buffer.toTransfer() });
  }
}

function setup() {
  const worker = new FakeWorker();
  const client = createStepsClient(() => worker as unknown as Worker);
  return { worker, client };
}

describe('createStepsClient', () => {
  it('posts a generate request with an increasing requestId', () => {
    const { worker, client } = setup();
    void client.generate('bubble', Float64Array.from([3, 1, 2]));
    void client.generate('merge', Float64Array.from([2, 1]));
    expect(worker.posted).toHaveLength(2);
    expect(worker.posted[0]).toMatchObject({
      type: 'generate',
      requestId: 1,
      algorithmId: 'bubble',
    });
    expect(Array.from(worker.posted[0]!.values)).toEqual([3, 1, 2]);
    expect(worker.posted[1]!.requestId).toBe(2);
  });

  it('resolves with a StepBuffer when the worker is done', async () => {
    const { worker, client } = setup();
    const pending = client.generate('bubble', Float64Array.from([3, 1, 2]));
    worker.replyDone(worker.posted[0]!);
    const buffer = await pending;
    expect(buffer).not.toBeNull();
    expect(buffer!.length).toBe(runAlgorithm('bubble', [3, 1, 2]).buffer.length);
    expect(buffer!.comparisons).toBeGreaterThan(0);
  });

  it('resolves a superseded request with null, even if its reply arrives later', async () => {
    const { worker, client } = setup();
    const first = client.generate('bubble', Float64Array.from([3, 1, 2]));
    const second = client.generate('merge', Float64Array.from([2, 1]));
    expect(await first).toBeNull();
    worker.replyDone(worker.posted[0]!);
    worker.replyDone(worker.posted[1]!);
    expect(await second).not.toBeNull();
  });

  it('rejects with the worker message on error', async () => {
    const { worker, client } = setup();
    const pending = client.generate('bubble', Float64Array.from([3, 1, 2]));
    worker.reply({ type: 'error', requestId: 1, message: 'Unknown algorithm "x"' });
    await expect(pending).rejects.toThrow('Unknown algorithm "x"');
  });

  it('rejects the pending request if the worker itself fails', async () => {
    const { worker, client } = setup();
    const pending = client.generate('bubble', Float64Array.from([3, 1, 2]));
    worker.onerror?.({ message: 'Script error' } as ErrorEvent);
    await expect(pending).rejects.toThrow(/Script error/);
  });

  it('creates the worker lazily and terminates it on dispose', async () => {
    let created = 0;
    const worker = new FakeWorker();
    const client = createStepsClient(() => {
      created++;
      return worker as unknown as Worker;
    });
    expect(created).toBe(0);
    const pending = client.generate('bubble', Float64Array.from([2, 1]));
    expect(created).toBe(1);
    client.dispose();
    expect(worker.terminated).toBe(true);
    expect(await pending).toBeNull();
  });
});
