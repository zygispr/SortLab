---

description: "Task list for SCSS Styling"
---

# Tasks: SCSS Styling

**Input**: Design documents from `/specs/003-scss-styling/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/style-rules.md, quickstart.md

**Tests**: Required. SC-008 asks for proof that each check fails and passes, and
FR-014/SC-002 make feature 002's visual check the guard against visible change.
Constitution Principle III requires tests written before the code they verify. Within
each phase, write the test tasks first and confirm they fail for the stated reason.

**Organization**: Tasks are grouped by user story so each story can be implemented and
tested on its own. The guards that protect the conversion (the Stylelint depth rule, the
cross-file `composes` check, and removing FileButton's `composes`) are in the
Foundational phase. US3's own phase covers documentation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1–US3)
- Every task names the exact file(s) it touches

## Path Conventions

The project is a single Vite project at the repository root. Paths that start with a
level name (`atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/`) are relative to
`src/components/`. Every other path is from the repository root.

## Shared rules (apply to every task)

- **No visible change** (FR-013). Selectors, values, and `!important` stay exactly as they
  are. Nesting may only produce the selectors that already exist, so
  `.table { th, td { &:first-child {…} } }` must compile to
  `.table th:first-child, .table td:first-child`. Never turn two separate classes into a
  compound one: Legend's `.swatch` and `.unsorted` stay separate top-level rules. The
  only allowed compiled differences are those in
  [research R8](./research.md#r8-proving-no-visible-change).
- **Renames use `git mv`** (`git mv X.module.css X.module.scss`), so history follows the
  file. Then update every import of it in the same task (the importer list is in each
  task).
- **Existing tests change only in stylesheet file names** (FR-015). Never edit an
  assertion to make a converted file pass, and never touch
  `tests/e2e/visual.spec.ts-snapshots/` (FR-014).
- **Comments**: keep every existing comment, converting `/* … */` to `//` when it sits on
  its own lines. Doc comments on shared items use `///`.
