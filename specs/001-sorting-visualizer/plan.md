# Implementation Plan: Sorting Algorithm Visualizer

**Branch**: `001-sorting-visualizer` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-sorting-visualizer/spec.md`

## Summary

A single-page, browser-only web app where users generate a random dataset or load their own
numbers, choose one of 20 sorting algorithms, and watch it sort as colorful animated bars,
with optional tones, pause, speed control, and step forward/back. Runs on the same data can
be repeated with other algorithms and compared in a run summary.

Technical approach: **React 19 + Vite 8 + TypeScript**. Algorithms are pure functions that
sort through a `StepRecorder`, producing a compact typed-array list of steps inside a **Web
Worker**. A non-React `Player` plays the steps on a `requestAnimationFrame` loop and draws
bars on a **Canvas 2D** element. **Zustand** holds UI-facing state and persists sound
settings. Sound uses the **Web Audio API** directly. Details and rejected alternatives are
in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0 (strict), targeting ES2022; Node.js 24 LTS for tooling

**Primary Dependencies**: React 19.3, React DOM 19.3, Zustand 5.0 (runtime); Vite 8.3 with
`@vitejs/plugin-react` 6.1 (build)

**Storage**: Browser `localStorage` for sound settings only (via Zustand `persist`); no
server, no database

**Testing**: Vitest 5 + Testing Library 16 + jsdom (unit and component); Playwright 1.64 +
`@axe-core/playwright` (end-to-end and accessibility); Vitest bench (step generation)

**Target Platform**: Current and previous major versions of Chrome, Edge, Firefox, Safari
(desktop and iOS), and Chrome for Android; static files, no installation

**Project Type**: Single-page client-side web application (static site)

**Performance Goals**: steady 60 fps animation with 1,000 values at every speed (SC-003);
visible response to any control within 100 ms (SC-004); uploaded 1,000 values shown within
1 s (SC-005); tones within 50 ms of their step (SC-006); interactive within 2 s on a
mid-range phone; worst-case run (~1.5 M steps) finishes within 30 s at max speed (FR-013)

**Constraints**: all data stays on the device (FR-008); no horizontal scroll from 360 px
(FR-029); WCAG 2.1 AA (SC-009); respects reduced-motion preference; worst-case step buffer
≈ 40 MB in memory

**Scale/Scope**: 1 screen, 20 algorithms, datasets of 2–1,000 values, one run at a time;
no accounts or backend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies | Status |
|-----------|------------------------|--------|
| I. Code Quality | TypeScript strict, ESLint (`typescript-eslint`, `react-hooks`) and Prettier as zero-error gates; one algorithm per file; documented module contracts in [contracts/](./contracts/) | Pass |
| II. Simplicity | One runtime dependency beyond React and React DOM (Zustand); no CSS framework, component library, audio library, or router; browser-native Canvas, Web Audio, Workers, and File APIs. Added complexity is listed in Complexity Tracking below | Pass (justified) |
| III. Testing | Unit tests for every algorithm (edge cases from the constitution, using the spec's minimum of 2 values instead of empty: all-equal values, duplicates, sorted, reverse, 1,000 values) and the replay/inverse invariant; parser tests for every rule in the input contract; component tests per control; one Playwright spec per user story; regression test required per bug fix | Pass |
| IV. User Experience | Every story has acceptance scenarios; [ui-contract.md](./contracts/ui-contract.md) defines every control's enabled state, feedback, error messages, keyboard use, non-color state cues, and live-region text; axe checks in every e2e spec; 360 px layout tested | Pass |
| V. Performance | Measurable budgets above; canvas rendering and the store updated at most once per frame keep React out of the hot path; budgets verified by DevTools traces, Lighthouse, and a Vitest bench ([quickstart.md](./quickstart.md)) | Pass |
| VI. Scalability | Stated limits: 1,000 values, < 1.8 M steps (under 30 s at max speed), ~40 MB; inputs above limits are rejected with clear messages; step generation runs in a worker so it never blocks the UI; algorithms, sound, and rendering are independent modules behind small interfaces | Pass |

**Post-design re-check (after Phase 1)**: Pass. The data model, contracts, and quickstart
introduce no new dependencies or layers beyond those listed. The one notable risk, 1,000
bars on a 360 px phone (under 1 CSS pixel each), is covered by drawing at device-pixel
resolution (≥ 3× on modern phones, so each bar is ≥ 1 device pixel) and is checked in the
360 px Playwright run.

## Project Structure

### Documentation (this feature)

```text
specs/001-sorting-visualizer/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and alternatives
├── data-model.md        # Phase 1: entities, step encoding, run state machine
├── quickstart.md        # Phase 1: run and validation guide
├── contracts/
│   ├── algorithm-contract.md     # Algorithm module, StepRecorder, step encoding, worker protocol
│   ├── dataset-input-format.md   # Upload/paste rules and error messages
│   └── ui-contract.md            # Controls, keyboard, visual states, announcements
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
index.html
package.json
vite.config.ts            # Vite + Vitest config
playwright.config.ts
tsconfig.json
eslint.config.js

