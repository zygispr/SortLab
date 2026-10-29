# Research: Atomic Design Component Structure

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-28

The Technical Context had no open unknowns: the stack is fixed by feature 001. These are
the design decisions the restructuring needs, each checked against the current code.

## 1. How levels appear in the codebase (FR-001, FR-002)

**Decision**: One folder per level under `src/components/`: `atoms/`, `molecules/`,
`organisms/`, `templates/`, `pages/`. Each component is one `.tsx` file named after the
component, with its CSS module beside it when it has styles. No `index.ts` barrel files;
imports name the file directly. Nothing else sits directly in `src/components/`.

**Rationale**: The folder is the level, so a component's level is visible from its path
(FR-002) and lint rules can match on it (§3). Direct imports keep "go to definition" one
hop and avoid a second place to keep in sync (Principle II).

**Alternatives considered**: a level prefix in file names (`AtomButton.tsx`) is noisier
and can't be matched as cleanly; barrel files add indirection and a maintenance list.

## 2. Classification of today's components (FR-003, FR-004)

**Decision**: Classify by composition and by whether the component touches shared state;
anything that reads or changes the store is an organism (or the page). The resulting
inventory is in [data-model.md](./data-model.md). Summary:

- **Atoms (new, extracted)**: `Button`, `Slider`, `TextArea`, `MutedText`.
- **Molecules**: `RangeField` (exists), `Legend` (moved; it is static), `FileButton` (new).
- **Organisms**: the 13 store-connected components that exist today, unchanged in role.
- **Templates**: `PageLayout` and `Region`, extracted from `App.tsx`.
- **Pages**: `SortLabPage`, today's `App` minus its layout markup.

**Rationale**: The ten `<button>` elements (in five components) become `Button`, and the
upload label styled as a button becomes `FileButton`, so six components stop styling
buttons themselves (FR-007). `FileButton` is a molecule, not an atom, because it reuses
the `Button` atom's stylesheet and atoms import no other component (FR-003). Muted helper text appears
four times (`PlaybackBar`, `SoundControls`, `RunSummary`, `DataPanel`), so it becomes the
`MutedText` atom (FR-010). The slider and text area inputs become atoms. The label row
appears twice (`RangeField` and `PasteInput`), under the three-occurrence threshold, and
a shared `Field` molecule would have to be imported by the `RangeField` molecule, which
FR-003 does not allow (molecules import only atoms). So `RangeField` is built from the
`Slider` atom and keeps its label row, and `PasteInput` keeps its own label row
unchanged, which also keeps its markup identical (FR-011).

**Not extracted**: the three error/notice messages look different on purpose (an inline
data error with a ⚠ icon, a prepare error row with a Retry button, an info box for the
auto-switched algorithm), so they are not one pattern, and unifying them would change the
look (FR-011). The label/value list in `Counters` and `AlgorithmInfo` appears twice, under
the three-occurrence threshold.

## 3. Enforcing the dependency rules (FR-004, FR-005, FR-015)

