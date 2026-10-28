# Phase 0 Research: Sorting Algorithm Visualizer

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-28

Versions below were checked against the npm registry on 2026-10-28.

## 1. State management

**Decision**: **Zustand 5** for application state (dataset, selected algorithm, run status
and counters, run history, settings), with its `persist` middleware for the remembered sound
settings. The per-frame animation state (current bar order, highlights, tween progress)
lives outside React and outside the store, in a plain `Player` object that the canvas reads
directly on each animation frame.

**Rationale**:

- The app has one screen and one shared state tree, but state changes at two very
  different rates: UI state (status, selection, settings) changes on user actions, while
  playback advances up to ~1,000 steps per frame. Zustand's selector subscriptions let each
  component re-render only for the slice it reads, so the counter display can update at
  frame rate without re-rendering the algorithm picker or controls.
- The playback loop and the sound engine are not React components. Zustand stores are
  usable outside React (`getState`, `setState`, `subscribe`), so the loop can push progress
  and read settings without React glue code.
- `persist` covers FR-026 (remember mute and volume) and FR-026a (sound prompt shown only
  once) with a few lines and no custom storage code.
- It is ~1 KB, has no boilerplate (no actions/reducers/providers), and its store is a plain
  function that is easy to unit-test by calling actions and reading state.

**Alternatives considered**:

| Option | Why not chosen |
|--------|----------------|
| `useReducer` + Context | Every context consumer re-renders on any change. Counter updates at 60 Hz would re-render the whole control panel; splitting into many contexts adds the boilerplate Zustand avoids. Not reachable from the non-React playback loop without extra plumbing. |
| Redux Toolkit 2.13 | Works well but brings actions, slices, a provider, and more concepts than a single-screen app needs. Its strengths (devtools-driven debugging of large teams' state, middleware ecosystem, RTK Query) are not needed here. Conflicts with Principle II. |
| Jotai | Atom-per-value model is fine for scattered independent state, but our state is one cohesive tree with cross-field rules (changing dataset resets run and history). A single store expresses those rules more simply. |
| Local `useState` only | State is shared across controls, canvas, summary, and the playback loop; prop drilling plus a non-React loop would be awkward and error-prone. |

## 2. Rendering the bars

**Decision**: Draw the visualization on a single **HTML Canvas 2D** element, scaled for the
device pixel ratio and resized with `ResizeObserver`. Redraw only on animation frames where
something changed.

**Rationale**: Up to 1,000 bars, many changing per frame at high speeds. One canvas draws
1,000 rectangles in well under a millisecond and needs no per-bar layout or style work,
which keeps a steady 60 fps (SC-003, Principle V). Sliding animation between positions is
a simple interpolation of x coordinates.

**Alternatives considered**: 1,000 DOM `<div>` bars with CSS transforms (layout and style
recalculation for hundreds of elements per frame, risky on phones); SVG (same per-element
cost); WebGL (much more code for no visible gain at 1,000 bars).

**Accessibility**: Canvas content is not readable by assistive technology, so the canvas
has `role="img"` with an `aria-label` describing the dataset and run status, and a polite
live region announces each step only during manual stepping (see
[contracts/ui-contract.md](./contracts/ui-contract.md)).

## 3. Producing the steps

**Decision**: Each algorithm is a plain function that sorts a working copy through a
`StepRecorder` (`compare`, `read`, `swap`, `write`, `markSorted`). The recorder performs the
operation on the working copy **and** appends a step to a compact, growable typed-array
buffer. The whole step list is generated **before** playback starts, inside a **Web
Worker**, and transferred back to the main thread without copying.

**Rationale**:

- Stepping back (FR-012a) needs the full ordered step list; generating it up front also
  makes playback a trivial loop over an array and makes the run length known in advance.
- Algorithms read like ordinary textbook code (`if (r.compare(i, j) > 0) r.swap(i, j)`), and
  correctness is tested directly: the recorder's working copy must end sorted, and
  replaying the steps on the original data must produce the same result.
- Worst case is ~1.5 M steps (Gnome Sort on 1,000 reverse-ordered values; Bubble and
  Odd-Even are ~1 M). Generating that takes tens of milliseconds and the buffer is ~40 MB; doing it in a worker
  keeps the UI responsive (Principle VI, SC-004), and transferring `ArrayBuffer`s avoids a
  copy. Vite bundles workers natively (`new Worker(new URL(...), { type: 'module' })`), so
  no extra dependency is needed.
- Steps are regenerated in the background whenever the dataset or algorithm changes, so
  pressing Start is normally instant; if generation is still running, Start shows a
  "Preparing…" state immediately.

**Alternatives considered**: Generator functions (`function*`) yielding steps lazily —
elegant for forward playback but stepping back would still require keeping history, and
generators are slower per step; generating on the main thread — simpler, but a 1 M-step
generation would freeze input for a noticeable moment on slow phones.

## 4. Playback timing and smooth motion

**Decision**: A `requestAnimationFrame` loop advances `speed × elapsedSeconds` steps per frame
(fractional remainder carried over). Speed ranges from **2 to 60,000 steps per second** on a
logarithmic slider. At speeds where one step lasts longer than one frame, moved bars slide
from their old to new position over the step's duration (capped at 250 ms); at higher
speeds the frame simply shows the latest state. When the user prefers reduced motion, bars
move instantly.

**Rationale**: The worst case of ~1.5 M steps finishes in about 25 s at 60,000 steps/s, inside
FR-013's 30 s limit; 2 steps/s is slow enough to follow each comparison. A time-based loop
keeps speed consistent across 60 Hz and 120 Hz displays. Updating the Zustand store at most
once per frame keeps React work bounded no matter how many steps a frame covers.

**Tab hidden**: listen for `visibilitychange` and pause (FR-015).

## 5. Sound

**Decision**: The browser's built-in **Web Audio API**, no library. Each tone is a short
oscillator note (≈2 ms attack, ≈80 ms exponential decay) routed through a master gain and a
`DynamicsCompressorNode`. Pitch maps value to frequency exponentially from 200 Hz (smallest
value) to 1,200 Hz (largest). At most one tone per animation frame is played (the latest
step's value), scheduled on the audio clock for the frame's time. Completion plays a quick
rising sweep across the sorted values.

**Rationale**: Envelopes avoid clicks; one-tone-per-frame plus the compressor stops loudness
building up at high speed (FR-027); scheduling on the audio clock keeps tones within the
50 ms sync target (SC-006). The `AudioContext` is created when the user first turns sound on,
which is the user gesture browsers require, so the first tone plays without an error.

**Alternatives considered**: Tone.js or Howler.js — capable, but add a sizable dependency for
what is a few dozen lines of Web Audio code (Principle II).

## 6. Data input

**Decision**: Read uploaded files with `File.text()` in the browser. Accept `.txt`, `.csv`
and `text/*` types up to 1 MB; reject files containing NUL bytes as non-text. Parse with one
pure function shared by upload and paste: split on commas, whitespace, semicolons and
newlines; parse each token as a finite decimal number; report the first invalid token with
its line and position. Full rules: [contracts/dataset-input-format.md](./contracts/dataset-input-format.md).

**Rationale**: Keeps data on the device (FR-008), needs no parsing library, and one pure
function is trivial to unit-test exhaustively.

## 7. Tooling and versions

| Area | Choice | Version | Notes |
|------|--------|---------|-------|
| Runtime for tooling | Node.js | 24 LTS (24.14 installed) | Vite 8 requires a modern Node |
| UI library | React + React DOM | 19.3 | As requested |
| Build tool / dev server | Vite + `@vitejs/plugin-react` | 8.3 / 6.1 | As requested; native workers and CSS modules |
| Language | TypeScript (strict) | 6.0.3 | TypeScript 7.0 is out, but `typescript-eslint` 8.72 supports only `<6.1`; stay on 6.0 until it does |
| State | Zustand | 5.0 | See §1 |
| Unit and component tests | Vitest + Testing Library (`@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`) + jsdom | 5.0 / 16.3 (`react`), 10.4 (`dom`), 14.6 (`user-event`), 7.0 (`jest-dom`) / 30.1 | Shares Vite config. `@testing-library/dom` is a required peer of `react` and `jest-dom` that npm does not install on its own. jsdom 30.1 needs Node ≥ 24.15. `user-event` simulates real keyboard and pointer input for the keyboard and control tests; `jest-dom` adds DOM matchers (`toBeDisabled`, `toHaveAccessibleName`) |
| Type definitions | `@types/react`, `@types/react-dom` | matching React 19 | Required for TypeScript strict mode with React |
| End-to-end and accessibility tests | Playwright + `@axe-core/playwright` | 1.64 / 4.14 | Chromium, Firefox, WebKit, and a phone viewport |
| Lint / format | ESLint + `typescript-eslint` + `eslint-plugin-react-hooks`; Prettier | 10.13 / 8.72; 3.9 | Zero-error gate (Principle I) |
| Styling | Plain CSS with CSS custom properties and CSS Modules | — | No CSS framework needed for one screen |

**Rejected additions**: React Compiler (not needed once hot-path rendering bypasses React),
a component library (one screen, custom controls are small), Tailwind (CSS Modules suffice).

## 8. Algorithm implementation notes

- **Shell Sort**: Ciura gap sequence (1, 4, 10, 23, 57, 132, 301, 701), extended by ×2.25.
- **Comb Sort**: shrink factor 1.3.
- **Quick Sort**: Lomuto partition with median-of-three pivot, so already-sorted input stays
  fast.
- **Intro Sort**: Quick Sort with Heap Sort fallback at depth `2·log2(n)`, Insertion Sort for
  ranges under 16.
- **Tim Sort**: simplified teaching version: minimum run 32, Binary Insertion Sort for runs,
  stack-based merging of runs; galloping mode omitted (noted in the algorithm description).
- **Merge Sort**: top-down; merged values are written back into the main array, so each
  placement is a `write` step.
- **Pancake Sort**: each flip is recorded as the sequence of swaps that reverses the prefix.
- **Cycle Sort**: positions are found with `compare` steps; placements are `write` steps.
- **Counting Sort**: one `read` per value to count, then `write`s in sorted order; supports
  negatives by offsetting by the minimum.
- **Radix Sort (LSD/MSD)**: base 10; `read` for each digit inspection, `write` for each
  placement.
- **Bucket Sort**: √n buckets by value range, written back bucket by bucket, then Insertion
  Sort inside each bucket.

All unresolved items from Technical Context are now resolved.
