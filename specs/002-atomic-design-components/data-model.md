# Data Model: Atomic Design Component Structure

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This feature has no runtime data. Its "entities" are the levels and the components that
belong to them (spec → Key Entities). This file is the inventory that implementation and
the README section (FR-006) follow.

## Level

| Level | Folder | May import components from | May use app state | Holds |
|-------|--------|----------------------------|-------------------|-------|
| Atom | `src/components/atoms/` | atoms | No | The smallest reusable elements |
| Molecule | `src/components/molecules/` | atoms, molecules | No | Small groups of atoms that act as one unit |
| Organism | `src/components/organisms/` | atoms, molecules, organisms | Yes | Distinct, state-connected sections of the screen |
| Template | `src/components/templates/` | atoms, molecules, templates | No | Page layout: regions and their arrangement, filled through props |
| Page | `src/components/pages/` | any level | Yes | The SortLab screen and its page-wide behavior |

"App state" means the store module (`src/store/`), `zustand`, or `src/hooks/` (whose
hooks read the store). Any component may import other non-component code: `src/util/`,
`src/algorithms/`, `src/dataset/`, and `src/render/`.

### Classification rules (in order)

1. Reads or changes app state → **organism**, or the **page** if it is the whole screen.
2. Arranges page regions and holds no content of its own → **template**.
3. Built from other components and works as one small unit → **molecule**.
4. Otherwise, a single element (possibly with a hidden helper element) → **atom**.

A component needed by only one parent today still gets its own file when it is a
self-contained piece of interface; it is not split further than that.

## Component inventory

"Today" is the path before the restructure; "New" is the path after. Every `.tsx` under
`src/components/` today appears exactly once.

### Atoms (all new, extracted from existing markup)

| Component | New path | Replaces | Props (summary; full contract in [contracts](./contracts/component-levels.md)) |
|-----------|----------|----------|------|
| `Button` | `atoms/Button.tsx` | all 10 `<button>` elements, styled today with `controls.button`, `controls.primary`, or `styles.dismiss`: `PlaybackBar` (5), `DataPanel`, `PasteInput`, `SoundPrompt` (2), `SoundControls` | `variant`: `primary` · `secondary` (default) · `quiet`, plus native button props |
| `FileButton` | `atoms/FileButton.tsx` | the label-styled-as-button file picker in `UploadInput` | `label`, `accept`, `onFile(file)` |
| `Slider` | `atoms/Slider.tsx` | the `<input type="range">` in `RangeField` | `id`, `min`, `max`, `step?`, `value`, `valueText`, `onChange(value)` |
| `TextArea` | `atoms/TextArea.tsx` | the `<textarea>` in `PasteInput` | native textarea props; `invalid` maps to `aria-invalid` |
| `MutedText` | `atoms/MutedText.tsx` | 4 `<p/span className={controls.muted}>` in `PlaybackBar`, `SoundControls`, `RunSummary`, `DataPanel` | `as?`: `p` (default) · `span`, children |

### Molecules

| Component | Today | New path | Built from |
|-----------|-------|----------|------------|
| `Field` | (new; label row in `RangeField` and `PasteInput`) | `molecules/Field.tsx` | label + optional visible value + one control (children) |
| `RangeField` | `components/RangeField.tsx` | `molecules/RangeField.tsx` | `Field` + `Slider` |
| `Legend` | `components/Legend.tsx` | `molecules/Legend.tsx` | static swatches and markers; no state |

### Organisms (moved; behavior unchanged)

| Component | Today | New path | Uses (new) |
|-----------|-------|----------|-----------|
| `DataPanel` | `components/DataPanel.tsx` | `organisms/DataPanel.tsx` | `RangeField`, `Button`, `MutedText`, `UploadInput`, `PasteInput` |
| `UploadInput` | `components/UploadInput.tsx` | `organisms/UploadInput.tsx` | `FileButton` |
| `PasteInput` | `components/PasteInput.tsx` | `organisms/PasteInput.tsx` | `Field`, `TextArea`, `Button` |
| `AlgorithmPicker` | `components/AlgorithmPicker.tsx` | `organisms/AlgorithmPicker.tsx` | — |
| `AlgorithmInfo` | `components/AlgorithmInfo.tsx` | `organisms/AlgorithmInfo.tsx` | — |
| `Visualizer` | `components/Visualizer.tsx` | `organisms/Visualizer.tsx` | — |
| `Counters` | `components/Counters.tsx` | `organisms/Counters.tsx` | — |
| `PlaybackBar` | `components/PlaybackBar.tsx` | `organisms/PlaybackBar.tsx` | `Button`, `MutedText`, `SpeedSlider`, `SoundPrompt` |
| `SpeedSlider` | `components/SpeedSlider.tsx` | `organisms/SpeedSlider.tsx` | `RangeField` |
| `SoundPrompt` | `components/SoundPrompt.tsx` | `organisms/SoundPrompt.tsx` | `Button` |
| `SoundControls` | `components/SoundControls.tsx` | `organisms/SoundControls.tsx` | `Button`, `RangeField`, `MutedText` |
| `RunSummary` | `components/RunSummary.tsx` | `organisms/RunSummary.tsx` | `MutedText` |
| `LiveRegion` | `components/LiveRegion.tsx` | `organisms/LiveRegion.tsx` | — |

### Templates

| Component | Today | New path | Notes |
|-----------|-------|----------|-------|
| `Region` | `Region` function inside `App.tsx` | `templates/Region.tsx` | labelled `<section>` named by its `<h2>`, heading optionally visually hidden (FR-009) |
| `PageLayout` | layout markup in `App.tsx` + `App.module.css` | `templates/PageLayout.tsx` | header, controls column, stage column, full-width summary, live-region slot; one column below 1,024 px |

### Page

| Component | Today | New path | Notes |
|-----------|-------|----------|-------|
| `SortLabPage` | `App.tsx` | `pages/SortLabPage.tsx` | page-wide effects (keyboard shortcuts, pause on hidden, reduced motion); fills `PageLayout` with organisms |

### Not components (outside the levels)

| File | Today | New path |
|------|-------|----------|
| `formatSeconds` | `components/format.ts` | `util/format.ts` |
| shared control styles | `components/controls.module.css` | split into `atoms/Button.module.css`, `atoms/Slider.module.css`, `atoms/MutedText.module.css`, `molecules/Field.module.css`; file deleted |
| layout styles | `App.module.css` | `templates/PageLayout.module.css`, `templates/Region.module.css`; file deleted |
| feature CSS modules | `components/*.module.css` | beside their organism or molecule (`Sound.module.css` is shared by `SoundPrompt` and `SoundControls`, both organisms) |
| `useKeyboardShortcuts` | `hooks/useKeyboardShortcuts.ts` | unchanged |

## Counts (for SC-001, SC-004)

| | Before | After |
|---|---|---|
| Components outside a level | 15 (+ `App`) | 0 |
| Atoms / molecules / organisms / templates / pages | — | 5 / 3 / 13 / 2 / 1 |
| Components that style a button directly | 6 | 1 (`Button`; `FileButton` reuses its stylesheet) |
| Definitions of the labelled slider | 1 used by 3 | 1 used by 3 |
