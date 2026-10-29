---

description: "Task list for the Atomic Design Component Structure"
---

# Tasks: Atomic Design Component Structure

**Input**: Design documents from `/specs/002-atomic-design-components/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/component-levels.md, quickstart.md

**Tests**: Required. The spec asks for a permanent visual check (FR-013), one test per atom
and molecule (FR-016), and proof that each rule catches violations (SC-003); Constitution
Principle III requires tests written before the code they verify. Within each phase,
write the test tasks first and confirm they fail.

**Organization**: Tasks are grouped by user story so each story can be implemented and
tested on its own. US3's lint rules are built in the Foundational phase so they guard the
moves and extractions in US1 and US2; US3's own phase is its validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1–US3)
- Every task names the exact file(s) it touches

## Path Conventions

Single Vite project at the repository root. Component paths below are relative to
`src/components/` only where they start with a level name (`atoms/`, `molecules/`,
`organisms/`, `templates/`, `pages/`); every other path is from the repository root.

## Shared rules (apply to every task)

- **No visible change** (FR-011): move CSS declarations between files unchanged, keep the
  same elements, element order, attributes, text, and accessible names. The visual check
  (T003) must report 0 differing pixels after every phase.
- **Existing tests change only in import paths** (FR-012); never edit an assertion to make
  a moved component pass.
- **Moves use `git mv`** so history follows the file; then fix relative imports
  (`'../store/appStore'` becomes `'../../store/appStore'` one level deeper, and so on),
  including `composes: … from '…'` paths inside CSS modules.
- **Every exported component, prop interface, and helper has TSDoc** stating its inputs,
  outputs, and thrown errors (Constitution Principle I), matching the props in
  [contracts/component-levels.md](./contracts/component-levels.md).
- **Atoms import no other component and molecules import only atoms** (FR-003), including
  another component's CSS module; a component's own CSS module is always allowed.
- **Atoms, molecules, and templates take everything as props** and never import
  `src/store/`, `src/hooks/`, or `zustand` (FR-004, clarification Q2).
- After each phase run `npm run lint`, `npm run typecheck`, `npm test`, and
  `npx playwright test --project=chromium --project=webkit --project=phone`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Measure the starting point and add the CI workflow that captures Linux
reference images, all on the unchanged code

- [X] T001 Record the pre-restructure bundle size: run `npm run build` and add a "Measured results" section to `specs/002-atomic-design-components/quickstart.md` with a "Before" row listing the gzip size of each `dist/assets/*.js` and `*.css` file and their total, plus the commit hash measured (`git rev-parse --short HEAD`)
- [X] T002 [P] Create `.github/workflows/visual-baselines.yml`: `name: Visual baselines`; triggers `workflow_dispatch` and `push` with `paths: ['.github/workflows/visual-baselines.yml']` (a manual-only workflow cannot be started from a branch until it exists on `main`, research §5); one `ubuntu-latest` job with `timeout-minutes: 20`: `actions/checkout@v5`, `actions/setup-node@v5` (`node-version: 24`, `cache: npm`), `npm ci`, `npx playwright install --with-deps chromium`, `npx playwright test tests/e2e/visual.spec.ts --project=chromium --update-snapshots`, then `actions/upload-artifact@v5` with `name: visual-baselines`, `path: tests/e2e/visual.spec.ts-snapshots/`, `retention-days: 7`; add a header comment saying what it is for and when to run it by hand (after an intentional visual change)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The safety nets. Nothing may move until the reference images exist on both
platforms, because they must show the app as it is today (spec FR-013), and the
dependency rules are in the lint gate so every later task is checked against them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Visual references

- [ ] T003 Write `tests/e2e/visual.spec.ts` exactly per [contracts/component-levels.md §6](./contracts/component-levels.md#6-visual-check-fr-013-sc-002): skip unless `testInfo.project.name === 'chromium'`. **Full-page tests**, one per row of the first table (`light-360.png`, `dark-360.png`, `light-1440.png`, `dark-1440.png`): set the viewport (360×740 or 1440×900) and `page.emulateMedia({ colorScheme })` before `page.goto('/')`, wait for the chart's accessible name to match `/step 0 of [1-9]/`, fill "Paste numbers" with the 30 numbers listed in the contract, click "Use these numbers", wait for `/^Bar chart of 30 values.*step 0 of [1-9]/`, clear the text box, blur the active element, then `await expect(page).toHaveScreenshot(name, { fullPage: true, animations: 'disabled', caret: 'hide', maxDiffPixels: 0 })`. **Data panel state tests**, one per row of the second table, at 1440×900 in each color scheme: `data-error-*` pastes `1, two, 3`, clicks "Use these numbers", waits for the text `'two' is not a number`, then moves the mouse to (0, 0); `upload-focus-*` calls `.focus()` on the Generate button, presses `Tab`, and expects the "Upload file" input to be focused; both then `await expect(page.getByRole('region', { name: 'Data' })).toHaveScreenshot(name, { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 })`
- [ ] T004 Capture and check the macOS reference images: `npx playwright test tests/e2e/visual.spec.ts --project=chromium --update-snapshots`, then `npx playwright test tests/e2e/visual.spec.ts --project=chromium --repeat-each=3` must pass 24/24; open each of the 8 images in `tests/e2e/visual.spec.ts-snapshots/` (`*-chromium-darwin.png`) and confirm the full-page ones show 30 bars, the "Turn on sound" prompt, and the correct theme, the `data-error` ones show the red text box border and the ⚠ message, and the `upload-focus` ones show the focus outline around "Upload file" (depends on T003)
- [ ] T005 Commit T001–T004 and push; wait for the `Visual baselines` run that the push starts, download its artifact into `tests/e2e/visual.spec.ts-snapshots/` (`gh run download <run> --name visual-baselines --dir tests/e2e/visual.spec.ts-snapshots`), confirm 8 `*-chromium-linux.png` files, commit and push them, and confirm the `CI` workflow on that commit passes, including `visual.spec.ts` on Linux (the CI run on the previous push is expected to fail only on missing Linux images) (depends on T002, T004)

### Dependency rules (pass trivially on flat code)

- [ ] T006 [P] [US3] Create `tests/unit/boundaries.test.ts` (first line `// @vitest-environment node`) with a `describe('dependency rules')` block that imports `{ boundaries }` from `../../eslint.boundaries.js`, creates `new ESLint({ overrideConfigFile: true, overrideConfig: [{ files: ['**/*.tsx'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } }, ...boundaries] })`, and for each row of [contract §1](./contracts/component-levels.md#1-dependency-rules-fr-003-to-fr-005-fr-015) calls `lintText(code, { filePath })` with a side-effect import (``import '<path>';``) in a fake file in that level (for example `src/components/atoms/Fake.tsx`). Blocked cases, each producing exactly one message that **ends with** the contract's message text (ESLint prefixes it with `'<path>' import is restricted from being used by a pattern.`): one import per blocked level, plus `'./Sibling'` and `'../atoms/Slider'` from atoms, `'./Sibling'` and `'../molecules/Legend'` from molecules, and `'../../store/appStore'`, `'../../hooks/useKeyboardShortcuts'`, and `'zustand'` from atoms, molecules, and templates. Allowed cases, each producing no messages: `'./Button.module.css'` and `'../../util/clamp'` from atoms; `'../atoms/Button'`, `'../atoms/Button.module.css'`, and `'./RangeField.module.css'` from molecules; `'./Sibling'` and `'../molecules/RangeField'` from organisms; `'../molecules/Legend'` from templates; `'../organisms/DataPanel'` from pages
- [ ] T007 [US3] Create `eslint.boundaries.js` at the repo root exporting `boundaries`, an array with **one flat-config object per level** (atoms, molecules, organisms, templates; pages get none), each with `files: ['src/components/<level>/**/*.{ts,tsx}']` and a **single** `'no-restricted-imports': ['error', { patterns: [...] }]` entry; for atoms, molecules, and templates that one `patterns` array holds the level's regexes from contract §1 together with the state regex and `{ group: ['zustand'] }`, each with the contract's exact `message`. Never configure the rule in two objects that match the same file: flat config replaces the earlier object's options, which silently drops its patterns. Add a header comment explaining the rules and pointing to the README section; add `eslint.boundaries.d.ts` declaring `export const boundaries: import('eslint').Linter.Config[];` so the TypeScript test can import it under strict mode (makes T006 pass) (depends on T006)
- [ ] T008 [US3] Spread `...boundaries` into `eslint.config.js` after the existing TypeScript block (`import { boundaries } from './eslint.boundaries.js';`), then run `npm run lint` and confirm zero errors (no file sits in a level folder yet; from here on any error is a real violation to fix in the component, not in the rule) (depends on T007)

