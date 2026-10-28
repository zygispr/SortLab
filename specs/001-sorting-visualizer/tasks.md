---

description: "Task list for the Sorting Algorithm Visualizer"
---

# Tasks: Sorting Algorithm Visualizer

**Input**: Design documents from `/specs/001-sorting-visualizer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. Constitution Principle III (non-negotiable) requires unit tests for core
logic, at least one end-to-end test per user story, and tests written alongside or before
the code they verify. Within each phase, write the test tasks first and confirm they fail.

**Organization**: Tasks are grouped by user story so each story can be implemented and
tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1–US4)
- Every task names the exact file(s) it touches

## Path Conventions

Single Vite project at the repository root: `src/`, `tests/`, config files at root
(plan.md → Project Structure).

## Shared design decisions (apply to all tasks)

- Store orchestration: `src/store/appStore.ts` owns one `Player` instance and one steps
  client and exports `player` so the canvas can subscribe to frames. Store actions drive
  the player; the player reports back through callbacks. No other controller module.
- Pure step generation lives in `runAlgorithm()` in `src/algorithms/registry.ts`, so the
  worker, unit tests, and store tests share it.
- The player updates the store at most once per animation frame (research §4).
- Every exported function, class, and store action documents its contract in TSDoc
  (inputs, outputs, thrown errors), per Constitution Principle I. This applies to every
  implementation task below, not only T012.
- Reaching the last step finishes the run the same way whether playback or Step forward
  got there (data-model.md → RunStatus rules).
- Positions shown to users (announcements) are 1-based; internal indices are 0-based.
- Manual-step announcements for kinds not listed in the UI contract: `read` →
  "Reading position {n}.", `markSorted` → "Position {n} is in its final place."

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and quality gates

- [X] T001 Create `package.json` at the repo root: `"type": "module"`, `"engines": { "node": ">=24" }`; dependencies `react@^19.3`, `react-dom@^19.3`, `zustand@^5.0`; devDependencies `vite@^8.3`, `@vitejs/plugin-react@^6.1`, `typescript@~6.0.3`, `@types/react`, `@types/react-dom`, `vitest@^5`, `jsdom@^30.1`, `@testing-library/react@^16.3`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@playwright/test@^1.64`, `@axe-core/playwright@^4.14`, `eslint@^10.13`, `typescript-eslint@^8.72`, `eslint-plugin-react-hooks`, `prettier@^3.9`; scripts `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `lint` (`eslint . --max-warnings 0`), `format` (`prettier --write .`), `format:check` (`prettier --check .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test`), `bench` (`vitest bench --run`). Append `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `test-results/` to `.gitignore` if missing
- [X] T002 [P] Create `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `target`/`lib` ES2022 plus `DOM`, `DOM.Iterable`, `WebWorker`; `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit: true`, `types: ["vite/client", "vitest/globals", "@testing-library/jest-dom"]`; include `src`, `tests`, `vite.config.ts`, `playwright.config.ts`
- [X] T003 [P] Create `vite.config.ts` with `@vitejs/plugin-react`, `worker.format: 'es'`, and a `test` block: `environment: 'jsdom'`, `globals: true`, `setupFiles: ['tests/setup.ts']`, `include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.tsx']`, `benchmark.include: ['tests/perf/**/*.bench.ts']`
- [X] T004 [P] Create `eslint.config.js` (flat config): `typescript-eslint` `strictTypeChecked` for `src/**` and `tests/**`, `eslint-plugin-react-hooks` recommended rules, ignore `dist/`, `playwright-report/`, `test-results/`
- [X] T005 [P] Create `.prettierrc.json` (`singleQuote: true`, `printWidth: 100`) and `.prettierignore` (`dist`, `coverage`, `playwright-report`, `test-results`, `specs`, `.specify`)
- [X] T006 [P] Create `playwright.config.ts`: `testDir: 'tests/e2e'`, `webServer` running `npm run build && npm run preview -- --port 4173` at `http://localhost:4173`, projects `chromium`, `firefox`, `webkit`, and `phone` (viewport 360×740, `isMobile: true`, `hasTouch: true`, Chromium)
- [X] T007 [P] Create `index.html` (lang `en`, viewport meta, title "SortLab", `<div id="root">`, module script `/src/main.tsx`), `src/main.tsx` (mounts `<App />` in `StrictMode`), and a placeholder `src/App.tsx` rendering `<h1>SortLab</h1>`
- [X] T008 [P] Create `tests/setup.ts`: import `@testing-library/jest-dom/vitest`; stub `HTMLCanvasElement.prototype.getContext` with a recording 2D-context fake, `ResizeObserver`, and `window.matchMedia` (default `matches: false`); clear `localStorage` after each test
- [X] T009 [P] Create `tests/e2e/helpers.ts` exporting `expectNoA11yViolations(page)` (runs `AxeBuilder` with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and asserts zero violations) and `expectNoHorizontalScroll(page)` (asserts `document.documentElement.scrollWidth <= window.innerWidth`)
- [X] T010 Run `npm install` and `npx playwright install`; confirm `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test -- --passWithNoTests`, and `npm run build` all pass on the skeleton (depends on T001–T009)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Step storage, recorder, dataset model, store skeleton, page shell. Every story
depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 [P] Create `src/styles/tokens.css` (CSS custom properties for light and dark themes via `prefers-color-scheme`: page/canvas background, text, muted text, border, focus ring with ≥ 3:1 contrast, state colors from `contracts/ui-contract.md` → Visual states — comparing white in dark / near-black in light, moving hot pink, unsorted and sorted violet→orange gradient endpoints at reduced and full saturation — each ≥ 3:1 against the canvas background; spacing scale; font stack) and `src/styles/global.css` (box-sizing reset, `body` background/text from tokens, `:focus-visible` outline using the focus token, `.visually-hidden` utility, `button:disabled, input:disabled, select:disabled` dimmed with `cursor: not-allowed`; prevent horizontal overflow through layout, not by hiding it with `overflow-x: hidden` on `html`/`body`); import both in `src/main.tsx`
- [X] T012 [P] Create `src/algorithms/types.ts` with exactly the types in `contracts/algorithm-contract.md`: `AlgorithmFamily` (`'exchange' | 'selection' | 'insertion' | 'divide-and-conquer' | 'hybrid' | 'non-comparison'`), `AlgorithmDefinition`, `DatasetFacts`, `Support`, `StepRecorder`; document each member's contract in TSDoc
- [X] T013 [P] Write `tests/unit/stepBuffer.test.ts`: push grows capacity by doubling from 1,024; `trim()` keeps exactly `length` entries; `toTransfer()`/`StepBuffer.fromTransfer()` round-trip all arrays and totals; `applyStep`/`undoStep` for each kind per data-model.md → Step table (`swap` inverse is the same swap, `write` inverse sets `previous`, `markSorted` inverse unmarks, `compare`/`read` change nothing); `comparisons` counts `compare` + `read`, `moves` counts `swap` + `write`
- [X] T014 Implement `src/engine/stepBuffer.ts`: `StepKind` codes `Compare = 0, Read = 1, Swap = 2, Write = 3, MarkSorted = 4`; class `StepBuffer` with `length`, `kind: Uint8Array`, `a`/`b: Int32Array` (`b = -1` when unused), `value`/`previous: Float64Array`, `comparisons`, `moves`, `push(kind, a, b, value, previous)`, `trim()`, `toTransfer()` returning the worker `steps` payload with `ArrayBuffer`s, and `static fromTransfer(payload)`; functions `applyStep(buf, i, values: Float64Array, sorted: Uint8Array)` and `undoStep(buf, i, values, sorted)` (makes T013 pass)
- [X] T015 [P] Write `tests/unit/recorder.test.ts`: each recorder method records the right step and updates the working copy; `compare(i, j)` returns `Math.sign(values[i] - values[j])`; `read(i)` returns the value; `write` records the previous value; out-of-range indices throw `RangeError`; `markSorted` on an already-marked index records nothing; `values` is read-only to callers
- [X] T016 Implement `src/algorithms/recorder.ts`: `createRecorder(original: ArrayLike<number>): StepRecorder & { buffer: StepBuffer; result(): Float64Array }` working on a `Float64Array` copy, appending to a `StepBuffer`, tracking marked indices so duplicate `markSorted` calls record nothing (keeps the inverse exact) (makes T015 pass)
- [X] T017 [P] Write `tests/unit/dataset.test.ts`: `createDataset()` computes `min`, `max`, `isWholeNumbers`, `isNonNegative` for integers, negatives, decimals, all-equal; `toFacts()` returns `DatasetFacts`; `randomValues(n)` returns `n` whole numbers in 1–1,000 for n = 10, 50, 1,000 and uses the injected RNG deterministically
- [X] T018 [P] Implement `src/dataset/facts.ts`: `interface Dataset { id: number; source: 'random' | 'upload' | 'paste'; label: string; original: readonly number[]; min: number; max: number; isWholeNumbers: boolean; isNonNegative: boolean }`; `createDataset(values, source, label, id): Dataset` (freezes `original`; rule: "2–1,000 finite numbers, in input order; never mutated"); `toFacts(d): DatasetFacts`
- [X] T019 [P] Implement `src/dataset/random.ts`: `randomValues(size: number, rng = Math.random): number[]` returning whole numbers spread evenly between 1 and 1,000 in fully random order; `randomLabel(size)` → "Random · {size} values"; constants `MIN_SIZE = 10`, `MAX_SIZE = 1000`, `DEFAULT_SIZE = 50`, `SIZE_STEP = 10`
- [X] T020 Write `tests/unit/store.test.ts` (foundational cases): initial state has a random 50-value dataset, `algorithmId: 'bubble'`, `speed: 100`, `run.status: 'preparing'`; `generateDataset()` uses `datasetSize`, increments `dataset.id`; `setDatasetSize` clamps to 10–1,000 in steps of 10; `announce(text)` sets `announcement` with a fresh `seq` even for repeated text. No steps-client mock yet: the skeleton store does not request steps (the mock is added in T045)
- [X] T021 Implement `src/store/appStore.ts` skeleton with Zustand `create`: state `dataset: Dataset`, `datasetSize: number`, `algorithmId: string`, `run: { status: 'preparing' | 'ready' | 'running' | 'paused' | 'finished'; position: number; total: number; comparisons: number; moves: number; elapsedMs: number; prepareError: boolean }`, `speed: number`, `announcement: { text: string; seq: number } | null`; actions `setDatasetSize`, `generateDataset`, `setDataset(values, source, label)`, `selectAlgorithm(id)`, `setSpeed`, `announce`; initial dataset from `randomValues(DEFAULT_SIZE)` (makes T020 pass)
- [X] T022 [P] Create `src/components/LiveRegion.tsx` (visually hidden `<div role="status" aria-live="polite">` rendering `announcement.text` from the store, keyed by `seq` so repeated text is re-announced) and `tests/integration/LiveRegion.test.tsx`
- [X] T023 Replace `src/App.tsx` with the page shell and create `src/App.module.css`: regions in this order — header with `<h1>SortLab</h1>`, Data panel, Algorithm panel, Visualization, Playback bar, Sound, Run summary — each a labelled `<section>` with an `<h2>` (visually hidden where the design omits it), plus `<LiveRegion />`; single column below 1,024 px, controls column beside the visualization at ≥ 1,024 px; no element wider than the viewport from 360 px (FR-029)

