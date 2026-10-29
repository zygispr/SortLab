# Implementation Plan: SCSS Styling

**Branch**: `003-scss-styling` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-scss-styling/spec.md`

## Summary

Convert SortLab's 19 stylesheets (tokens, global rules, and one CSS module per
component) to SCSS, with no change an end user can see.

- **Nesting**: each element's states, `@media` changes, and directly related children are
  nested under it, to at most three levels.
- **Shared partial**: `src/styles/_shared.scss`, loaded with `@use` and the `shared.`
  namespace, defines the 1024 px breakpoint and four mixins for the groups that repeat
  (`bordered-surface` ×4, `bare-list` ×3, `wrap-row` ×3, `focus-ring` ×2).
- **Design tokens**: they stay CSS custom properties, because theme switching and the
  bar renderer read them at runtime.

A scratch build found that Vite resolves a cross-file `composes` by reading the target
`.scss` raw and pasting it uncompiled into the bundle. The only such use, FileButton's
label, is replaced: the Button atom exports a `buttonClass()` helper, and FileButton
applies it to the label. A test keeps cross-file `composes` out from now on.

**Enforcement**:

- Stylelint runs only `max-nesting-depth` inside `npm run lint`.
- A Vitest file rejects `.css` files and cross-file `composes`, and proves the depth rule
  fires.

**No visible change** is proven three ways:

- feature 002's pixel-exact visual check, with its references unchanged
- a review of the compiled CSS before and after
- the full test suite

Three dev dependencies are added (`sass`, `stylelint`, `postcss-scss`); they are
justified below. Details are in [research.md](./research.md).

## Technical Context

**Language/Version**: SCSS (Dart Sass 1.105), TypeScript ~6.0.3 (strict), Node.js ≥ 24.15

**Primary Dependencies**:

- Runtime, unchanged: React 19.3, Zustand 5.0.
- Build: Vite 8.3, which compiles SCSS natively once `sass` is installed, so
  `vite.config.ts` does not change.
- New dev dependencies: `sass@^1.105.2`, `stylelint@^17.16.0`, `postcss-scss@^4.0.9`.
- Existing tooling: ESLint 10.13, Prettier 3.9, which formats SCSS natively.

**Storage**: N/A

**Testing**:

- Vitest 5: the new `tests/unit/styleRules.test.ts` uses `import.meta.glob` and
  Stylelint's Node API.
- Playwright 1.64 + `@axe-core/playwright`: the existing e2e, accessibility, and visual
  checks, with references unchanged.
- A manual compiled-CSS diff review ([quickstart §3](./quickstart.md#3-compiled-css-equivalence-review)).

**Target Platform**: Unchanged: current and previous Chrome, Edge, Firefox, Safari
(desktop and iOS), Chrome for Android. CI on Ubuntu, development on macOS.

**Project Type**: Single-page web application (one Vite project at the repo root)

**Performance Goals**:

- Shipped CSS grows ≤ 5% (FR-016); about ±1% is expected (R10).
- Feature 001's runtime budgets are unchanged: no frames > 50 ms, response < 100 ms,
  interactive < 2 s.
- The browser still receives plain CSS.

**Constraints**:

- Zero visible change (FR-013): the 8 visual references pass pixel for pixel and are not
  re-captured.
- Compiled selectors and declarations match the pre-conversion build, except the
  differences listed in R8.
- Tests change only in stylesheet file names (FR-015).

**Scale/Scope**: 19 stylesheets (about 540 lines) renamed and restructured, plus 1 new
partial and 22 import lines (2 in `main.tsx`, 20 in the 20 component files that import a
CSS module). Also `buttonClass()` exported from `atoms/Button.tsx` and used in
`molecules/FileButton.tsx`. Also 1 lint regex, 1 test file updated, 1 new test file, 1 Stylelint config,
1 `package.json` script, and 1 README section.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|-----------|------------------------|--------|
| I. Code Quality | Removes the three-plus repeats (FR-006): 4 bordered surfaces, 3 bare lists, 3 wrapping rows become mixins, and the breakpoint is named once. Two-copy groups stay inline per the threshold. `focus-ring` is extracted at two uses because both must stay identical ([data-model](./data-model.md#shared-style-values-and-patterns-srcstyles_sharedscss)). Each shared item gets a `///` doc comment stating what it emits. Lint, format, and type checks stay at zero errors; Stylelint runs in the same lint gate | Pass |
| II. Simplicity | Three new dev dependencies, recorded in Complexity Tracking with the simpler alternatives rejected. No runtime dependency, no Vite config, one partial, one Stylelint rule rather than a preset, and no custom CSS-modules loader (R3) | Pass (justified additions) |
| III. Testing | The baseline CSS and sizes are recorded **before** any file changes. The new `styleRules.test.ts` proves each check both fails and passes (SC-008). The visual check and full suite keep their assertions (FR-014, FR-015). FileButton's changed class wiring is covered by the existing `upload-focus-*` references and its component test | Pass |
| IV. User Experience | No visible change by construction (selector-equivalence rules, [contract §2](./contracts/style-rules.md#2-authoring-rules)) and by proof (pixels plus compiled-CSS diff). Tokens, focus ring, contrast, and reduced motion are untouched | Pass |
| V. Performance | Measured, not assumed: CSS bytes before and after, plus feature 001's frame-rate and Lighthouse checks re-run ([quickstart §4](./quickstart.md#4-performance-fr-016-sc-007)). Sass compiles at build time only | Pass |
| VI. Scalability | Component styles stay CSS-module scoped. Shared build-time items live in one partial with an explicit `@use` per file, so a component's dependencies are visible in its file | Pass |

**Gate result (pre-research)**: pass, with the dependency additions to justify.
**Re-check after Phase 1 design**: pass. The design added the cross-file `composes`
removal (R3) and its test. Both reduce complexity: one CSS-module feature fewer and one
class fewer on the label. No new violation.

## Project Structure

### Documentation (this feature)

```text
specs/003-scss-styling/
├── plan.md                 # This file
├── research.md             # Phase 0: decisions, scratch-build findings, alternatives
├── data-model.md           # Phase 1: entities and the per-file conversion inventory
├── quickstart.md           # Phase 1: validation guide
├── contracts/
│   └── style-rules.md      # Phase 1: shared partial API, authoring rules, checks, README
├── checklists/
│   └── requirements.md     # Spec quality checklist (from /speckit-specify)
└── tasks.md                # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
src/
├── main.tsx                         # imports tokens.scss, global.scss
├── styles/
│   ├── _shared.scss                 # NEW: $wide + 4 mixins (contract §1)
│   ├── tokens.scss                  # was tokens.css; same custom properties
│   └── global.scss                  # was global.css
└── components/
    ├── atoms/        *.module.scss  # Button, MutedText, Slider, TextArea
    ├── molecules/    *.module.scss  # FileButton (+ FileButton.tsx uses buttonClass()), Legend, RangeField
    ├── organisms/    *.module.scss  # AlgorithmPanel, Counters, DataPanel, PlaybackBar, RunSummary, Sound, Visualizer
    ├── templates/    *.module.scss  # PageLayout, Region
    └── pages/        *.module.scss  # SortLabPage

tests/unit/
├── boundaries.test.ts               # allowed paths .module.css → .module.scss
└── styleRules.test.ts               # NEW: no .css, no cross-file composes, depth-rule proof

eslint.boundaries.js                 # SIBLING regex → \.module\.scss$
stylelint.config.js                  # NEW: postcss-scss, max-nesting-depth 2
package.json                         # 3 dev deps; lint script runs Stylelint after ESLint
README.md                            # NEW "Styles" section (contract §5)
```

**Structure Decision**: The existing single Vite project and feature 002's atomic levels
are kept. Each stylesheet keeps its place next to its component; only the extension and
the content change, and the one shared partial joins the existing `src/styles/`.

## Implementation Order

The order matters for proof:

1. Record the baseline (quickstart §1).
2. Add the dependencies and `styleRules.test.ts`. The test fails at first: the 19 `.css`
   files exist and FileButton's `composes` is present.
3. Remove the cross-file `composes` from FileButton while it is still CSS, and confirm
   the visual check passes.
4. Convert the global stylesheets, then each level from atoms up, running the visual
   check after each level.
5. Add the shared partial, and introduce each mixin once all of its users are converted.
6. Update the README, run the compiled-CSS review, and record the measurements.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `sass` dev dependency | The request asks for SCSS. FR-005 (named breakpoint) and FR-006 (named declaration groups) need build-time variables and mixins | Native CSS nesting covers FR-003 only: `var()` is not allowed in media queries, `@custom-media` has no browser support, and plain CSS has no mixins (R2) |
| `stylelint` + `postcss-scss` dev dependencies | FR-004 and FR-010 require the quality checks to fail on nesting deeper than three levels and name the file | A hand-written depth counter would be an SCSS parser to maintain (comments, strings, interpolation). `stylelint-config-standard-scss` would add about 100 unrelated style rules; only `max-nesting-depth` is enabled (R5) |