**Checkpoint**: 16 reference images committed from unchanged code; CI green on Linux and the
visual check passing locally; the dependency rules run in `npm run lint`. User story work
can begin.

---

## Phase 3: User Story 1 - Find any part of the interface by its level (Priority: P1) 🎯 MVP

**Goal**: Every component lives in exactly one level folder, the page layout is a
state-free template filled by the page, the rules are documented in the README, and the
screen is pixel-identical.

**Independent Test**: `ls src/components` shows only level folders; the folder check in
`tests/unit/boundaries.test.ts` passes; the full existing suite passes with only import
paths changed; `visual.spec.ts` reports 0 differing pixels (quickstart → Story 1).

### Tests for User Story 1 ⚠️ write first, confirm they fail

- [ ] T009 [P] [US1] Add a `describe('component levels')` block to `tests/unit/boundaries.test.ts` that reads `src/components` with `fs.readdirSync(..., { withFileTypes: true })` and asserts: no entry is a file, and every directory name is one of `atoms`, `molecules`, `organisms`, `templates`, `pages` (SC-001); it fails today because 15 components, their 8 CSS modules, `controls.module.css`, and `format.ts` sit in `src/components/`
- [ ] T010 [P] [US1] Write `tests/integration/molecules/RangeField.test.tsx` importing from `src/components/molecules/RangeField` and rendering with props only (no store): the slider's accessible name is the `label`; `min`, `max`, `step`, and `value` attributes match; `aria-valuetext` equals `valueText`; the visible `display` text is shown and is `aria-hidden`; `fireEvent.change` to `'20'` calls `onChange(20)` with a number; a passed `className` is present on the field's outer element alongside its own class
- [ ] T011 [P] [US1] Write `tests/integration/molecules/Legend.test.tsx` importing from `src/components/molecules/Legend`: a list named "Legend" with exactly four items whose text is "Unsorted", "▲Comparing", "●Moving", "▬Sorted" (text content including markers); every swatch and marker is `aria-hidden="true"`