- **Shared items** are used through `@use '<relative>/styles/shared';` with the `shared.`
  namespace. Never use `as *`, `@import`, or `additionalData`
  ([contract §2](./contracts/style-rules.md#2-authoring-rules)).
- **Nesting depth** is at most 3 levels: a top-level rule plus two nested levels, with a
  nested `@media` counting as a level (FR-004).
- **Formatting**: run `npx prettier --write <files>` on every file you create or change.
- **After each phase**, run `npm run lint`, `npm run format:check`, `npm run typecheck`,
  `npm test`, and
  `npx playwright test --project=chromium --project=webkit --project=phone`.
  `visual.spec.ts` must report 0 differing pixels. The one expected failure is
  `no plain stylesheets` (T009), which fails until US1 is complete.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch, measure the starting point on unchanged code, and add the tools

- [X] T001 Create the feature branch from an up-to-date `main` with `git switch main && git pull && git switch -c 003-scss-styling`, and confirm `git status` is clean
- [X] T002 Record the baseline before any file changes (quickstart §1):
  - Run `npm ci && npm run build`.
  - Replace the placeholder in the "Measured results" section of `specs/003-scss-styling/quickstart.md` with a "Before" table. It needs the commit (`git rev-parse --short HEAD`), the raw bytes (`wc -c`) and gzip bytes (`gzip -9 -c <file> | wc -c`) of each `dist/assets/*.js` and `dist/assets/index-*.css`, and the total gzip of JS + CSS.
  - Save the normalized CSS with `npx prettier --parser css < dist/assets/index-*.css | sed -E 's/\._([A-Za-z]+)_[a-z0-9]{5}_[0-9]+/.\1/g' > "$TMPDIR/sortlab-css-before.css"`.
  - Open the saved file and confirm the class names read `.button`, `.primary`, and so on, with no hashes left.
- [X] T003 Add the dev dependencies with `npm install --save-dev sass@1.105.2 stylelint@17.16.0 postcss-scss@4.0.9` (research R1, R5). Confirm `package.json` lists `"sass": "^1.105.2"`, `"stylelint": "^17.16.0"`, and `"postcss-scss": "^4.0.9"` under `devDependencies`, and that `package-lock.json` resolves exactly those three versions. Then run `npm run build` and confirm it still succeeds with no `.scss` file present
- [X] T004 Create `stylelint.config.js` at the repo root exactly as in [contract §3](./contracts/style-rules.md#3-quality-checks): `export default { customSyntax: 'postcss-scss', rules: { 'max-nesting-depth': 2 } };`.
  - Add a header comment: "Nesting limit for SCSS (feature 003, FR-004): a top-level rule plus two nested levels. Only this rule is enabled; see specs/003-scss-styling/research.md R5."
  - In `package.json`, change the `lint` script to `eslint . --max-warnings 0 && stylelint "src/**/*.scss" --max-warnings 0 --allow-empty-input`. The `--allow-empty-input` flag lets lint pass while no `.scss` exists yet.
  - Run `npm run lint` and confirm it passes (depends on T003).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The guards. Before any stylesheet is renamed, the depth rule is proven, the
cross-file `composes` that Sass would break (research R3) is gone, and a test keeps it
out.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests ⚠️ write first, confirm they fail

- [X] T005 [P] Add a test to `tests/integration/atoms/Button.test.tsx`, without changing the existing tests, in a new `describe('buttonClass')`:
  - It imports `{ Button, buttonClass }` from `../../../src/components/atoms/Button`.
  - It renders `<Button>Default</Button>`, `<Button variant="primary">Primary</Button>`, and `<Button variant="quiet">Quiet</Button>`.
  - It expects `buttonClass()` to equal the Default button's `className`, `buttonClass('secondary')` to equal it too, `buttonClass('primary')` to equal the Primary button's `className`, and `buttonClass('quiet')` to equal the Quiet button's `className`.
  - It fails today because `buttonClass` is not exported.
- [X] T006 [P] Create `tests/unit/styleRules.test.ts`, which runs in the **default jsdom environment** with no `@vitest-environment` comment. `tests/setup.ts` cannot load under `node`; Stylelint's Node API was verified to work under jsdom. Start the file with a doc comment: "Style authoring rules (feature 003, FR-004, FR-010, SC-008, research R3): see specs/003-scss-styling/contracts/style-rules.md §3." Add two `describe` blocks:
  - **`describe('nesting depth')`** imports `stylelint` from `'stylelint'` and lints in-memory samples with `stylelint.lint({ code, codeFilename: 'src/components/atoms/Sample.module.scss', configFile: 'stylelint.config.js' })`. It checks the real config.
    - A 4-level sample `.a {\n  .b {\n    .c {\n      .d {\n        color: red;\n      }\n    }\n  }\n}\n` gives exactly one warning, with `rule === 'max-nesting-depth'` and `line === 4`.
    - A 3-level sample `.table {\n  th,\n  td {\n    &:first-child {\n      padding-left: 0;\n    }\n  }\n}\n` gives no warnings.
    - A sample with a nested media query `// note\n.main {\n  @media (min-width: 1024px) {\n    &:focus {\n      color: red;\n    }\n  }\n}\n` gives no warnings.
    - A sample whose fourth level is a media query, `.a {\n  th {\n    @media (min-width: 1px) {\n      &:hover {\n        color: red;\n      }\n    }\n  }\n}\n`, gives exactly one `max-nesting-depth` warning. A nested `@media` counts as a level (FR-004).
  - **`describe('no cross-file composes')`** collects `import.meta.glob<string>('/src/**/*.{css,scss}', { query: '?raw', import: 'default', eager: true })`. It takes the files whose source matches `/composes:[^;]*\bfrom\b/` and expects that list to be empty, with the message `composes from another file ships uncompiled SCSS (feature 003, research R3); reuse the component or a class helper it exports (e.g. buttonClass()) instead:`. The glob includes `.css` so the check guards the conversion before any file is renamed.
  - Run `npm test`. `nesting depth` passes (it proves the T004 config), and `no cross-file composes` fails naming `/src/components/molecules/FileButton.module.css`.

### Implementation

- [X] T007 Remove the cross-file `composes` (research R3), making T005 and T006 pass:
  - **`atoms/Button.tsx`**: export `buttonClass(variant: ButtonVariant = 'secondary'): string`, which returns `VARIANT_CLASS[variant]`. Extract `type ButtonVariant = 'primary' | 'secondary' | 'quiet'` and use it in `ButtonProps['variant']`. Make `Button` call `buttonClass(variant)` instead of indexing `VARIANT_CLASS`. Give `buttonClass` TSDoc: "The class that gives an element the look of the given button variant, for an element that must not be a `<button>` (the file picker's label). The Button atom stays the one place buttons are styled."
  - **`molecules/FileButton.tsx`**: import `{ buttonClass }` from `'../atoms/Button'` and change the label to `className={buttonClass()}`. Add a short comment: "The secondary button look comes from the Button atom, the one place buttons are styled."
  - **`molecules/FileButton.module.css`**: delete the `.label` rule and its comment.
  - Run `npm run lint`, `npm test`, and `npx playwright test tests/e2e/visual.spec.ts --project=chromium`. Expect 0 differing pixels, including `upload-focus-*`.
  - Confirm that feature 002's `applies button classes only in the Button atom` test still passes unchanged.
  - Depends on T005, T006.

**Checkpoint**: The depth rule is proven, no cross-file `composes` remains, and the screen
is pixel-identical. Stylesheet conversion can begin.

---

## Phase 3: User Story 1 - Read a component's styles as one block (Priority: P1) 🎯 MVP

**Goal**: All 19 stylesheets are SCSS. Each element's states, `@media` changes, and
directly related children are nested under it, and the app looks exactly as before.

**Independent Test**:

- `find src -name '*.css'` prints nothing.
- `no plain stylesheets` passes.
- The full suite passes, with test changes limited to file names.
- `visual.spec.ts` reports 0 differing pixels.
- The compiled-CSS diff shows only the allowed differences (quickstart → Story 1, §3).

### Tests for User Story 1 ⚠️ write first, confirm they fail

- [ ] T008 [US1] Add `describe('no plain stylesheets')` to `tests/unit/styleRules.test.ts` (after T006 in the same file):
  - It collects `Object.keys(import.meta.glob('/src/**/*.css'))` and expects the list to equal `[]`, with the message `Plain stylesheets are not allowed (feature 003, FR-001); rename to .scss:`.
  - Run it and confirm it fails listing the 19 `.css` files.

### Implementation for User Story 1

- [ ] T009 [US1] Convert the global stylesheets (data-model inventory #1–2):
  - `git mv src/styles/tokens.css src/styles/tokens.scss` and `git mv src/styles/global.css src/styles/global.scss`.
  - In `src/main.tsx`, change the two imports to `'./styles/tokens.scss'` and `'./styles/global.scss'`, keeping their order.
  - **`tokens.scss`**: move the `@media (prefers-color-scheme: dark) { :root { … } }` block inside the `:root` rule, after its last declaration, as `@media (prefers-color-scheme: dark) { … }`, with the same custom properties and values (FR-007).
  - **`global.scss`**: move the `@media (prefers-reduced-motion: reduce)` block inside the `*, *::before, *::after` rule as `@media (prefers-reduced-motion: reduce) { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }`.
  - Keep `button:disabled, …, option:disabled` as its own top-level rule. Its selector list differs from the `button, input, select, textarea` rule (it adds `option`), so nesting would change it.
  - Leave the other rules as they are.
- [ ] T010 [P] [US1] Convert the atoms (inventory #4–7):
  - `git mv` `atoms/Button.module.css`, `atoms/MutedText.module.css`, `atoms/Slider.module.css`, and `atoms/TextArea.module.css` to `.module.scss`, and update the import in `atoms/Button.tsx`, `atoms/MutedText.tsx`, `atoms/Slider.tsx`, and `atoms/TextArea.tsx`.
  - **`Button.module.scss`**: nest `.button:hover:not(:disabled)` inside `.button` as `&:hover:not(:disabled)`. Keep `.primary` and `.quiet` with their same-file `composes: button;` after `.button`.
  - **`TextArea.module.scss`**: nest `.textarea[aria-invalid='true']` as `&[aria-invalid='true']`.
  - In the `Button.tsx` TSDoc, change "dimmed by global.css" to "dimmed by global.scss".
- [ ] T011 [P] [US1] Convert the molecules (inventory #8–10):
  - `git mv` `molecules/FileButton.module.css`, `molecules/Legend.module.css`, and `molecules/RangeField.module.css` to `.module.scss`, and update the imports in `molecules/FileButton.tsx`, `molecules/Legend.tsx`, and `molecules/RangeField.tsx`.
  - **`FileButton.module.scss`**: nest `.upload label` as `.upload { label { text-align: center; } }`, and nest `.fileInput:focus-visible + label` as `.fileInput { &:focus-visible + label { … } }`, keeping its comment above it. The `.fileInput` rule has no declarations of its own, so Sass emits only the nested rule; confirm this in the T016 diff.
  - **`Legend.module.scss`**: the content is unchanged. Its swatch modifiers are separate classes, so there is nothing to nest.
- [ ] T012 [P] [US1] Convert the organisms (inventory #11–17):
  - `git mv` `organisms/AlgorithmPanel.module.css`, `organisms/Counters.module.css`, `organisms/DataPanel.module.css`, `organisms/PlaybackBar.module.css`, `organisms/RunSummary.module.css`, `organisms/Sound.module.css`, and `organisms/Visualizer.module.css` to `.module.scss`.
  - Update the imports in `organisms/AlgorithmInfo.tsx`, `organisms/AlgorithmPicker.tsx`, `organisms/Counters.tsx`, `organisms/DataPanel.tsx`, `organisms/PasteInput.tsx`, `organisms/PlaybackBar.tsx`, `organisms/RunSummary.tsx`, `organisms/SoundControls.tsx`, `organisms/SoundPrompt.tsx`, and `organisms/Visualizer.tsx`.
  - Nest the following:
    - `.complexity li` → `.complexity { li { … } }` (AlgorithmPanel)
    - `.counters li` → `.counters { li { … } }` (Counters)
    - `.divider::before, .divider::after` → `.divider { &::before, &::after { … } }` (DataPanel)
    - RunSummary → `.table { th, td { …; &:first-child { … } } th { … } }`, keeping the order: the shared `th, td` declarations, then `:first-child`, then `th`-only. That is 3 levels, at the limit.
  - PlaybackBar, Sound, and Visualizer only get the rename.
- [ ] T013 [P] [US1] Convert the templates and the page (inventory #18–20):
  - `git mv` `templates/PageLayout.module.css`, `templates/Region.module.css`, and `pages/SortLabPage.module.css` to `.module.scss`, and update the imports in `templates/PageLayout.tsx`, `templates/Region.tsx`, and `pages/SortLabPage.tsx`.
  - **`PageLayout.module.scss`**: split the `@media (min-width: 1024px)` block. Move its `.main` part into the `.main` rule as `@media (min-width: 1024px) { grid-template-columns: 20rem minmax(0, 1fr); }`, and its `.summary` part into the `.summary` rule as `@media (min-width: 1024px) { grid-column: 1 / -1; }`. Keep the literal `1024px` for now; T020 names it.
  - Keep the FR-029 comments above the rules they explain.
- [ ] T014 [US1] Point the boundary rule at SCSS modules (FR-011):
  - In `eslint.boundaries.js`, change `SIBLING` to `'^\\./(?!.*\\.module\\.scss$)'` and its doc comment to "the component's own CSS module (`.module.scss`)".
  - In `tests/unit/boundaries.test.ts`, change the three allowed paths to `'./Button.module.scss'`, `'../atoms/Button.module.scss'`, and `'./RangeField.module.scss'`. This is a file-name change only (FR-015).
  - Run `npm run lint` and confirm zero errors. Before this task, the atom and molecule imports of `./X.module.scss` are reported as sibling imports.
  - Depends on T010, T011.
- [ ] T015 [US1] Update the remaining `.css` mentions in code comments: `src/render/barRenderer.ts:74` ("from tokens.css" → "from tokens.scss"). Then `grep -rnE "\.css\b" src tests eslint.boundaries.js eslint.config.js` must find nothing (`.scss` does not match, since its dot is followed by `s`)
- [ ] T016 [US1] Validate Story 1 (quickstart → Story 1 and §3):
  - Run every gate from the shared rules. `no plain stylesheets` now passes, and `visual.spec.ts` reports 0 differing pixels.
  - Build, save `"$TMPDIR/sortlab-css-after.css"` with the T002 command, and run `diff -u` against the "before" file. If `"$TMPDIR/sortlab-css-before.css"` is gone, rebuild it from T002's recorded commit using quickstart §1 → "If the 'before' file is gone". Never rebuild it from the current branch.
  - Confirm every difference is in this list: dropped comments, the empty `.label` rule gone (T007), PageLayout's `@media` split after `.main` and after `.summary`, and the reduced-motion block moved next to the box-sizing rule. Fix any other difference in the source.
  - Open `atoms/Button.module.scss`, `templates/PageLayout.module.scss`, and `organisms/RunSummary.module.scss` and confirm each element's rules sit in one block (SC-004).

**Checkpoint**: User Story 1 is complete and shippable on its own: every stylesheet is
SCSS, nested by element, and nothing looks different.

---

## Phase 4: User Story 2 - Name shared values and patterns once (Priority: P2)

**Goal**: The breakpoint and the three-plus repeated declaration groups are defined once
in `src/styles/_shared.scss` and used by name everywhere.

**Independent Test**:

- `shared patterns are written out once` passes.
- `grep -rn "1024px" src` finds only `_shared.scss`.
- There are 12 `@include shared.` lines.
- The compiled-CSS diff is unchanged from Story 1, apart from Region's declaration order
  (quickstart → Story 2).

### Tests for User Story 2 ⚠️ write first, confirm they fail

- [ ] T017 [US2] Add `describe('shared patterns are written out once')` to `tests/unit/styleRules.test.ts` (after T008). It reuses an `import.meta.glob<string>('/src/**/*.scss', { query: '?raw', import: 'default', eager: true })` map.
  - For each signature below, it expects the files containing it to equal `['/src/styles/_shared.scss']`, with the message `Use the shared item instead of repeating it (feature 003, FR-005, FR-006):`.
  - The signatures:
    - `/1024px/` (`$wide`)
    - `/border: 1px solid var\(--color-border\)/` (`bordered-surface`)
    - `/list-style: none/` (`bare-list`)
    - `/flex-wrap: wrap;\s*align-items: center;/` (`wrap-row`)
    - `/outline: var\(--focus-width\) solid var\(--color-focus\)/` (`focus-ring`)
  - Confirm it fails, because `_shared.scss` does not exist and each signature is in 2–4 component files.

### Implementation for User Story 2

- [ ] T018 [US2] Create `src/styles/_shared.scss` exactly per [contract §1](./contracts/style-rules.md#1-shared-partial-srcstyles_sharedscss):
  - It starts with a `//` header: "Build-time values and patterns shared by the stylesheets (feature 003). Emits no CSS on its own; load it with `@use '…/styles/shared';` and use the `shared.` names. Runtime values (colors, spacing, fonts) are custom properties in tokens.scss, not here."
  - It defines `$wide: 1024px;`, `@mixin bordered-surface`, `@mixin bare-list`, `@mixin wrap-row($display: flex)`, and `@mixin focus-ring`.
  - Each mixin emits exactly the declarations in the contract table, in that order. Each item has a one-line `///` comment saying what it is for and where it is used.
- [ ] T019 [P] [US2] Use the shared items in the atoms and molecules. Add `@use '../../styles/shared';` as the first line of each file, and put each `@include` where the first declaration it replaces was:
  - **`atoms/Button.module.scss`**: `@include shared.bordered-surface;` replaces `border`, `border-radius`, and `background` in `.button`.
  - **`atoms/TextArea.module.scss`**: the same in `.textarea`.
  - **`molecules/Legend.module.scss`**: `@include shared.bare-list;` replaces `margin: 0; padding: 0; list-style: none;` in `.legend`.
  - **`molecules/FileButton.module.scss`**: `@include shared.focus-ring;` replaces the `outline` and `outline-offset` declarations in `&:focus-visible + label`.
  - Depends on T018.
- [ ] T020 [P] [US2] Use the shared items in the organisms, templates, and global rules (depends on T018):
  - **`organisms/AlgorithmPanel.module.scss`**: `@use '../../styles/shared';`. In `.select`, `bordered-surface` replaces `border`, `border-radius`, and `background`. In `.complexity`, `bare-list` replaces `margin`, `padding`, and `list-style`.
  - **`organisms/Counters.module.scss`**: `@use '../../styles/shared';`. In `.counters`, `bare-list` replaces the same three.
  - **`organisms/PlaybackBar.module.scss`**: `@use '../../styles/shared';`. In both `.buttons` and `.error`, `@include shared.wrap-row;` replaces `display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2);`.
  - **`organisms/Sound.module.scss`**: `@use '../../styles/shared';`. In `.prompt`, `@include shared.wrap-row(inline-flex);` replaces its four declarations.
  - **`templates/PageLayout.module.scss`**: `@use '../../styles/shared';`. Both media queries become `@media (min-width: shared.$wide)`.
  - **`templates/Region.module.scss`**: `@use '../../styles/shared';`. In `.panel`, `bordered-surface` replaces `background`, `border`, and `border-radius`; put the include where `background` was. These properties do not overlap, so the order change is allowed (R8).
  - **`src/styles/global.scss`**: `@use 'shared';` (a sibling partial). In `:focus-visible`, `@include shared.focus-ring;` replaces `outline` and `outline-offset`.
- [ ] T021 [US2] Validate Story 2 (quickstart → Story 2):
  - `shared patterns are written out once` passes, and `grep -rn "1024px" src` finds only `src/styles/_shared.scss`.
  - `grep -rn "@include shared\." src | wc -l` prints 12.
  - Rebuild and re-run the T016 diff: the only new difference is the reordered declarations in `.panel` (Region).
  - `visual.spec.ts` reports 0 differing pixels, and every gate passes.
  - Depends on T019, T020.

**Checkpoint**: User Stories 1 and 2 both hold. Each shared value or pattern is defined
once and named where it is used.

---

## Phase 5: User Story 3 - Keep the styling readable and consistent (Priority: P3)

**Goal**: The checks reject plain stylesheets, over-deep nesting, cross-file `composes`,
and unformatted SCSS, each with a message naming the file. The README tells contributors
how styles are organized. The depth rule and `composes` check were built in Phase 2
(T004, T006); this phase documents and proves them on real files.

**Independent Test**:

- The `styleRules.test.ts` cases pass.
- The four manual violations in quickstart → Story 3 each fail and name the file.
- A reader finds the "Styles" section in the README.

### Implementation for User Story 3

- [ ] T022 [US3] Document the styles in `README.md` ([contract §5](./contracts/style-rules.md#5-readme-section)):
  - Add a "## Styles" section after "## Component structure". It covers:
    - the files: one `.module.scss` per component, plus `tokens.scss`, `global.scss`, and `_shared.scss` in `src/styles/`
    - a table of the shared items (name, purpose, usage)
    - the authoring rules 2–7 from contract §2, in short form
    - which values must stay runtime tokens and why (theme switching, and `src/render/barRenderer.ts` reading them)
    - the 3-level nesting limit, checked by `npm run lint`
  - In "Component structure", change "its CSS module" to "its CSS module (`.module.scss`)".
  - In "Quality gates", change the `npm run lint` comment to `# ESLint + Stylelint, zero errors`.
- [ ] T023 [US3] Prove the checks on real files (quickstart → Story 3, SC-008). Do each of these and then undo it:
  1. Create `src/components/atoms/Stray.css` containing `.x {}`. `npm test` fails `no plain stylesheets`, naming it.
  2. Nest `span { color: red; }` inside the `&:first-child` block of `organisms/RunSummary.module.scss`. `npm run lint` reports one `max-nesting-depth` error with the file and line.
  3. Add `.x { composes: button from '../atoms/Button.module.scss'; }` to `molecules/FileButton.module.scss`. `npm test` fails `no cross-file composes`, naming it.
  4. Indent one line of any `.scss` file by two extra spaces. `npm run format:check` names the file, and `npm run format` fixes it.

  Confirm that `git status` is clean of these changes afterwards, and record the four results in the "Measured results" section of `specs/003-scss-styling/quickstart.md`.

**Checkpoint**: All three user stories hold. The styling conventions are documented and
enforced by the standard lint and test gates.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance proof, final gates, and walkthrough

- [ ] T024 [P] Record the "After" sizes in `specs/003-scss-styling/quickstart.md` → Measured results, using the same method as T002 (raw and gzip bytes per `dist/assets` file, plus the JS + CSS gzip total).
  - Confirm the CSS chunk grew ≤ 5% (FR-016, SC-007).
  - Confirm `steps.worker-*.js` is byte-identical.
  - Confirm the main JS chunk differs only by hashed class-name strings.
  - Add the final T021 diff summary.
- [ ] T025 [P] Re-run the performance checks from feature 001's quickstart (frame-rate and Pause-response rows, at 1× and 4× CPU) and the Lighthouse mobile preset against `npm run preview`.
  - Record them as a table in `specs/003-scss-styling/quickstart.md` → Measured results, in the same format as feature 002's.
  - Targets: no frames > 50 ms, response < 100 ms, interactive < 2 s.
- [ ] T026 Remove leftovers:
  - `find src -name '*.css'` prints nothing, and `grep -rn "module\.css" src tests README.md eslint.boundaries.js` finds nothing.
  - Every class in each `.module.scss` is still used by its component.
  - Every shared item in `_shared.scss` is used at least once.
  - No `@import`, `as *`, or cross-file `composes` remains.
  - `stylelint.config.js` and `package.json` contain nothing beyond T003–T004.
- [ ] T027 Run every quality gate: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, and `npx playwright test --project=chromium --project=webkit --project=phone`.
  - Confirm `git status tests/e2e/visual.spec.ts-snapshots` is clean.
  - Push, and confirm the `CI` workflow passes on Linux, including Firefox and `visual.spec.ts` against the unchanged Linux references.
  - Fix every failure.
- [ ] T028 Walk through `specs/003-scss-styling/quickstart.md` and feature 001's quickstart → Validation scenarios (Stories 1–4) against `npm run preview`.
  - Confirm SC-006: for three elements a reviewer picks at random (for example the Pause button, the wide-screen summary row, and the first Run summary column), every rule that affects each one is found in one block of its component's stylesheet within 30 seconds.
  - Record the walkthrough table in quickstart → Measured results.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002 → T003 → T004. The baseline is measured on unchanged code before the dependencies are installed.
- **Foundational (Phase 2)**: T005 and T006 together, then T007. This phase blocks every user story: no stylesheet is renamed until the cross-file `composes` is gone and the depth rule is proven.
- **US1 (Phase 3)**: depends on Foundational.
- **US2 (Phase 4)**: depends on US1, because the mixins go into converted `.scss` files.
- **US3 (Phase 5)**: T022 can start once US1 is done. T023's step 2 needs US1's nested `RunSummary.module.scss`. Both are independent of US2, but the README's shared-items table (T022) must match T018, so finish US2 first or update the table after it.
- **Polish (Phase 6)**: depends on every story you intend to ship.

### User Story Dependencies

```text
Setup → Foundational (depth rule, composes removed) → US1 (MVP: all SCSS, nested) ─┬─→ US2 (shared partial)
                                                                                    └─→ US3 (docs + proof)
                                                                                             └─→ Polish
```

### Within Each Phase

- Test tasks come first; confirm they fail for the stated reason.
- Globals (T009) and the four level groups (T010–T013) come before the boundary-rule switch (T014). Until T014, lint reports the converted atoms' and molecules' own `.module.scss` imports, so run lint only after T014.
- The partial (T018) comes before its users (T019, T020).
- Tasks that edit the same file run in ID order:
  - `tests/unit/styleRules.test.ts`: T006 → T008 → T017
  - `molecules/FileButton.module.*`: T007 → T011 → T019
  - `atoms/Button.tsx`: T007 → T010
  - `src/styles/global.scss`: T009 → T020
  - `templates/PageLayout.module.scss`: T013 → T020
  - `specs/003-scss-styling/quickstart.md`: T002 → T023 → T024 / T025 → T028

### Parallel Opportunities

- Foundational: T005 and T006 together.
- US1: T010, T011, T012, and T013 together (after T009, or alongside it, since they touch different files).
- US2: T019 and T020 together, after T018.
- US3's T022 can be written alongside US2 and checked against T018 at the end.
- Polish: T024 and T025 together.

---

## Parallel Example: User Story 1

```bash
# After T008 (failing test) and T009 (globals), convert the four level groups at once:
Task: "T010 Convert atoms/*.module.css to .module.scss, nest Button hover and TextArea aria-invalid"
Task: "T011 Convert molecules/*.module.css to .module.scss, nest FileButton label and focus rules"
Task: "T012 Convert organisms/*.module.css to .module.scss, nest complexity li, counters li, divider pseudo-elements, table cells"
Task: "T013 Convert templates/ and pages/ modules to .module.scss, split PageLayout's media query into .main and .summary"
# Then T014 (boundary regex) → T015 (comments) → T016 (validate)
```

## Parallel Example: User Story 2

```bash
# After T017 (failing test) and T018 (_shared.scss):
Task: "T019 Use bordered-surface, bare-list, focus-ring in atoms/ and molecules/"
Task: "T020 Use the shared items in organisms/, templates/, and global.scss"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational): baseline recorded, tools in, `composes` removed.
2. Complete Phase 3 (US1): every stylesheet is SCSS and nested by element.
3. **Stop and validate** (T016): pixels identical, compiled-CSS diff limited to the allowed differences.
4. This is mergeable on its own: the readability gain the request asks for, with no visible change.

### Incremental Delivery

1. Setup + Foundational → guards in place, screen unchanged.
2. US1 → all SCSS (MVP).
3. US2 → shared breakpoint and mixins; the duplication is gone.
4. US3 → README section and proven checks.
5. Polish → sizes, performance, CI, walkthrough.

Each step leaves `main` working if merged: every phase ends with the full gate set
passing. The one exception is `no plain stylesheets`, which fails only between T008 and
T016 inside US1, so merge US1 as a whole.
