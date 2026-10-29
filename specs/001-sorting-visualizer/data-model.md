# Data Model: Sorting Algorithm Visualizer

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-28

Everything lives in the browser. Only `Settings` is persisted (in `localStorage`, via
Zustand `persist`); everything else lasts for the current visit.

## Dataset

The numbers being sorted.

| Field | Type | Rules |
|-------|------|-------|
| `id` | number | Increments on every new dataset; used to discard stale step results and to clear run history |
| `source` | `'random' \| 'upload' \| 'paste'` | |
| `label` | string | e.g. "Random · 50 values" or the uploaded file name |
| `original` | `readonly number[]` | 2–1,000 finite numbers, in input order; never mutated (FR-007) |
| `min`, `max` | number | Precomputed for bar scaling |
| `isWholeNumbers` | boolean | All values are integers |
| `isNonNegative` | boolean | All values ≥ 0 |

**Validation**: length 2–1,000; every value finite. Uploads and pastes follow
[contracts/dataset-input-format.md](./contracts/dataset-input-format.md). Random datasets
contain whole numbers from 1 to 1,000, size 10–1,000 (default 50).

## Algorithm

A static catalog entry; the catalog lives in `src/algorithms/registry.ts`.

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | kebab-case, unique, e.g. `bubble`, `radix-lsd` |
| `name` | string | Display name, e.g. "Radix Sort (LSD)" |
| `family` | `'exchange' \| 'selection' \| 'insertion' \| 'divide-and-conquer' \| 'hybrid' \| 'non-comparison'` | Picker group (FR-009) |
| `description` | string | 1–2 sentences (FR-010) |
| `complexity` | `{ best: string; average: string; worst: string; space: string }` | e.g. `"O(n log n)"` |
| `supports` (optional) | `(d: DatasetFacts) => Support`, where `Support` is `{ ok: true } \| { ok: false; reason: string }` | FR-009a. Omitted means every dataset is supported. Always `ok` for random datasets |
| `sort` | `(r: StepRecorder) => void` | See [contracts/algorithm-contract.md](./contracts/algorithm-contract.md) |

**Data requirements (FR-009a)**:

| Algorithm | Requirement | Reason shown when unmet |
|-----------|-------------|-------------------------|
| Counting Sort | whole numbers and `max − min ≤ 10,000` | "Needs whole numbers" / "Range too wide (over 10,000)" |
| Radix Sort (LSD), Radix Sort (MSD) | non-negative whole numbers | "Needs whole numbers" / "Needs non-negative numbers" |
| All others | none | — |

## Step

One recorded action. Stored as a struct of typed arrays (`StepBuffer`) rather than objects,
for memory and speed; see [contracts/algorithm-contract.md](./contracts/algorithm-contract.md).

| Kind | Fields | Effect on bars | Counts as | Inverse (step back) |
|------|--------|----------------|-----------|---------------------|
| `compare` | `a`, `b` | none; highlights `a`, `b` as *comparing* | 1 comparison | none |
| `read` | `a` | none; highlights `a` as *comparing* (FR-009b) | 1 comparison | none |
| `swap` | `a`, `b` | exchange values at `a`, `b`; highlights both as *moving* | 1 move | same swap |
| `write` | `a`, `value`, `previous` | set position `a` to `value`; highlights `a` as *moving* | 1 move | set `a` to `previous` |
| `markSorted` | `a` | marks `a` as in final position | nothing | unmark `a` |

Highlights belong to the current step only; the previous step's highlights are cleared
when the next step is shown.

## StepBuffer

| Field | Type | Notes |
|-------|------|-------|
| `length` | number | Number of steps |
| `kind` | `Uint8Array` | Step kind code |
| `a`, `b` | `Int32Array` | Positions (`b` = −1 when unused) |
| `value`, `previous` | `Float64Array` | Used by `write` only |
| `comparisons`, `moves` | number | Totals for the whole run |

Grows by doubling while recording; trimmed before transfer from the worker. Worst case
~1.5 M steps (Gnome Sort, 1,000 reversed values) ≈ 40 MB. Only the current run's buffer is kept in memory.

## Run

One execution of an algorithm on the current dataset. Store fields (UI-facing) are in
**bold**; the rest live in the `Player`.

| Field | Type | Notes |
|-------|------|-------|
| **`status`** | `RunStatus` | See state machine below |
| **`algorithmId`** | string | |
| **`position`** | number | Steps applied so far, 0…`total` |
| **`total`** | number | `StepBuffer.length`, known once prepared |
| **`comparisons`**, **`moves`** | number | Counts of steps applied so far; decrease on step back |
| **`elapsedMs`** | number | Time spent in `running` only |
| `current` | `Float64Array` | Bar values in current order |
| `sorted` | `Uint8Array` | Final-position flags per index |
| `highlight` | `{ kind, a, b }` | Current step's highlight |
| `tween` | `{ from: number[], startedAt, duration } \| null` | Bar slide animation in progress |

### RunStatus state machine

```text
                       steps ready
   ┌──────────┐  ──────────────────▶  ┌────────┐   Start / Resume   ┌─────────┐
   │preparing │                       │ ready  │ ─────────────────▶ │ running │
   └──────────┘  ◀── dataset or ───── └────────┘ ◀──── Reset ────── └─────────┘
        ▲            algorithm change     ▲                           │   ▲
        │                                 │ Reset                Pause│   │Resume
        │                                 │                tab hidden │   │
        │                            ┌─────────┐ ◀────────────────────┘   │
        └── any state on dataset ─── │ paused  │ ─────────────────────────┘
            or algorithm change      └─────────┘
                                       ▲     │ Step forward to last step
                          Step back    │     ▼ (or running reaches end)
                                     ┌──────────┐
                                     │ finished │ ── Start ▶ reset to ready, then running
                                     └──────────┘
```

Rules:

- `preparing`: steps are being generated in the worker. Start is enabled; pressing it
  queues the run to begin as soon as steps arrive.
- `ready`: `position = 0`, bars show `Dataset.original`. Step forward is enabled (enters
  `paused`).
- Reaching `position = total` enters `finished`, whether playback got there (`running`) or
  the user did with Step forward (`paused`). Either way the completion animation and sweep
  sound play and a `RunRecord` is appended to history (once per run; stepping back and
  forward again to the end replays the completion but adds no second record).
- `finished` → `paused` via Step back (completion state cleared).
- Changing dataset or algorithm from any state stops playback, discards steps, and goes to
  `preparing`. A new dataset also clears history.
- Reset from any state except `preparing` returns to `ready` with the same steps.

## RunRecord

One row in the run summary (FR-022).

| Field | Type |
|-------|------|
| `algorithmId` | string |
| `comparisons` | number |
| `moves` | number |
| `elapsedMs` | number |
| `datasetId` | number |

History holds records for the current `Dataset.id` only and is cleared when it changes.

## Settings (persisted)

`localStorage` key `sortlab:settings`, schema version 1.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `muted` | boolean | `true` | Sound off for first-time visitors (FR-026a) |
| `volume` | number 0–1 | `0.5` | Moderate volume once enabled |

Not persisted: `speed` (default 100 steps/s), selected algorithm (default `bubble`),
dataset. If stored settings are missing, unreadable, or from an unknown version, defaults
are used. Unknown fields, such as the retired `soundPromptAnswered`, are ignored.