### Implementation for User Story 1

- [ ] T012 [US1] Move the non-component files out of `src/components/`: `git mv src/components/format.ts src/util/format.ts` and update the imports in `src/components/Counters.tsx` and `src/components/RunSummary.tsx`; `git mv src/components/controls.module.css src/styles/controls.module.css` (temporary shared home until US2 splits it, research §7), update every `import controls from './controls.module.css'` to the new relative path, and change `composes: button from './controls.module.css'` in `src/components/Sound.module.css` to `from '../styles/controls.module.css'`
- [ ] T013 [US1] Move the two molecules: `git mv` `src/components/RangeField.tsx` → `src/components/molecules/RangeField.tsx`, `src/components/Legend.tsx` and `src/components/Legend.module.css` → `src/components/molecules/`; fix their imports and the imports of their users (`DataPanel.tsx`, `SpeedSlider.tsx`, `SoundControls.tsx`, `src/App.tsx`); T010 and T011 now pass
- [ ] T014 [US1] Move the 13 organisms with `git mv` into `src/components/organisms/` (data-model.md → Organisms): `DataPanel.tsx`, `UploadInput.tsx`, `PasteInput.tsx`, `AlgorithmPicker.tsx`, `AlgorithmInfo.tsx`, `Visualizer.tsx`, `Counters.tsx`, `PlaybackBar.tsx`, `SpeedSlider.tsx`, `SoundPrompt.tsx`, `SoundControls.tsx`, `RunSummary.tsx`, `LiveRegion.tsx`, together with their CSS modules `AlgorithmPanel.module.css`, `Counters.module.css`, `DataPanel.module.css`, `PlaybackBar.module.css`, `RunSummary.module.css`, `Sound.module.css`, `Visualizer.module.css`; update every relative import inside them (store, engine, render, algorithms, dataset, util, styles, molecules), the `composes … from` path in `organisms/Sound.module.css` (now `'../../styles/controls.module.css'`; T034 removes the rule), and the imports in `src/App.tsx`
- [ ] T015 [P] [US1] Create `src/components/templates/Region.tsx` and `Region.module.css` from the `Region` function and the `.panel` and `.panelHeading` rules in `src/App.module.css`, with props `id`, `title`, `hideTitle` (default `false`), and `children`, rendering the same `<section aria-labelledby={`${id}-heading`}>` with `<h2 id={`${id}-heading`}>` (class `visually-hidden` when `hideTitle`, otherwise the heading class) (contract §4)
- [ ] T016 [P] [US1] Create `src/components/templates/PageLayout.tsx` and `PageLayout.module.css` from the layout markup in `src/App.tsx` and the `.page`, `.header`, `.title`, `.main`, `.controls`, `.stage`, and `.summary` rules (plus the `@media (min-width: 1024px)` block) in `src/App.module.css`: props `title`, `controls`, `stage`, `summary`, `announcements` (all `ReactNode` except `title: string`), rendering `<div class=page><header class=header><h1 class=title>{title}</h1></header><main class=main><div class=controls>{controls}</div><div class=stage>{stage}</div><div class=summary>{summary}</div>{announcements}</main></div>`; give `.summary` `min-width: 0`, keep `grid-column: 1 / -1` from 1,024 px, and make no other style change (contract §4)
- [ ] T017 [US1] Create `src/components/pages/SortLabPage.tsx` and `SortLabPage.module.css` from `src/App.tsx`: keep `useKeyboardShortcuts()`, the `visibilitychange` effect, and the reduced-motion effect unchanged; render `<PageLayout title="SortLab" controls={…} stage={…} summary={…} announcements={<LiveRegion />} />` with the same `Region`s, ids, titles, and `hideTitle` flags as today (Data, Algorithm in `controls`; Visualization hidden, Playback hidden, Sound in `stage`; Run summary in `summary`), the Visualization region's `Visualizer`, `Legend`, `Counters` wrapped in `<div className={styles.stack}>` with `.stack` moved to `SortLabPage.module.css`; then point `src/main.tsx` at `SortLabPage` and `git rm src/App.tsx src/App.module.css` (depends on T013–T016)
- [ ] T018 [US1] Update test imports only: `git mv tests/integration/App.test.tsx tests/integration/SortLabPage.test.tsx` and import `SortLabPage` from `src/components/pages/SortLabPage` in place of `App`; change every `../../src/components/<Name>` import in `tests/integration/*.test.tsx` and `tests/unit/*.test.ts` to its new `organisms/` or `molecules/` path (data-model.md); no assertion changes (FR-012); T009 now passes (depends on T017)
- [ ] T019 [US1] Add a "Component structure" section to `README.md` right after its "Architecture" section (FR-006, clarification Q3): the five levels with what each may contain, import, and whether it may use app state (the table and the four ordered classification rules from data-model.md → Level), the list of components in each level, where non-component helpers live (`src/util/`, `src/hooks/`), and a one-line note that the rules are checked by `npm run lint`; also update the architecture map line about `src/components/`
- [ ] T020 [US1] Validate User Story 1 per quickstart.md → Story 1: `ls src/components` lists only level folders; `npm run lint`, `npm run typecheck`, `npm test` pass; `npx playwright test --project=chromium --project=webkit --project=phone` passes with `visual.spec.ts` at 0 differing pixels; push and confirm CI (Linux, all four browser projects) passes