**Decision**: ESLint's built-in `no-restricted-imports` with `regex` patterns, one config
block per level (holding that level's state patterns too, because flat config replaces a
rule's options when two blocks match the same file), kept in a separate module `eslint.boundaries.js` that `eslint.config.js`
spreads in. Each pattern's `message` names the broken rule. Exact rules and messages are
in [contracts/component-levels.md](./contracts/component-levels.md).

**Rationale**: A spike against ESLint 10.13 confirmed the regexes catch higher-level
imports at any relative depth (`../molecules/X`, `../../components/organisms/X`), the
store (`../../store/appStore`), and `zustand`, while allowing `util/` imports. A second
spike (2026-10-29) confirmed the atom and molecule rules: `^\./(?!.*\.module\.css$)`
blocks sibling components (`./Slider`) but allows a component's own CSS module, molecules
may import `../atoms/Button` and `../atoms/Button.module.css`, and two separate blocks for
the same folder leave only the second block's patterns active. The state rule also blocks `src/hooks/`, whose hooks read the store. It runs inside the existing `npm run lint` gate and adds no dependency
(Principle II).

**Alternatives considered**: `eslint-plugin-boundaries` and `dependency-cruiser` are
purpose-built but add a dependency for five rules the built-in rule already expresses; a
custom import-scanning test duplicates what lint does and wouldn't show in editors.

## 4. Proving the rules catch violations (SC-003)

**Decision**: `tests/unit/boundaries.test.ts` (Vitest, default jsdom environment, since the shared
`tests/setup.ts` needs browser globals) loads
`eslint.boundaries.js` into ESLint's Node API and lints one deliberate violation per rule
with `lintText` and a fake file path in each level, asserting the named message; it also
lints a valid import per level and asserts no message. A second check in the same file
lists `src/components/` and asserts it contains exactly the five level folders (SC-001).

**Rationale**: Loading only the boundary config needs no type information, so the test is
fast and runs in the normal `npm test` gate. It fails if someone weakens a rule.

## 5. Permanent visual check (FR-013, SC-002)

**Decision**: Playwright's `toHaveScreenshot` in a new `tests/e2e/visual.spec.ts`, run in
the `chromium` project only (skipped in the others), four full-page images: 360×740 and
1440×900, each in light and dark color schemes. `maxDiffPixels: 0`, animations disabled,
caret hidden. The page is put in a fixed state first: fresh browser context (so the sound
prompt shows and settings are defaults), then a fixed list of 30 numbers is pasted and
loaded so the bars do not depend on the random dataset, then focus is cleared.
Four more images capture only the Data panel at 1440×900 in both schemes: once with an
invalid paste (error border and message) and once with keyboard focus on Upload file
(focus outline on its label). Those are the two state selectors whose rules move between
CSS modules, and the full-page images never show them.

Reference images are stored beside the test in `tests/e2e/visual.spec.ts-snapshots/`,
named by Playwright with the project and platform, so there is one set for macOS (local
runs) and one for Linux (CI). Both sets are captured **before any component moves**, from
the current code.

- macOS set: `npx playwright test visual --project=chromium --update-snapshots` locally.
- Linux set: a GitHub Actions workflow, `.github/workflows/visual-baselines.yml`, runs
  the same command and uploads the images as an artifact, which is downloaded with
  `gh run download` and committed. It triggers on `workflow_dispatch` and on pushes that
  change the workflow file itself or `tests/e2e/visual.spec.ts`, because GitHub only lets a manual-only workflow be
  started once it exists on the default branch; the push trigger captures the images on
  the feature branch before any component moves.

**Rationale**: Playwright is already the e2e tool, so this adds no dependency. Fonts and
anti-aliasing differ between operating systems, so pixel-exact comparison only works
against images from the same platform, which the spec's clarification already requires.
Docker is not installed on the development Mac, so Linux images cannot be produced
locally; the manual workflow is the smallest way to get them from the real CI platform.
Pasting fixed numbers uses only the public UI, so no test hook is added to the app.

**Alternatives considered**: a tolerance (`maxDiffPixelRatio`) would hide small real
regressions, and the clarification asks for pixel-for-pixel; Linux-only references would
make the check unusable locally; running every browser project would quadruple images and
platform differences without testing anything new about component structure.

## 6. Page and entry point (FR-003 Pages)

**Decision**: `src/App.tsx` becomes `src/components/pages/SortLabPage.tsx`. It keeps the
page-wide effects (keyboard shortcuts, pausing when hidden, reduced motion) and fills
`PageLayout` with organisms through named slots. `src/main.tsx` renders `SortLabPage`.
`src/App.module.css` moves into `templates/PageLayout.module.css` and `Region.module.css`.
`tests/integration/App.test.tsx` becomes `SortLabPage.test.tsx` with the same assertions.

**Rationale**: The page owns behavior and content, the template owns arrangement
(clarification Q2), and no file is left behind only to re-export.

## 7. Shared non-component code

**Decision**: `src/components/format.ts` moves to `src/util/format.ts` beside
`clamp.ts`. `src/components/controls.module.css` is split: button styles into
`atoms/Button.module.css` (also composed by the `FileButton` molecule), slider and field
styles into `atoms/Slider.module.css` and `molecules/RangeField.module.css`, muted text into
`atoms/MutedText.module.css`; the file is then deleted. Global utilities such as
`.visually-hidden` stay in `src/styles/global.css`. `src/hooks/` is unchanged.

**Rationale**: Utilities are not components, so they live outside the levels (spec edge
cases). Splitting `controls.module.css` puts each style with the one component that owns
it, so only the button atom styles buttons (FR-007, SC-004).

## 8. Keeping the look identical

**Decision**: Atoms render the same elements with the same class rules and the same
order as today; CSS rules move between files without changing their declarations. Where
a parent today adds a layout class to a control (for example `styles.volume` on the
Volume field), the atom or molecule accepts an optional `className` that it appends.

**Rationale**: CSS modules hash class names, but the rendered styles depend only on the
declarations and DOM structure, so moving rules unchanged keeps pixels identical; the
visual check (§5) proves it.

## 9. Tests for atoms and molecules (FR-016)

**Decision**: One test file per atom and molecule under `tests/integration/atoms/` and
`tests/integration/molecules/`, rendering each with props only (no store), covering its
inputs, the outputs it reports (clicks, changes, files), disabled state, and accessible
name and value text.

**Rationale**: Atoms and molecules take everything as props (FR-004), so they can be
tested without the store, which is also a cheap check that they really are store-free.

## 10. Performance (FR-014, SC-006)

**Decision**: Record the gzipped JS and CSS size of `npm run build` before and after
(must not grow more than 2%), and rerun the feature 001 frame-rate and Lighthouse checks
from `specs/001-sorting-visualizer/quickstart.md` after the restructure.

**Rationale**: Splitting components into more files can add a few bytes of module
wrappers; the bundler inlines them, so no change beyond noise is expected, but the budget
is measured rather than assumed (Principle V).
