# Contract: Algorithms, Steps and the Step Worker

Internal module contract between sorting algorithms, the step recorder, the worker, and the
player. Entities are defined in [data-model.md](../data-model.md).

## Algorithm module

Each algorithm is one file in `src/algorithms/` exporting an `AlgorithmDefinition`:

```ts
type AlgorithmFamily =
  | 'exchange' | 'selection' | 'insertion'
  | 'divide-and-conquer' | 'hybrid' | 'non-comparison';

interface AlgorithmDefinition {
  id: string;                     // kebab-case, unique
  name: string;
  family: AlgorithmFamily;
  description: string;            // 1–2 sentences
  complexity: { best: string; average: string; worst: string; space: string };
  supports?: (d: DatasetFacts) => Support;   // omitted = supports everything
  sort: (r: StepRecorder) => void;
}

interface DatasetFacts { length: number; min: number; max: number;
                         isWholeNumbers: boolean; isNonNegative: boolean }
type Support = { ok: true } | { ok: false; reason: string };
```

`src/algorithms/registry.ts` exports `ALGORITHMS: readonly AlgorithmDefinition[]` in picker
order (FR-009) and `getAlgorithm(id)`.

**Rules every `sort` MUST follow**:

1. Access data only through the recorder. Never read or write a copy of the values.
2. Sort ascending; on return, `r.values` is in non-decreasing order.
3. Terminate for every valid dataset (2–1,000 finite numbers) in at most 2,000,000 steps.
4. Be deterministic: the same input produces the same steps (Quick Sort's pivot choice is
   median-of-three, not random).
5. Temporary storage (buckets, counts, merge buffers) is allowed as ordinary local arrays,
   but every value placed back into the main array goes through `r.write`.

## StepRecorder

```ts
interface StepRecorder {
  readonly length: number;
  readonly values: ArrayLike<number>;     // read-only view of the working copy
  compare(i: number, j: number): number;  // records compare; returns sign(values[i] - values[j])
  read(i: number): number;                // records read; returns values[i]
  swap(i: number, j: number): void;       // records swap and exchanges values
  write(i: number, value: number): void;  // records write (with previous value) and sets it
  markSorted(i: number): void;            // records markSorted
}
```

- Comparing a value against a temporary variable (e.g. Insertion Sort's key) is done with
  `read` of the position the key came from, then ordinary JS comparison against the key.
  This keeps counts honest without needing a "compare with value" step kind.
- Out-of-range indices throw (caught by tests, never in production data paths).
- `markSorted` is optional; the player marks every bar as sorted at completion.

## Step encoding (`StepBuffer`)

| Kind | Code | `a` | `b` | `value` | `previous` |
|------|------|-----|-----|---------|------------|
| `compare` | 0 | index | index | — | — |
| `read` | 1 | index | −1 | — | — |
| `swap` | 2 | index | index | — | — |
| `write` | 3 | index | −1 | new value | old value |
| `markSorted` | 4 | index | −1 | — | — |

**Invariant (tested for every algorithm)**: applying steps `0…n−1` to `Dataset.original`
gives the recorder's final `values`; applying the inverses of steps `n−1…0` to that result
gives `Dataset.original` exactly.

## Worker protocol

Worker file: `src/engine/steps.worker.ts`. One request in flight at a time per client;
newer requests supersede older ones.

**Request** (main → worker):

```ts
{ type: 'generate'; requestId: number; algorithmId: string; values: Float64Array }
```

**Responses** (worker → main):

```ts
{ type: 'done'; requestId: number;
  steps: { length: number; kind: ArrayBuffer; a: ArrayBuffer; b: ArrayBuffer;
           value: ArrayBuffer; previous: ArrayBuffer;
           comparisons: number; moves: number } }   // ArrayBuffers are transferred

{ type: 'error'; requestId: number; message: string }
```

The client (`src/engine/stepsClient.ts`) ignores any response whose `requestId` is not the
latest, so a dataset or algorithm change mid-generation never shows stale steps. On
`error` the run stays out of `ready` and the UI shows "Couldn't prepare this sort. Try
again." with a Retry button.