**Checkpoint**: User Story 1 is complete and shippable on its own: the structure exists,
is documented, and nothing looks or behaves differently.

---

## Phase 4: User Story 2 - Reuse shared building blocks (Priority: P2)

**Goal**: The atoms and the `FileButton` molecule replace every hand-styled button, slider
input, text area, and muted text; only `Button` styles buttons.

**Independent Test**: the `shared building blocks` tests in `tests/unit/boundaries.test.ts`
pass (button markup only in `atoms/Button.tsx`, range inputs only in `atoms/Slider.tsx`);
each atom and molecule has its own passing test; `visual.spec.ts` reports 0 differing
pixels.

### Tests for User Story 2 ⚠️ write first, confirm they fail

- [ ] T021 [P] [US2] Write `tests/integration/atoms/Button.test.tsx` for `src/components/atoms/Button` (props only): renders one `<button>` with `type="button"` by default and its children as the accessible name; `onClick` fires on click and not when `disabled`; `disabled` is the native attribute; `aria-pressed` and other native props pass through; the `primary`, `secondary` (default), and `quiet` variants each render a different class; a passed `className` is appended
- [ ] T022 [P] [US2] Write `tests/integration/atoms/Slider.test.tsx` for `src/components/atoms/Slider`: role `slider` with the given `id`, `min`, `max`, `step`, `value`; `aria-valuetext` equals `valueText`; `fireEvent.change` to `'7'` calls `onChange(7)` with a number
- [ ] T023 [P] [US2] Write `tests/integration/atoms/TextArea.test.tsx` for `src/components/atoms/TextArea`: renders a `<textarea>` passing through `id`, `rows`, `value`, `placeholder`, `aria-describedby`, and `onChange`; `invalid` sets `aria-invalid="true"`, and without it the attribute is absent
- [ ] T024 [P] [US2] Write `tests/integration/atoms/MutedText.test.tsx` for `src/components/atoms/MutedText`: renders a `<p>` by default and a `<span>` with `as="span"`, containing its children
- [ ] T025 [P] [US2] Write `tests/integration/molecules/FileButton.test.tsx` for `src/components/molecules/FileButton`: `getByLabelText(label)` returns an `<input type="file">` with the given `accept`, which is focusable (not `tabIndex=-1`); the label text is visible; `userEvent.upload` calls `onFile` once with the `File`; afterwards the input's `value` is `''`; no call when the selection is empty
- [ ] T026 [P] [US2] Add a `describe('shared building blocks')` block to `tests/unit/boundaries.test.ts` that reads every `.tsx` file under `src/components/` (`fs.readdirSync(..., { recursive: true })`) and asserts: `<button` appears only in `atoms/Button.tsx`; `type="range"` appears only in `atoms/Slider.tsx`; `className={…}` containing the whole word `button`, `primary`, `dismiss`, or `quiet` (`/className=\{[^}]*\b(button|primary|dismiss|quiet)\b/`, as in quickstart → Story 2; whole words so the `styles.buttons` row wrapper in `organisms/PlaybackBar.tsx` does not match) appears only in `atoms/Button.tsx` (US2 scenarios 1–2, SC-004); at this point it fails on six organisms and `molecules/RangeField.tsx`. Do not name `FileButton`'s label class `button`

