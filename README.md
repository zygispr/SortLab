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
npm run lint         # ESLint + Stylelint, zero errors
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
- **`src/components/`**: the React interface, in five atomic design levels (see
  [Component structure](#component-structure)).

Design documents (spec, plan, contracts, validation guide) are in
[`specs/001-sorting-visualizer/`](specs/001-sorting-visualizer/).

## Component structure

Interface components live in `src/components/`, one folder per atomic design level. A
component's folder is its level, and nothing else sits in `src/components/`.

| Level    | Folder       | May import components from  | May use app state | Holds                                                            |
| -------- | ------------ | --------------------------- | ----------------- | ---------------------------------------------------------------- |
| Atom     | `atoms/`     | none                        | No                | The smallest reusable elements                                   |
| Molecule | `molecules/` | atoms                       | No                | Small groups of atoms or plain elements that act as one unit     |
| Organism | `organisms/` | atoms, molecules, organisms | Yes               | Distinct, state-connected sections of the screen                 |
| Template | `templates/` | atoms, molecules, templates | No                | Page layout: regions and their arrangement, filled through props |
| Page     | `pages/`     | any level                   | Yes               | The SortLab screen and its page-wide behavior                    |

"App state" means `src/store/`, `zustand`, or `src/hooks/` (whose hooks read the store).
Atoms, molecules, and templates take everything they show as props and report every user
action through callback props. Importing a component includes importing its CSS module
(`.module.scss`); a component's own CSS module is always allowed.

To decide the level of a new component, apply these rules in order:

1. Reads or changes app state → **organism**, or the **page** if it is the whole screen.
2. Arranges page regions and holds no content of its own → **template**.
3. A single element (possibly with a hidden helper element) that uses no other component
   → **atom**.
4. Otherwise, a small group of plain elements and/or atoms (or an atom's styles) that works
   as one unit → **molecule**. Something built from molecules is an **organism**.

A component needed by only one parent today still gets its own file when it is a
self-contained piece of interface.

The components in each level:

- **Atoms**: `Button` (primary and secondary variants), `Slider`, `TextArea`, `MutedText`.
- **Molecules**: `RangeField` (labelled slider), `Legend` (bar-state legend), `FileButton`
  (file picker that looks like a button).
- **Organisms**: `DataPanel`, `UploadInput`, `PasteInput`, `AlgorithmPicker`,
  `AlgorithmInfo`, `Visualizer`, `Counters`, `PlaybackBar`, `SpeedSlider`, `SoundControls`,
  `RunSummary`, `LiveRegion`.
- **Templates**: `PageLayout` (header, controls and stage columns, summary row), `Region`
  (labelled panel).
- **Pages**: `SortLabPage`.

Use `Button` for every button and `RangeField` for every labelled slider; they carry the
shared look, focus outline, disabled state, and accessible labelling.

Code that is not a component stays outside the levels: helpers in `src/util/` (`clamp`,
`formatSeconds`), hooks in `src/hooks/`, and shared styles in `src/styles/` (see
[Styles](#styles)).

`npm run lint` enforces the import and app-state rules (`eslint.boundaries.js`), and
`npm test` checks that every file in `src/components/` sits in a level folder. Design
documents are in
[`specs/002-atomic-design-components/`](specs/002-atomic-design-components/).

## Styles

All styles are SCSS, compiled to plain CSS at build time:

- **`<Component>.module.scss`** next to each component: a CSS module whose class names are
  private to that component.
- **`src/styles/tokens.scss`**: the design tokens, as CSS custom properties for the light
  and dark themes.
- **`src/styles/global.scss`**: page-wide rules for plain elements (box sizing, base
  typography, focus outline, disabled controls, `.visually-hidden`, reduced motion).
- **`src/styles/_shared.scss`**: build-time values and patterns that emit no CSS on their
  own.

Load the shared items with `@use` and keep the `shared.` prefix, so a reader can see
where a name comes from:

```scss
@use '../../styles/shared';

.button {
  @include shared.bordered-surface;

  &:hover:not(:disabled) {
    border-color: var(--color-focus);
  }
}
```

| Shared item        | What it is                                                        | Used by                                          |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------ |
| `shared.$wide`     | The 1024 px breakpoint for two columns and the full-width summary | `PageLayout`                                     |
| `bordered-surface` | Border, radius, and surface background                            | `Button`, `TextArea`, algorithm select, `Region` |
| `bare-list`        | A list with no bullets, indent, or margins                        | `Legend`, algorithm complexity, `Counters`       |
| `wrap-row`         | A wrapping, vertically centered row with a small gap              | `PlaybackBar`                                    |
| `focus-ring`       | The keyboard focus outline                                        | global `:focus-visible`, `FileButton` label      |

Rules:

- **Nest by element.** Put an element's states (`&:hover`, `&:disabled`,
  `&[aria-invalid='true']`, `&::before`), its `@media` changes, and its directly related
  children under its own rule. Never nest in a way that creates a selector the element
  does not need.
- **Three levels at most**: a top-level rule plus two nested ones. A nested `@media`
  counts as a level. `npm run lint` (Stylelint `max-nesting-depth`) enforces this.
- **Runtime values stay custom properties.** Theme colors, spacing, radius, fonts, and the
  bar-color parameters live in `tokens.scss`. They switch with the color scheme, and
  `src/render/barRenderer.ts` reads them while the app runs. A Sass `$variable` is only
  for a value that never changes at runtime and that a media query needs, or that more
  than one file uses.
- **Name a pattern once it repeats.** A group of three or more declarations used in three
  or more places becomes a mixin in `_shared.scss`; fewer repeats stay inline.
- **`composes` only within the same file.** To reuse another component's look, use that
  component or a class helper it exports, such as `buttonClass()` from `Button`. A
  `composes … from` another `.scss` file ships uncompiled Sass.
- **Interpolate `var()` arguments in color functions**, as in
  `hsl(#{var(--h) var(--s) var(--l)})`. Otherwise Sass rewrites the space-separated syntax
  into the comma form.
- **Use `@use`, never `@import`**; `@import` is deprecated in Sass.

`npm test` (`tests/unit/styleRules.test.ts`) rejects plain `.css` files, cross-file
`composes`, and any shared pattern written out outside `_shared.scss`. Design documents
are in [`specs/003-scss-styling/`](specs/003-scss-styling/).