**Checkpoint**: Foundation ready; `npm test` passes; user stories can begin

---

## Phase 3: User Story 1 - Watch a random dataset get sorted (Priority: P1) 🎯 MVP

**Goal**: On load, 50 random bars and Bubble Sort are ready; the user can pick any of the
20 algorithms, Start, Pause/Resume, change speed, Step forward/back while paused, Reset,
and see the completion sweep and "Sorted with {name}".

**Independent Test**: Open the app, press Generate, choose any algorithm, press Start; bars
animate into ascending order, counters rise, and the completion state shows
(`tests/e2e/visualize.spec.ts`).

### Tests for User Story 1 ⚠️ write first, confirm they fail

- [X] T024 [P] [US1] Write `tests/unit/algorithms.test.ts`: for every entry in `ALGORITHMS`, run `runAlgorithm(id, input)` on: `[2, 1]`, all-equal (50 × 7), many duplicates, already sorted, reverse sorted, 1,000 random values (seeded), negatives with decimals for every algorithm whose `supports` is absent, and negative whole numbers (−50…50, shuffled with a seed) for every algorithm except both Radix sorts (covers Counting Sort's min offset); assert result is non-decreasing and is a permutation of the input (SC-002); assert `length < 1_800_000`, i.e. under 30 s at 60,000 steps/s (FR-013 at max speed), for every input, including the 1,000-value reversed input; assert two runs produce identical step buffers (determinism); assert replay invariant (applying steps 0…n−1 to the original equals the result) and inverse invariant (undoing n−1…0 restores the original exactly); assert `ALGORITHMS` has 20 entries with unique kebab-case ids in FR-009 order; assert `supports()` reasons per data-model.md: Counting → "Needs whole numbers" / "Range too wide (over 10,000)", both Radix → "Needs whole numbers" / "Needs non-negative numbers", and `ok` for any random dataset
- [X] T025 [P] [US1] Write `tests/unit/player.test.ts` with an injected clock and frame scheduler: `play()` advances `speed × elapsedSeconds` steps per frame carrying the fractional remainder; `onProgress` fires at most once per frame; `pause()` freezes position; `stepForward`/`stepBack` change position by exactly 1 and update counters, highlight, and sorted flags; stepping back to 0 and forward to the end replays identically; reaching `total` while playing calls `onFinish` once and starts the completion sweep; `stepForward` onto the last step also calls `onFinish` once and starts the sweep; `stepBack` from finished clears completion; `onStep` fires for each `stepForward` with the applied step and for each `stepBack` with the undone step (and the value now at its position), as well as once per frame during playback; `reset()` restores `original` and position 0; tween is created only when `1000 / speed > 16.7 ms`, lasts `min(1000 / speed, 250)` ms, and is never created with reduced motion on; `setSpeed` takes effect on the next frame without restarting
- [X] T026 [P] [US1] Write `tests/unit/barRenderer.test.ts` for the pure `computeBarLayout(values, min, max, width, height, dpr)`: every bar height ≥ 4 CSS px including the minimum value; heights proportional to `(v − min) / (max − min)`; negatives/zero/decimals scale correctly; all-equal values get equal, visible heights (60 % of height); 1,000 bars at 360 px × dpr 3 are each ≥ 1 device pixel wide; a 1 px gap is kept between bars when bar width ≥ 3 px so equal values stay distinguishable
- [X] T027 [P] [US1] Write `tests/unit/stepsClient.test.ts` with a fake `Worker`: posts `{ type: 'generate', requestId, algorithmId, values }`; resolves with a `StepBuffer` on `done`; a superseded request resolves `null` even if its response arrives later; `error` rejects with the worker message
- [X] T028 [P] [US1] Write `tests/integration/PlaybackBar.test.tsx`: toggle button name follows status (`ready`/`finished`/`preparing` → "Start", `running` → "Pause", `paused` → "Resume"); Step back enabled only when status is `paused` or `finished` and `position > 0`; Step forward enabled only when status is `ready` or `paused` and `position < total`; Reset enabled only when `position > 0`; Speed slider has accessible name "Speed" and value text "100 steps per second" by default; prepare error shows "Couldn't prepare this sort. Try again." and a Retry button that re-requests steps
- [X] T029 [P] [US1] Write `tests/integration/AlgorithmPicker.test.tsx`: select labelled "Algorithm" has six `optgroup`s (Exchange, Selection, Insertion, Divide and conquer, Hybrid, Non-comparison) with the 20 options in FR-009 order; Bubble Sort selected by default; changing selection calls `selectAlgorithm`; `AlgorithmInfo` shows the selected description and best/average/worst/space complexity
- [X] T030 [P] [US1] Write `tests/integration/DataPanel.test.tsx` (random part): "Dataset size" slider 10–1,000 step 10, default 50, value text "50 values"; pressing Generate replaces the dataset with one of the chosen size and shows the label "Random · {n} values"
- [X] T031 [P] [US1] Write `tests/integration/Visualization.test.tsx`: canvas has `role="img"` and an `aria-label` like "Bar chart of 50 values, sorting with Bubble Sort, step 0 of {total}."; Legend lists Unsorted, Comparing, Moving, Sorted each with swatch and marker text; Counters show comparisons, moves, elapsed time, and "Step {position} / {total}" from the store
- [X] T032 [P] [US1] Write `tests/integration/useKeyboardShortcuts.test.tsx`: Space toggles Start/Pause/Resume; → and ← step forward/back only when those buttons are enabled; keys are ignored while focus is in a textarea, text input, select, or range input; Space on a focused button (e.g. Generate) activates that button and does not toggle playback; Space's default page scroll is prevented when handled
- [X] T033 [P] [US1] Write `tests/e2e/visualize.spec.ts` following quickstart.md → Story 1 steps 1–6: on load 50 bars (aria-label) and Bubble Sort selected; size 200 + Generate → 200 bars; Start → step counter rises; Space pauses; → twice → step +2 and live region announces each step; ← → step −1; max speed then Resume → "Sorted with Bubble Sort" appears; hiding the page (`page.evaluate` dispatching `visibilitychange` with `document.hidden` stubbed true) pauses the run with "Paused." announced; call `expectNoA11yViolations` and `expectNoHorizontalScroll`

### Implementation for User Story 1

- [X] T034 [P] [US1] Implement the Exchange family in `src/algorithms/bubble.ts`, `src/algorithms/cocktail-shaker.ts`, `src/algorithms/odd-even.ts`, `src/algorithms/comb.ts` (shrink factor 1.3), `src/algorithms/gnome.ts`; each exports an `AlgorithmDefinition` with `id`, `name`, `family: 'exchange'`, 1–2 sentence `description`, `complexity` (best/average/worst/space), and `sort(r)` that touches data only through `r` and calls `r.markSorted` where positions become final
- [X] T035 [P] [US1] Implement the Selection family in `src/algorithms/selection.ts`, `src/algorithms/cycle.ts` (positions found with `compare`, placements via `write`), `src/algorithms/heap.ts`, `src/algorithms/pancake.ts` (each flip recorded as the swaps that reverse the prefix), same export shape as T034 with `family: 'selection'`
- [X] T036 [P] [US1] Implement the Insertion family in `src/algorithms/insertion.ts` (key compared via `read` of its source position then JS comparison, per contract), `src/algorithms/binary-insertion.ts`, `src/algorithms/shell.ts` (Ciura gaps 1, 4, 10, 23, 57, 132, 301, 701, extended by ×2.25), `family: 'insertion'`
- [X] T037 [P] [US1] Implement Divide and conquer in `src/algorithms/merge.ts` (top-down; merged values written back with `r.write`) and `src/algorithms/quick.ts` (Lomuto partition, median-of-three pivot, deterministic), `family: 'divide-and-conquer'`
- [X] T038 [P] [US1] Implement Hybrid in `src/algorithms/tim.ts` (min run 32, Binary Insertion Sort for runs, stack-based merging, no galloping — say so in `description`) and `src/algorithms/intro.ts` (Quick Sort with Heap Sort fallback at depth `2·log2(n)`, Insertion Sort for ranges under 16), `family: 'hybrid'`
- [X] T039 [P] [US1] Implement Non-comparison in `src/algorithms/counting.ts` (one `read` per value to count, offset by min for negatives, `write`s in sorted order; `supports`: whole numbers and `max − min ≤ 10,000`, reasons "Needs whole numbers" / "Range too wide (over 10,000)"), `src/algorithms/radix-lsd.ts` and `src/algorithms/radix-msd.ts` (base 10, `read` per digit inspection, `write` per placement; `supports`: non-negative whole numbers, reasons "Needs whole numbers" / "Needs non-negative numbers"), `src/algorithms/bucket.ts` (√n buckets by value range, written back bucket by bucket, then Insertion Sort within each bucket; no `supports`), `family: 'non-comparison'`
- [X] T040 [US1] Implement `src/algorithms/registry.ts`: `ALGORITHMS` in FR-009 picker order, `getAlgorithm(id)` (throws on unknown id), `FAMILY_LABELS` ("Exchange", "Selection", "Insertion", "Divide and conquer", "Hybrid", "Non-comparison"), `checkSupport(def, facts): Support` (`{ ok: true }` when `supports` is absent), and `runAlgorithm(id, values): { buffer: StepBuffer; result: Float64Array }` that creates a recorder, runs `sort`, and trims the buffer (depends on T034–T039; makes T024 pass)
- [X] T041 [US1] Implement `src/engine/steps.worker.ts`: on `generate` messages call `runAlgorithm`, post `{ type: 'done', requestId, steps: buffer.toTransfer() }` transferring all five `ArrayBuffer`s; catch errors and post `{ type: 'error', requestId, message }`
- [X] T042 [US1] Implement `src/engine/stepsClient.ts`: `createStepsClient(createWorker = () => new Worker(new URL('./steps.worker.ts', import.meta.url), { type: 'module' }))` returning `{ generate(algorithmId, values: Float64Array): Promise<StepBuffer | null>; dispose() }`; increments `requestId`, resolves superseded requests with `null`, rejects on `error` for the latest request (makes T027 pass)
- [X] T043 [P] [US1] Implement `src/engine/player.ts`: class `Player` with options `{ now, requestFrame, cancelFrame, onProgress, onStep, onFinish, onFrame }` (defaults `performance.now`, `requestAnimationFrame`, `cancelAnimationFrame`); state `current: Float64Array`, `sorted: Uint8Array`, `highlight: { kind; a; b } | null`, `tween`, `completion: { startedAt } | null`, `position`, `total`, `comparisons`, `moves`, `elapsedMs`; methods `load(original, buffer | null)`, `play()`, `pause()`, `stepForward()`, `stepBack()`, `reset()`, `setSpeed(stepsPerSecond)`, `setReducedMotion(bool)`, `dispose()`; time-based rAF loop advancing `speed × dt` steps with carried remainder; `elapsedMs` counts only while playing; `onProgress` once per frame; `onStep(highlight, value)` with the latest step of the frame during playback, and for every `stepForward` (applied step) and `stepBack` (undone step, value now at its position) — used for sound; `onFinish` whenever `position` reaches `total`, from playback or `stepForward`; completion sweep constant `COMPLETION_SWEEP_MS = 800` (instant with reduced motion); `onFrame` notifies the renderer only when something changed (makes T025 pass)
- [X] T044 [P] [US1] Implement `src/render/barRenderer.ts`: pure `computeBarLayout(...)` per T026 and `createBarRenderer(canvas)` with `resize(cssWidth, cssHeight, dpr)` and `draw(player)` drawing at device-pixel resolution: unsorted bars with value-based violet→orange hue at reduced saturation, sorted bars at full saturation plus a solid baseline strip, comparing bars in the comparing token color with a ▲ marker under the bar, moving bars hot pink with a thick outline and ● marker, tweened x positions when `player.tween` is active, completion sweep turning bars sorted left to right; colors read once from CSS custom properties in `tokens.css` and re-read on `prefers-color-scheme` change (makes T026 pass)
- [X] T045 [US1] Extend `src/store/appStore.ts` with the run lifecycle (data-model.md → RunStatus state machine): module-level `player` (exported) and steps client; on dataset or algorithm change stop playback, set status `preparing`, request steps, and on resolve `player.load()` and set `ready` with `total`, `comparisons/moves = 0`; actions `start()` (from `preparing` queues start until steps arrive; from `finished` resets then plays), `pause()`, `resume()`, `togglePlay()`, `stepForward()` (from `ready` enters `paused`; at last step enters `finished`), `stepBack()` (from `finished` enters `paused`), `reset()` (any state except `preparing` → `ready`), `retryPrepare()`, `setSpeed()` forwarding to the player; player callbacks write `position`, `comparisons`, `moves`, `elapsedMs` once per frame; on finish set `finished` and announce "Sorted with {name}: {comparisons} comparisons, {moves} moves."; on manual steps announce "Comparing positions {a} and {b}." / "Swapped positions {a} and {b}." / "Wrote {value} at position {a}." / "Reading position {a}." / "Position {a} is in its final place." (1-based); on worker error set `prepareError: true`; add store test cases for each transition to `tests/unit/store.test.ts`, mocking `src/engine/stepsClient.ts` with `vi.mock` so `generate()` resolves with `runAlgorithm(id, values).buffer`
- [X] T046 [P] [US1] Implement `src/components/DataPanel.tsx` + `src/components/DataPanel.module.css`: "Dataset size" range input (10–1,000, step 10, `aria-valuetext` "{n} values"), Generate button calling `generateDataset()`, current `dataset.label` (makes T030 pass)
- [X] T047 [P] [US1] Implement `src/components/AlgorithmPicker.tsx` (`<label>Algorithm</label>` + `<select>` with one `<optgroup label={FAMILY_LABELS[f]}>` per family) and `src/components/AlgorithmInfo.tsx` (description + "Best / Average / Worst / Space" complexity list for the selected algorithm) with a shared `src/components/AlgorithmPanel.module.css` (makes T029 pass)
- [X] T048 [P] [US1] Implement `src/components/Visualizer.tsx` + `src/components/Visualizer.module.css`: hosts the `<canvas role="img">` with the store-derived `aria-label` ("Bar chart of {count} values, sorting with {name}, step {position} of {total}."), creates the bar renderer, subscribes to `player`'s frames, re-fits with `ResizeObserver` and `devicePixelRatio` without restarting the run, and shows "Sorted with {name}" under the canvas when status is `finished`
- [X] T049 [P] [US1] Implement `src/components/Legend.tsx` (four entries — Unsorted, Comparing, Moving, Sorted — each with a swatch using the state token and its marker: none, ▲, ●, baseline strip) and `src/components/Counters.tsx` (Comparisons, Moves, Time as seconds with one decimal, "Step {position} / {total}"; numbers formatted with `toLocaleString`) (makes T031 pass)
- [X] T050 [P] [US1] Implement `src/components/SpeedSlider.tsx`: range input 0–1000 labelled "Speed", exported pure `speedFromPosition(p) = 2 · 30000^(p/1000)` rounded to 2 significant figures and clamped to 2–60,000, and `positionFromSpeed(s)` its inverse (100 steps/s ↔ position 380); `aria-valuetext` "{speed} steps per second"; calls `setSpeed` on input
- [X] T051 [US1] Implement `src/components/PlaybackBar.tsx` + `src/components/PlaybackBar.module.css`: Start/Pause/Resume toggle (name per status), Step back, Step forward, Reset (native `disabled` per ui-contract.md → Controls), `<SpeedSlider />`, and when `run.prepareError` the message "Couldn't prepare this sort. Try again." with a Retry button calling `retryPrepare()`; a "Preparing…" indicator while `preparing` and a start is queued (depends on T050; makes T028 pass)
- [X] T052 [P] [US1] Implement `src/hooks/useKeyboardShortcuts.ts`: document `keydown` listener — Space → `togglePlay()`, ArrowRight → `stepForward()`, ArrowLeft → `stepBack()` only when enabled; skip when the event target is a textarea, text/number input, select, range input, or a button (so Space on a focused button keeps native behaviour); `preventDefault()` when handled (makes T032 pass)
- [X] T053 [US1] Wire User Story 1 into `src/App.tsx`: place `DataPanel`, `AlgorithmPicker` + `AlgorithmInfo`, `Visualizer` + `Legend` + `Counters`, `PlaybackBar` in their regions; call `useKeyboardShortcuts()`; add a `visibilitychange` effect that calls `pause()` and announces "Paused." when the page becomes hidden while running (FR-015); add a `matchMedia('(prefers-reduced-motion: reduce)')` effect forwarding to `player.setReducedMotion` (makes T033 pass)

**Checkpoint**: User Story 1 is fully functional — the MVP. Run `npm test` and
`npx playwright test tests/e2e/visualize.spec.ts`.

---

## Phase 4: User Story 2 - Re-run the same data with a different algorithm (Priority: P2)

**Goal**: Switching algorithm (or pressing Start after finishing) resets bars to the
original order; a run summary lists algorithm, comparisons, moves, and elapsed time for
every run on the current dataset.

**Independent Test**: Sort with Bubble Sort, select Merge Sort, press Start; bars return to
the original order first, then the summary lists both runs; Generate clears the summary
(`tests/e2e/rerun.spec.ts`).

### Tests for User Story 2 ⚠️ write first, confirm they fail

- [X] T054 [P] [US2] Add history cases to `tests/unit/store.test.ts`: finishing a run appends one `RunRecord { algorithmId, comparisons, moves, elapsedMs, datasetId }`; stepping back from finished and forward again does not append a second record; Reset or Start-from-finished followed by another finish appends a new record; selecting another algorithm keeps history; `generateDataset()` and `setDataset()` clear history; switching algorithm while running stops the run and restores `Dataset.original` in the player
- [X] T055 [P] [US2] Write `tests/integration/RunSummary.test.tsx`: table with caption "Run summary" and columns Algorithm, Comparisons, Moves, Time; one row per record in run order with the algorithm display name; empty state "No runs yet. Press Start to sort this dataset."
- [X] T056 [P] [US2] Write `tests/e2e/rerun.spec.ts` following quickstart.md → Story 2: finish a Bubble Sort run at max speed, select Merge Sort (step counter returns to "Step 0 / …"), Start, finish; summary has two rows; Reset after finishing returns to step 0 without starting; Generate clears the summary; `expectNoA11yViolations`

### Implementation for User Story 2

- [X] T057 [US2] Extend `src/store/appStore.ts`: `history: RunRecord[]`; append exactly once per run when it reaches `finished` (guard with a per-run `recorded` flag cleared by `reset()`, start-from-finished, and new steps); clear history in `generateDataset()` and `setDataset()`; keep only records whose `datasetId` matches `dataset.id` (makes T054 pass)
- [X] T058 [P] [US2] Implement `src/components/RunSummary.tsx` + `src/components/RunSummary.module.css`: accessible `<table>` with `<caption>Run summary</caption>`, header cells with `scope="col"`, numbers via `toLocaleString`, time in seconds with one decimal; empty-state text; table scrolls inside its own container on narrow screens so the page never scrolls horizontally (makes T055 pass)
- [X] T059 [US2] Mount `<RunSummary />` in the Run summary region of `src/App.tsx` (makes T056 pass)

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Sort my own uploaded dataset (Priority: P3)

**Goal**: Users upload a `.txt`/`.csv` file or paste numbers; valid input replaces the
dataset; invalid input leaves it unchanged with a fixable message; Counting/Radix sorts are
disabled with a reason when the data does not fit them.

**Independent Test**: Upload `tests/fixtures/valid-mixed.csv`; bars match the file; Counting
and Radix options are disabled with reasons; any other algorithm sorts it
(`tests/e2e/upload.spec.ts`).

### Tests for User Story 3 ⚠️ write first, confirm they fail

- [X] T060 [P] [US3] Create fixtures in `tests/fixtures/`: `valid-mixed.csv` (20 values including negatives and decimals, comma and newline separated), `valid-1000.txt` (1,000 integers, one per line), `header-row.csv` (`value` then 10 numbers), `too-many.txt` (1,001 integers), `image.png` (a valid 1×1 PNG)
- [X] T061 [P] [US3] Write `tests/unit/parse.test.ts` covering every rule and example in `contracts/dataset-input-format.md`: all separators and runs of separators (`1,,2` = `[1, 2]`), `\r\n`, leading BOM ignored, accepted number forms (`42`, `-7`, `3.14`, `.5`, `+2`, `1e3`), rejected forms (`1,000` → two values, `5kg`, `NaN`, `Infinity`, `0x1F`), every error message verbatim ("No numbers found. Enter at least 2 numbers separated by commas, spaces, or new lines." / "Enter at least 2 numbers to sort." / "Too many numbers: found {count}, the maximum is 1,000." / "Line {line}: '{token}' is not a number." with " If this is a header row, remove it." only when the token is on line 1 and other lines are numeric / "Line {line}: '{token}' is too large."), `line`/`column`/`token` fields, tokens over 20 characters shortened to 20 + "…"; and `readDatasetFile` with `File` objects: wrong type → "Please choose a .txt or .csv file.", over 1,048,576 bytes → "This file is larger than 1 MB.", NUL character → "This file doesn't look like text."
- [X] T062 [P] [US3] Write `tests/integration/DataInput.test.tsx`: "Upload file" input accepts `.txt,.csv` and loads a valid file; "Paste numbers" textarea + "Use these numbers" button (disabled while empty) loads `5, 3, 8, 1` in that order; an invalid input shows the parser message next to the data panel, announces it, and leaves `dataset.id` unchanged
- [X] T063 [P] [US3] Add cases to `tests/unit/store.test.ts`: `loadUserDataset(values, 'upload', 'file.csv')` replaces the dataset, clears history, announces "Loaded {count} values from {label}."; with Radix Sort (LSD) selected and data containing decimals the selection switches to `bubble` and announces "Radix Sort (LSD) can't sort this data (Needs whole numbers). Switched to Bubble Sort."
- [X] T064 [P] [US3] Add disabled-option cases to `tests/integration/AlgorithmPicker.test.tsx`: for a dataset with decimals, Counting, Radix (LSD), Radix (MSD) options are `disabled` with labels like "Radix Sort (LSD) — needs whole numbers"; for a random dataset none are disabled
- [X] T065 [P] [US3] Write `tests/e2e/upload.spec.ts` following quickstart.md → Story 3 fixture table: each fixture produces the expected bars or message; `valid-1000.txt` shows "Bar chart of 1000 values" within 1 s of `setInputFiles` (SC-005); the previous dataset is kept after each error; paste `5, 3, 8, 1` → 4 bars; record `page.on('request')` from just before each upload or paste until its bars or error appear and assert no requests were made (FR-008); `expectNoA11yViolations`

### Implementation for User Story 3

- [X] T066 [US3] Implement `parseDataset(text: string): ParseResult` in `src/dataset/parse.ts` exactly per `contracts/dataset-input-format.md` (separators regex `[,;\s]+`, number regex `^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$`, `Number.isFinite` check for "too large", first problem wins, line/column tracking, 20-character token shortening, BOM strip) (makes the parser part of T061 pass)
- [X] T067 [US3] Add `readDatasetFile(file: File): Promise<ParseResult>` to `src/dataset/parse.ts`: check type (extension `.txt`/`.csv` or MIME `text/*`), size ≤ 1,048,576 bytes, read with `file.text()`, reject text containing `\0`, then `parseDataset` (makes T061 pass)
- [X] T068 [US3] Add `loadUserDataset(values, source: 'upload' | 'paste', label)` and `dataError: string | null` to `src/store/appStore.ts`: builds the dataset via `createDataset`, runs the FR-014 stop/reset path, checks `checkSupport(getAlgorithm(algorithmId), toFacts(dataset))` and if unsupported switches to `bubble` with the auto-change announcement; announces "Loaded {count} values from {label}."; `setDataError(message)` also announces the message (makes T063 pass)
- [X] T069 [P] [US3] Implement `src/components/UploadInput.tsx`: visible "Upload file" button labelling a visually hidden `<input type="file" accept=".txt,.csv,text/plain,text/csv">`; on change calls `readDatasetFile`, then `loadUserDataset(values, 'upload', file.name)` or `setDataError(message)`; resets the input value so the same file can be chosen again
- [X] T070 [P] [US3] Implement `src/components/PasteInput.tsx`: `<label>Paste numbers</label>` + `<textarea>` + "Use these numbers" button (disabled while the trimmed text is empty); on press `parseDataset` then `loadUserDataset(values, 'paste', 'Pasted numbers')` or `setDataError(message)`; error linked to the textarea with `aria-describedby`
- [X] T071 [US3] Add `UploadInput`, `PasteInput`, and the `dataError` message (role-less text with an error icon and the message, cleared on the next successful load) to `src/components/DataPanel.tsx` and its CSS module (makes T062 and T065 pass)
- [X] T072 [US3] Update `src/components/AlgorithmPicker.tsx` to disable options whose `checkSupport` fails for `toFacts(dataset)` and append " — {reason in lower case}" to their label (makes T064 pass)

**Checkpoint**: User Stories 1–3 all work independently

---

## Phase 6: User Story 4 - Hear the sort (Priority: P4)

**Goal**: Optional tones per step (pitch follows value), a rising completion sweep, a
first-visit "Turn on sound" prompt, mute and volume that apply immediately and persist.

**Independent Test**: Clear site data, accept "Turn on sound", Start; tones follow the
animation, Mute silences immediately, reload keeps the choice and does not show the prompt
again (`tests/e2e/sound.spec.ts`).

### Tests for User Story 4 ⚠️ write first, confirm they fail

- [X] T073 [P] [US4] Write `tests/unit/sound.test.ts` with a fake `AudioContext` (oscillator, gain, compressor nodes recording calls): `pitchFor(value, min, max)` maps exponentially from 200 Hz (min) to 1,200 Hz (max) and returns 200 Hz when `min === max`; `playStep` schedules a tone with ≈ 2 ms attack and ≈ 80 ms exponential decay through master gain → `DynamicsCompressorNode` → destination; at most one tone per call to `beginFrame()` (extra `playStep` calls in the same frame are dropped); each tone's `start(t)` satisfies `t − audioContext.currentTime ≤ 0.05` (SC-006); `setMuted(true)` sets master gain to 0 immediately via `setValueAtTime`; `setVolume(v)` applies on the next audio tick; `playCompletionSweep(sortedValues)` schedules a rising sequence of at most 64 tones over 800 ms; `isSupported()` returns false when neither `AudioContext` nor `webkitAudioContext` exists; no `AudioContext` is created before `enable()`
- [X] T074 [P] [US4] Write `tests/unit/settings.test.ts`: defaults `muted: true`, `volume: 0.5`, `soundPromptAnswered: false`; changes persist under `localStorage` key `sortlab:settings` with version 1; missing, malformed JSON, or unknown-version storage falls back to defaults; `speed`, algorithm, and dataset are not persisted
- [X] T075 [P] [US4] Write `tests/integration/SoundControls.test.tsx`: first visit shows the prompt with "Turn on sound" and "Not now" next to Start; "Turn on sound" unmutes, enables audio, and hides the prompt; "Not now" hides it and stays muted; after either choice the prompt does not render again; Mute/Unmute toggle reflects state with `aria-pressed`; "Volume" slider 0–100 % with `aria-valuetext` "{n} percent"; without Web Audio support the controls are hidden and "Sound isn't supported in this browser." is shown
- [X] T076 [P] [US4] Write `tests/e2e/sound.spec.ts` following quickstart.md → Story 4 steps 1–4: fresh context shows the prompt; Turn on sound → prompt gone and Mute button `aria-pressed="false"`; Mute → `aria-pressed="true"`; reload → still muted, no prompt; `expectNoA11yViolations`

### Implementation for User Story 4

- [X] T077 [P] [US4] Implement `src/audio/soundEngine.ts`: `createSoundEngine(createContext?)` returning `{ isSupported(), enable(), setMuted(b), setVolume(v), beginFrame(), playStep(value, min, max), playCompletionSweep(sortedValues), dispose() }` and exported `pitchFor`; creates the `AudioContext` lazily in `enable()` (called from the user's click), routes oscillators → per-note gain envelope → master gain → `DynamicsCompressorNode` → destination; schedules notes on `audioContext.currentTime` (makes T073 pass)
- [X] T078 [US4] Add a persisted settings slice to `src/store/appStore.ts` using Zustand `persist` with `name: 'sortlab:settings'`, `version: 1`, `partialize` to `{ muted, volume, soundPromptAnswered }`, and a `migrate`/`merge` that returns defaults for unknown versions or malformed data; actions `enableSound()` (unmute, `soundPromptAnswered = true`, `soundEngine.enable()`), `dismissSoundPrompt()`, `toggleMute()`, `setVolume(v)` forwarding to the sound engine immediately (makes T074 pass)
- [X] T079 [US4] Connect playback to sound in `src/store/appStore.ts`: in the player's `onStep` callback call `soundEngine.beginFrame()` then `playStep(value, dataset.min, dataset.max)` for the value at the latest step's position when not muted (manual steps also play a tone, FR-012a); in `onFinish` call `playCompletionSweep` with the sorted values
- [X] T080 [P] [US4] Implement `src/components/SoundPrompt.tsx` + `src/components/Sound.module.css`: shown while `!soundPromptAnswered` and sound is supported; "Turn on sound" and "Not now" buttons
- [X] T081 [P] [US4] Implement `src/components/SoundControls.tsx` (Mute/Unmute toggle button with `aria-pressed={muted}` and name "Mute" when unmuted / "Unmute" when muted; "Volume" range 0–100 with `aria-valuetext` "{n} percent"; when `!isSupported()` render only "Sound isn't supported in this browser.") sharing `src/components/Sound.module.css` (makes T075 pass)
- [X] T082 [US4] Render `<SoundPrompt />` inside `src/components/PlaybackBar.tsx` directly after the Start/Pause/Resume button (FR-026a "next to Start") and mount `<SoundControls />` in the Sound region of `src/App.tsx` (makes T076 pass)

**Checkpoint**: All four user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance proof, layout and accessibility sweep, docs, final gates

- [X] T083 [P] Write `tests/perf/steps.bench.ts` (Vitest bench): `runAlgorithm('gnome', reversed 1..1000)`, `runAlgorithm('bubble', reversed 1..1000)`, and `runAlgorithm('merge', random 1,000)`; target < 300 ms for Gnome; update the bench path in `specs/001-sorting-visualizer/quickstart.md` (currently `tests/unit/perf.bench.ts`) to `tests/perf/steps.bench.ts`
- [X] T084 [P] Write `tests/e2e/layout.spec.ts`: at 360×740 and 1440×900 `expectNoHorizontalScroll` with 1,000 values loaded and the run summary filled; every control reachable by Tab in visual order with a visible focus outline; with `page.emulateMedia({ reducedMotion: 'reduce' })` the finish shows "Sorted with …" with no sweep delay; `expectNoA11yViolations` in light and dark color schemes
- [X] T085 [P] Write `README.md` at the repo root: what SortLab is, prerequisites, the commands from quickstart.md → Setup and Quality gates, and a short architecture map (algorithms → recorder → worker → player → canvas; store; sound)
- [X] T086 Measure performance per quickstart.md → Performance and accessibility checks (DevTools trace at 4× CPU throttle with 1,000 values at max speed, Pause-click response trace, `npm run bench`, sound sync check at 2 steps/s for SC-006, Lighthouse mobile) and record the numbers against each target in a new "Measured results" section of `specs/001-sorting-visualizer/quickstart.md`; fix any budget miss before continuing (Principle V)
- [ ] T087 Manual checks recorded in the same "Measured results" section of `specs/001-sorting-visualizer/quickstart.md`: keyboard-only pass of the whole page, listening check at maximum speed for clicks/distortion/loudness build-up (FR-027), and token contrast spot-check of state colors in both themes (≥ 3:1) in `src/styles/tokens.css`
- [X] T088 Remove dead code, unused exports, and unused dependencies across `src/` and `package.json`; extract any logic duplicated three or more times (Principle I)
- [X] T089 Run all quality gates — `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` — and fix every failure until all pass (Firefox e2e runs in GitHub Actions, `.github/workflows/ci.yml`; Playwright Firefox cannot launch on local macOS 27)
- [X] T090 Walk through every validation scenario in `specs/001-sorting-visualizer/quickstart.md` (Stories 1–4) against `npm run preview` and confirm each expectation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T010 waits for T001–T009
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1 (needs the run lifecycle, T045, and Reset/Start flows)
- **US3 (Phase 5)**: depends on US1 (picker, data panel, run lifecycle); independent of US2
- **US4 (Phase 6)**: depends on US1 (player callbacks, PlaybackBar); independent of US2 and US3
- **Polish (Phase 7)**: depends on every story you intend to ship

### User Story Dependencies

```text
Setup → Foundational → US1 (MVP) ─┬─→ US2
                                  ├─→ US3
                                  └─→ US4
                                         └─→ Polish (after the chosen stories)
```

US2, US3, and US4 touch disjoint components but all edit `src/store/appStore.ts`,
`src/App.tsx`, and (US3) `tests/unit/store.test.ts`; when running them in parallel,
serialize those edits.

### Within Each Phase

- Test tasks first; confirm they fail
- Pure modules (algorithms, stepBuffer, recorder, dataset, parse, sound) before the store
- Store before components; components before `App.tsx` wiring
- Tasks editing the same file run in ID order: `src/store/appStore.ts` (T021 → T045 → T057 →
  T068 → T078 → T079), `src/App.tsx` (T007 → T023 → T053 → T059 → T082),
  `src/dataset/parse.ts` (T066 → T067), `src/components/PlaybackBar.tsx` (T051 → T082),
  `src/components/DataPanel.tsx` (T046 → T071), `src/components/AlgorithmPicker.tsx`
  (T047 → T072), `tests/unit/store.test.ts` (T020 → T045 → T054 → T063)

### Parallel Opportunities

- Setup: T002–T009 together after T001
- Foundational: T011, T012, T013, T015, T017, T018, T019, T022 together; then T014, T016;
  then T020 → T021 → T023
- US1: all tests T024–T033 together; all six algorithm families T034–T039 together; T043,
  T044 together; components T046–T050 and T052 together once T045 is done
- US2: T054–T056 together; T058 alongside T057
- US3: T060–T065 together; T069, T070 together after T068
- US4: T073–T076 together; T077, T080, T081 together
- Polish: T083–T085 together

---

## Parallel Example: User Story 1

```bash
# All US1 tests at once:
Task: "Write tests/unit/algorithms.test.ts"
Task: "Write tests/unit/player.test.ts"
Task: "Write tests/unit/barRenderer.test.ts"
Task: "Write tests/unit/stepsClient.test.ts"
Task: "Write tests/integration/PlaybackBar.test.tsx"
Task: "Write tests/e2e/visualize.spec.ts"

# All algorithm families at once:
Task: "Exchange family in src/algorithms/{bubble,cocktail-shaker,odd-even,comb,gnome}.ts"
Task: "Selection family in src/algorithms/{selection,cycle,heap,pancake}.ts"
Task: "Insertion family in src/algorithms/{insertion,binary-insertion,shell}.ts"
Task: "Divide and conquer in src/algorithms/{merge,quick}.ts"
Task: "Hybrid in src/algorithms/{tim,intro}.ts"
Task: "Non-comparison in src/algorithms/{counting,radix-lsd,radix-msd,bucket}.ts"

# Playback engine and renderer at once:
Task: "Player in src/engine/player.ts"
Task: "Bar renderer in src/render/barRenderer.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (blocks everything)
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test`, `npx playwright test tests/e2e/visualize.spec.ts`,
   quickstart.md → Story 1 by hand
5. Demo: random data, 20 algorithms, playback controls, stepping, completion

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate → demo (MVP)
3. US2 → run summary and re-runs → validate → demo
4. US3 → upload and paste → validate → demo
5. US4 → sound → validate → demo
6. Polish → performance evidence, final gates

### Parallel Team Strategy

After US1 lands, one developer each can take US2, US3, and US4, coordinating edits to
`src/store/appStore.ts`, `src/App.tsx`, and `tests/unit/store.test.ts`.

---

## Notes

- [P] tasks = different files and no dependency on an unfinished task
- [Story] labels map tasks to user stories for traceability
- Commit after each task or logical group; stop at any checkpoint to validate a story
- Every bug fix found during implementation needs a regression test (Principle III)