### Implementation for User Story 2

- [ ] T027 [P] [US2] Create `src/components/atoms/Button.tsx` and `Button.module.css`: move `.button`, `.button:hover:not(:disabled)`, and `.primary` from `src/styles/controls.module.css`, and `.dismiss` from `src/components/organisms/Sound.module.css` renamed `.quiet` (now `composes: button` from the same file), declarations unchanged; props per contract §2 (`variant` `'primary' | 'secondary' | 'quiet'`, default `'secondary'`, plus `ButtonHTMLAttributes<HTMLButtonElement>`, `type` defaulting to `"button"`) (makes T021 pass)
- [ ] T028 [P] [US2] Create `src/components/atoms/Slider.tsx` and `Slider.module.css` (the `.slider` rule from `src/styles/controls.module.css`), props `id`, `min`, `max`, `step?`, `value`, `valueText`, `onChange(value: number)` (makes T022 pass)
- [ ] T029 [P] [US2] Create `src/components/atoms/TextArea.tsx` and `TextArea.module.css` (the `.textarea` and `.textarea[aria-invalid='true']` rules from `organisms/DataPanel.module.css`), taking native textarea props plus `invalid?: boolean` mapped to `aria-invalid={invalid ? true : undefined}` (makes T023 pass)
- [ ] T030 [P] [US2] Create `src/components/atoms/MutedText.tsx` and `MutedText.module.css` (the `.muted` rule from `src/styles/controls.module.css`), props `as?: 'p' | 'span'` (default `'p'`) and `children` (makes T024 pass)
- [ ] T031 [US2] Create `src/components/molecules/FileButton.tsx` and `FileButton.module.css` from `src/components/organisms/UploadInput.tsx` markup and the `.upload`, `.upload label`, `.fileInput`, and `.fileInput:focus-visible + label` rules in `organisms/DataPanel.module.css`, with the label class using `composes: button from '../atoms/Button.module.css'` (a molecule may import an atom); props `label`, `accept`, `onFile(file: File)`; clear `input.value` after reading the file (makes T025 pass) (depends on T027)
- [ ] T032 [US2] Rebuild `molecules/RangeField.tsx` from the `Slider` atom with its public props and markup unchanged: move the `.field`, `.fieldHeader`, and `.fieldValue` rules from `src/styles/controls.module.css` into `molecules/RangeField.module.css` and keep its `<div class=field><div class=fieldHeader><label/><span class=fieldValue aria-hidden/></div><Slider/></div>` structure (T010 still passes) (depends on T028)
- [ ] T033 [US2] Replace hand-styled controls in the organisms, keeping elements, text, order, and attributes identical: `organisms/PlaybackBar.tsx` (Start/Pause/Resume → `<Button variant="primary">`; Step back, Step forward, Reset, Retry → `<Button>`; "Preparing…" → `<MutedText as="span">`), `organisms/DataPanel.tsx` (Generate → `<Button variant="primary">`; "Current data" → `<MutedText>`), `organisms/PasteInput.tsx` (`<textarea>` → `<TextArea invalid={Boolean(dataError)}>`, button → `<Button>`; keep its own `<div class=field><label class=fieldHeader>` markup, with the `.field` and `.fieldHeader` declarations copied unchanged into `organisms/DataPanel.module.css`: the second copy of the field row, under Principle I's three-occurrence threshold, because a molecule may not import another molecule's styles), `organisms/SoundPrompt.tsx` ("Turn on sound" → `<Button>`, "Not now" → `<Button variant="quiet">`), `organisms/SoundControls.tsx` (Mute/Unmute → `<Button aria-pressed={muted}>`; unsupported note → `<MutedText>`), `organisms/RunSummary.tsx` (empty state → `<MutedText>`), `organisms/UploadInput.tsx` (→ `<FileButton label="Upload file" accept=".txt,.csv,text/plain,text/csv" onFile={…}>`) (makes T026 pass) (depends on T027–T032)
- [ ] T034 [US2] Delete what is now unused: `git rm src/styles/controls.module.css`; remove the rules moved in T029 and T031 from `organisms/DataPanel.module.css` and `.dismiss` from `organisms/Sound.module.css`; confirm `grep -rn "controls.module.css" src tests` finds nothing (depends on T033)
- [ ] T035 [US2] Update the "Component structure" section in `README.md`: list the atoms (`Button`, `Slider`, `TextArea`, `MutedText`) and the `FileButton` molecule, and add one line telling contributors to use `Button` for every button and `RangeField` for every labelled slider
- [ ] T036 [US2] Validate User Story 2 per quickstart.md → Story 2: the `shared building blocks` tests pass; all T021–T026 tests and the full suite pass; `visual.spec.ts` at 0 differing pixels; push and confirm CI passes

