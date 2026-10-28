# SortLab

Watch sorting algorithms work, step by step. SortLab draws a dataset as colorful bars and
animates one of 20 sorting algorithms over it, with optional tones whose pitch follows the
values. You can pause, change speed, step forward and back, re-run the same data with
another algorithm and compare the runs, or sort your own numbers from a `.txt`/`.csv` file
or pasted text. Everything runs in the browser; nothing is uploaded.

## Prerequisites

- Node.js 24 LTS (≥ 24.15) and npm 11
- For end-to-end tests: Playwright browsers (`npx playwright install`)

## Setup and run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build into dist/
npm run preview      # serve the production build
```

## Quality gates

All must pass before merge:

```bash
npm run lint         # ESLint, zero errors
npm run format:check # Prettier
npm run typecheck    # tsc --noEmit (strict)
npm test             # Vitest unit + component tests
npm run test:e2e     # Playwright end-to-end + axe accessibility checks
```

`npm run bench` measures step generation (`tests/perf/steps.bench.ts`).

## Architecture

```text
algorithms ──▶ recorder ──▶ steps worker ──▶ player ──▶ canvas
 (pure sort)   (StepBuffer)  (off the main    (rAF loop,   (bar renderer)
                              thread)          step back)
                                                  │
                                    store ◀───────┘──────▶ sound
                               (Zustand: dataset,         (Web Audio tones,
                                run, history, settings)    completion sweep)
```

- **`src/algorithms/`**: the 20 algorithms. Each touches data only through a
  `StepRecorder`, which records every compare, read, swap, write, and "sorted" mark into a
  typed-array `StepBuffer` (`src/engine/stepBuffer.ts`). `registry.ts` lists them in picker
  order and says which data each can sort.
- **`src/engine/`**: `steps.worker.ts` generates a run's steps off the main thread;
  `stepsClient.ts` talks to it. `player.ts` plays the steps on an animation-frame loop,
  applying or undoing them so Step back is exact.
- **`src/render/barRenderer.ts`**: draws the player's state on a canvas each frame, with a
  color and a non-color cue for every state.
- **`src/store/appStore.ts`**: the one Zustand store. Its actions drive the player and the
  sound engine, and it persists only the sound settings (`localStorage`,
  `sortlab:settings`).
- **`src/audio/soundEngine.ts`**: tones and the completion sweep, at most one tone per
  frame through a compressor so fast playback stays pleasant.
- **`src/dataset/`**: random datasets, and parsing of uploaded or pasted numbers.
- **`src/components/`**: thin React components over the store.

Design documents (spec, plan, contracts, validation guide) are in
[`specs/001-sorting-visualizer/`](specs/001-sorting-visualizer/).