src/
├── main.tsx              # Mounts <App />
├── App.tsx               # Page layout and regions
├── algorithms/
│   ├── types.ts          # AlgorithmDefinition, StepRecorder interfaces
│   ├── recorder.ts       # StepRecorder implementation over StepBuffer
│   ├── registry.ts       # ALGORITHMS catalog in picker order, getAlgorithm()
│   ├── bubble.ts, cocktail-shaker.ts, odd-even.ts, comb.ts, gnome.ts
│   ├── selection.ts, cycle.ts, heap.ts, pancake.ts
│   ├── insertion.ts, binary-insertion.ts, shell.ts
│   ├── merge.ts, quick.ts, tim.ts, intro.ts
│   └── counting.ts, radix-lsd.ts, radix-msd.ts, bucket.ts
├── engine/
│   ├── stepBuffer.ts     # Growable typed-array step storage, apply/undo
│   ├── steps.worker.ts   # Generates steps off the main thread
│   ├── stepsClient.ts    # Worker requests, stale-response handling
│   └── player.ts         # Playback clock, position, highlights, tweens
├── render/
│   └── barRenderer.ts    # Canvas drawing of bars, states, markers, completion sweep
├── audio/
│   └── soundEngine.ts    # Web Audio tones, pitch mapping, completion sweep
├── dataset/
│   ├── parse.ts          # parseDataset() per input contract
│   ├── random.ts         # Random dataset generation
│   └── facts.ts          # min/max/whole/non-negative facts for supports()
├── store/
│   └── appStore.ts       # Zustand store: dataset, run, history, settings (persisted)
├── components/
│   ├── DataPanel.tsx, UploadInput.tsx, PasteInput.tsx
│   ├── AlgorithmPicker.tsx, AlgorithmInfo.tsx
│   ├── Visualizer.tsx    # Canvas host, aria-label, resize handling
│   ├── Legend.tsx, Counters.tsx
│   ├── PlaybackBar.tsx, SpeedSlider.tsx
│   ├── SoundControls.tsx, SoundPrompt.tsx
│   ├── RunSummary.tsx
│   └── LiveRegion.tsx
├── hooks/
│   └── useKeyboardShortcuts.ts
└── styles/
    ├── tokens.css        # Color, spacing, type tokens; light and dark themes
    └── global.css

tests/
├── unit/                 # algorithms, recorder/stepBuffer invariants, parse, random, player, sound, store
├── integration/          # React component tests with Testing Library
├── e2e/                  # Playwright specs, one per user story, with axe checks
├── fixtures/             # Sample upload files
└── perf/                 # Vitest bench for step generation
```

**Structure Decision**: A single Vite project at the repository root. There is no backend,
so the "web application" frontend/backend split is not needed. Folders follow the module
boundaries in the contracts: `algorithms` (pure, no browser APIs), `engine` and `render`
(playback and drawing, no React), `audio`, `dataset` (pure), `store`, and thin React
`components` on top. Pure modules are unit-tested without a DOM.

## Complexity Tracking

Principle II requires each added dependency or non-obvious mechanism to name the simpler
option it replaces.

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| Zustand (runtime dependency) | State is read and written both by React and by the non-React playback loop, and counters update at frame rate | `useReducer` + Context re-renders every consumer on each change and cannot be used from the loop without extra plumbing (research §1) |
| Web Worker for step generation | Up to ~1.5 M steps per run; generating them on the main thread could freeze input on slow phones (Principle VI, SC-004) | Main-thread generation is simpler but risks breaking the 100 ms response target; the worker wrapper is ~40 lines with no dependency |
| Canvas rendering instead of DOM bars | 1,000 bars changing every frame at 60 fps on phones (SC-003) | DOM/SVG bars need style and layout work for hundreds of elements per frame |
| Precomputed typed-array step list | Step back (FR-012a) needs full history; typed arrays keep the worst case at ~40 MB | Lazy generators still need stored history for stepping back and are slower per step |
