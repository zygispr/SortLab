# Implementation Plan: Atomic Design Component Structure

**Branch**: `002-atomic-design-components` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-atomic-design-components/spec.md`

## Summary

Reorganize SortLab's 15 flat interface components, plus the `App` shell, into the five
atomic design levels, with no change an end user can see or hear. Repeated markup becomes
shared building blocks: a `Button` atom replaces ten hand-styled buttons, and a `Field`
molecule backs the labelled sliders and the paste box. The page layout becomes a
state-free template that the page fills through props.

The level rules are enforced by ESLint's built-in `no-restricted-imports`, with one
message per rule, and a unit test proves each rule fires. A permanent Playwright
screenshot check, with reference images captured before anything moves, proves the
screen is pixel-identical in both themes at 360 px and 1440 px. No dependency is added.
Details are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (strict), Node.js ≥ 24.15

**Primary Dependencies**: React 19.3, Zustand 5.0 (unchanged); build Vite 8.3; tooling
ESLint 10.13 with typescript-eslint, Prettier 3.9. No additions.

**Storage**: N/A (sound settings in `localStorage` are untouched)

**Testing**: Vitest 5 + Testing Library (unit and component); Playwright 1.64 +
`@axe-core/playwright` (e2e, accessibility, and the new screenshot check); ESLint's Node
API inside Vitest for the boundary-rule test

**Target Platform**: Unchanged from feature 001: current and previous Chrome, Edge,
Firefox, Safari (desktop and iOS), Chrome for Android; CI on Ubuntu, development on macOS

**Project Type**: Single-page web application (one Vite project at the repo root)

**Performance Goals**: Unchanged budgets from feature 001 (no frames > 50 ms at max
speed, control response < 100 ms, interactive < 2 s on mid-range mobile); gzipped JS +
CSS grows ≤ 2% (SC-006)

**Constraints**: Zero visible change (FR-011): pixel-identical screenshots, identical
accessible names, focus order, and announcements; existing tests change only in import
paths (FR-012)

**Scale/Scope**: 16 components today become 24 (5 atoms, 3 molecules, 13 organisms,
2 templates, 1 page), plus 8 atom and molecule test files, 1 boundary test, 1 visual
spec with 8 reference images, 1 manual CI workflow, 1 README section

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|-----------|------------------------|--------|
| I. Code Quality | Removes the remaining duplication: 10 hand-styled buttons → `Button`, 4 muted-text copies → `MutedText`, 2 field headers → `Field`. Every new component exported with a TSDoc contract. Lint, format, and type checks stay at zero errors; boundary rules run in the same lint gate | Pass |
| II. Simplicity | Built-in ESLint rule instead of a boundaries plugin; no barrel files; no component catalog tool (spec Assumptions). Additions are only the five folders the spec requires, and one manual CI workflow (see Complexity Tracking) | Pass (one justified addition) |
| III. Testing | Visual check and boundary test written and the references captured **before** any component moves; one test file per atom and molecule (FR-016); the full existing suite keeps its assertions (FR-012); each rule's violation is shown to fail (SC-003) | Pass |
| IV. User Experience | No visible change by construction and by proof (pixel-identical images, axe checks unchanged); shared atoms make future controls consistent | Pass |
| V. Performance | Budgets re-measured, not assumed: bundle size before/after, plus feature 001's frame-rate and Lighthouse checks ([quickstart.md](./quickstart.md#performance-sc-006)) | Pass |
| VI. Scalability | Clear component boundaries with enforced one-way dependencies and state access only in organisms and the page | Pass |

**Gate result (pre-research)**: pass. **Re-check after Phase 1 design**: pass. The design
added `eslint.boundaries.js` and the `visual-baselines.yml` workflow; the first is
configuration for an existing tool, the second is recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/002-atomic-design-components/
├── plan.md                      # This file
├── research.md                  # Phase 0: decisions and alternatives
├── data-model.md                # Phase 1: levels and full component inventory
├── quickstart.md                # Phase 1: validation guide
├── contracts/
│   └── component-levels.md      # Phase 1: dependency rules, component props, visual check
├── checklists/requirements.md   # spec quality checklist
└── tasks.md                     # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── main.tsx                     # renders <SortLabPage /> (was <App />)
├── components/
│   ├── atoms/                   # Button, FileButton, Slider, TextArea, MutedText (+ CSS modules)
│   ├── molecules/               # Field, RangeField, Legend (+ CSS modules)
│   ├── organisms/               # DataPanel, UploadInput, PasteInput, AlgorithmPicker,
│   │                            # AlgorithmInfo, Visualizer, Counters, PlaybackBar,
│   │                            # SpeedSlider, SoundPrompt, SoundControls, RunSummary,
│   │                            # LiveRegion (+ their CSS modules)
│   ├── templates/               # PageLayout, Region (+ CSS modules from App.module.css)
│   └── pages/                   # SortLabPage
├── util/                        # clamp.ts, format.ts (moved from components/)
├── hooks/  store/  engine/  render/  audio/  algorithms/  dataset/  styles/   # unchanged
│                                # (App.tsx, App.module.css, components/controls.module.css,
│                                #  components/format.ts are removed)

eslint.boundaries.js             # level rules, spread into eslint.config.js
.github/workflows/visual-baselines.yml   # manual: capture Linux reference images

tests/
├── unit/boundaries.test.ts      # each rule fires with its message; folder check
├── integration/
│   ├── atoms/                   # Button, FileButton, Slider, TextArea, MutedText tests
│   ├── molecules/               # Field, RangeField, Legend tests
│   └── *.test.tsx               # existing tests, import paths updated; App → SortLabPage
└── e2e/
    ├── visual.spec.ts           # 4 full-page screenshots, chromium only
    └── visual.spec.ts-snapshots/  # 4 × darwin + 4 × linux reference images

README.md                        # new "Component structure" section (FR-006)
```

**Structure Decision**: Keep the single Vite project. Levels are folders under
`src/components/` (research §1), and non-component helpers move to `src/util/`. The full
mapping from each current file to its new path is in [data-model.md](./data-model.md).

### Order of work (for /speckit-tasks)

1. Visual check, Linux baseline workflow, reference images, bundle size, all on the
   unchanged code.
2. Boundary rules and their test. They pass trivially while nothing lives in a level
   folder; the folder check fails until step 5.
3. Atoms and molecules with their tests (TDD); extract and replace in place.
4. Templates, then the page; `main.tsx` switches to `SortLabPage`.
5. Move organisms into `organisms/`; update imports in code and tests; delete the
   emptied files.
6. README section; all gates, visual check on macOS and Linux, performance re-check.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| CI workflow `visual-baselines.yml` (manual, or on changes to its own file) to capture Linux reference images | Pixel-exact screenshots only match on the platform that took them (clarification Q1), CI runs Linux, and the development Mac has no Docker to produce Linux images locally | Checking only on macOS leaves CI without the permanent check the spec requires; adding a pixel tolerance would let real regressions through; installing Docker is a machine change outside the repo |