**Checkpoint**: User Stories 1 and 2 both hold; buttons are styled in one place and the
labelled slider is defined once.

---

## Phase 5: User Story 3 - Keep the structure from eroding (Priority: P3)

**Goal**: `npm run lint` fails with a named rule when a component imports a component it
may not, or when an atom, molecule, or template uses app state. The rules and their test
were built in Phase 2 (T006–T008); this phase proves them on real files.

**Independent Test**: the `dependency rules` cases in `tests/unit/boundaries.test.ts`
pass, and the two manual violations in quickstart → Story 3 each produce exactly one named
error.

- [ ] T037 [US3] Validate User Story 3 per quickstart.md → Story 3: add `import '../../store/appStore';` to `src/components/molecules/Legend.tsx`, run `npm run lint`, and confirm exactly one error with the FR-004 message; replace it with `import '../organisms/DataPanel';` and confirm exactly one error with the FR-003 molecule message; remove it and confirm `npm run lint` passes; `npm test` passes (side-effect imports, so `no-unused-vars` adds no second error) (depends on T013)

**Checkpoint**: All three user stories work; the structure is enforced by the standard
lint gate.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance proof, final gates, and documentation

- [ ] T038 [P] Measure the bundle after the restructure: `npm run build`, add an "After" row to the "Measured results" section of `specs/002-atomic-design-components/quickstart.md`, and confirm the total gzip JS + CSS grew by no more than 2% against T001 (SC-006); if it grew more, find the cause before continuing (Principle V)
- [ ] T039 [P] Re-run feature 001's performance checks against `npm run preview` (`specs/001-sorting-visualizer/quickstart.md` → Performance checks: frame rate with 1,000 values at max speed at 4× CPU throttle with Start pressed by Space key, Pause response via Event Timing, Lighthouse 12.8.2 mobile preset) and record the numbers in `specs/002-atomic-design-components/quickstart.md` → Measured results: no frames over 50 ms, Pause under 100 ms, interactive under 2 s
- [ ] T040 Remove leftovers: confirm `src/components/` has no files outside level folders, no CSS module rule is unused (search each class in its module's component), no export is unused outside tests, and `src/App.tsx`, `src/App.module.css`, `src/components/format.ts`, and any `controls.module.css` are gone
- [ ] T041 Run every quality gate: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright test --project=chromium --project=webkit --project=phone`; push and confirm the `CI` workflow passes on Linux, including Firefox and `visual.spec.ts`; fix every failure
- [ ] T042 Walk through every scenario in `specs/002-atomic-design-components/quickstart.md` and in `specs/001-sorting-visualizer/quickstart.md` → Validation scenarios (Stories 1–4) against `npm run preview`, and confirm SC-005: using only the README section, locate the components for the Speed slider, the Run summary table, and Upload file in at most two lookups each

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: T003 → T004 → T005 (T005 also needs T002); T006 → T007 → T008, independent of the images. Blocks every user story: nothing moves until the 16 reference images are committed and the rules run in `npm run lint`.
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1 (atoms are created inside the level folders and replace markup in the moved organisms)
- **US3 (Phase 5)**: T037 needs US1's `molecules/Legend.tsx` (T013); independent of US2
- **Polish (Phase 6)**: depends on every story you intend to ship

### User Story Dependencies

```text
Setup → Foundational (visual references + lint rules) → US1 (MVP: levels + docs) ─┬─→ US2 (shared atoms)
                                                                                   └─→ US3 (validate rules)
                                                                                            └─→ Polish
```

### Within Each Phase

- Test tasks first; confirm they fail for the right reason
- Moves (T012 → T013 → T014) before new templates and the page (T015, T016 → T017), then test imports (T018)
- Atoms (T027–T030) before the `FileButton` molecule (T031) and the `RangeField` rebuild (T032), before replacing markup in organisms (T033), before deleting old styles (T034)
- Tasks editing the same file run in ID order: `tests/unit/boundaries.test.ts` (T006 → T009 → T026), `README.md` (T019 → T035), `molecules/RangeField.tsx` (T013 → T032), `organisms/DataPanel.module.css` (T029 and T031 read from it, T033 adds the paste field rules → T034 removes), `specs/002-atomic-design-components/quickstart.md` (T001 → T038 → T039)

### Parallel Opportunities

- Setup: T001 and T002 together
- Foundational: T006–T008 alongside T003–T005
- US1: T009, T010, T011 together; T015 and T016 together (after T014)
- US2: T021–T026 together; T027–T030 together
- US3 can run alongside US2 once US1 is done; they touch no common files
- Polish: T038 and T039 together

---

## Parallel Example: User Story 2

```bash
# All atom and molecule tests at once:
Task: "Write tests/integration/atoms/Button.test.tsx"
Task: "Write tests/integration/atoms/Slider.test.tsx"
Task: "Write tests/integration/atoms/TextArea.test.tsx"
Task: "Write tests/integration/atoms/MutedText.test.tsx"
Task: "Write tests/integration/molecules/FileButton.test.tsx"
Task: "Add the shared building blocks block to tests/unit/boundaries.test.ts"

# Then all atoms at once:
Task: "Create src/components/atoms/Button.tsx + Button.module.css"
Task: "Create src/components/atoms/Slider.tsx + Slider.module.css"
Task: "Create src/components/atoms/TextArea.tsx + TextArea.module.css"
Task: "Create src/components/atoms/MutedText.tsx + MutedText.module.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational: reference images on macOS and Linux from unchanged code, and the
   dependency rules in the lint gate
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: folder check, full suite, 0-pixel visual diff, CI green
5. The codebase is organized by level and documented, with no user-visible change

### Incremental Delivery

1. Setup + Foundational → safety nets in place
2. US1 → levels and README → validate (MVP)
3. US2 → shared atoms, duplication removed → validate
4. US3 → rules proven on real files → validate
5. Polish → performance evidence, final gates

---

## Notes

- [P] tasks = different files and no dependency on an unfinished task
- [Story] labels map tasks to user stories for traceability
- Commit after each task or logical group; stop at any checkpoint to validate a story
- If the visual check ever reports a difference, the restructure changed something: find
  and fix it in the component, never by updating the reference images
- Every bug fix found during implementation needs a regression test (Principle III)
