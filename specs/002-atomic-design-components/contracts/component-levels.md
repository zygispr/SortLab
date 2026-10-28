# Contract: Component Levels

What each level promises to the levels above it, the rules that keep it that way, and the
check that proves end users see no change. Components are listed in
[data-model.md](../data-model.md).

## 1. Dependency rules (FR-003 to FR-005, FR-015)

Enforced by `no-restricted-imports` in `eslint.boundaries.js`, which `eslint.config.js`
includes, so `npm run lint` fails on any violation. Paths are matched on the import
string, so they apply at any relative depth. (`\|` in the table is Markdown escaping; the
regexes use a plain `|`.)

| Files | Blocked imports (regex on the import path) | Message |
|-------|--------------------------------------------|---------|
| `src/components/atoms/**` | `^\.{1,2}/(.*/)?(molecules\|organisms\|templates\|pages)(/\|$)` | `Atomic design (FR-005): an atom may not import molecules, organisms, templates, or pages.` |
| `src/components/molecules/**` | `^\.{1,2}/(.*/)?(organisms\|templates\|pages)(/\|$)` | `Atomic design (FR-005): a molecule may not import organisms, templates, or pages.` |
| `src/components/organisms/**` | `^\.{1,2}/(.*/)?(templates\|pages)(/\|$)` | `Atomic design (FR-005): an organism may not import templates or pages.` |
| `src/components/templates/**` | `^\.{1,2}/(.*/)?(organisms\|pages)(/\|$)` | `Atomic design (FR-003): a template is pure layout and may not import organisms or pages; the page passes content in.` |
| atoms, molecules, templates | `(^\|/)(store\|hooks)/` and the package `zustand` | `Atomic design (FR-004): atoms, molecules, and templates may not use app state (store, zustand, or hooks); take values and callbacks as props.` |
| `src/components/pages/**` | — | — |

`tests/unit/boundaries.test.ts` lints one violating and one allowed import per row and
asserts the message above appears, or does not. It also asserts that `src/components/`
contains exactly the folders `atoms`, `molecules`, `organisms`, `templates`, `pages` and
no files (SC-001).

## 2. Atoms

Every atom is a function component with TSDoc, takes everything it shows as props, reports
user actions only through callback props, and forwards an optional `className` that is
appended to its own. None reads app state.

### `Button` (`atoms/Button.tsx`)

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `variant` | `'primary' \| 'secondary' \| 'quiet'` | `'secondary'` | primary = filled focus color (Start, Generate); secondary = bordered surface (all other buttons); quiet = no border or background ("Not now") |
| …native | `ButtonHTMLAttributes<HTMLButtonElement>` | | `type` is always `"button"` unless `type="submit"` is passed; `disabled` uses the native attribute (dimmed by `global.css`) |

Renders one `<button>`. It is the only component whose stylesheet styles a button
(`atoms/Button.module.css`, the former `.button`, `.primary`, and `.dismiss` rules).

### `FileButton` (`atoms/FileButton.tsx`)

| Prop | Type | Notes |
|------|------|-------|
| `label` | `string` | visible text and accessible name ("Upload file") |
| `accept` | `string` | passed to the file input |
| `onFile` | `(file: File) => void` | called with the chosen file; the input is then cleared so the same file can be chosen again |

Renders a visually hidden `<input type="file">` (still in the tab order) and a `<label>`
styled with the secondary button look from `Button.module.css`, with the focus outline
shown on the label while the input has keyboard focus.

### `Slider` (`atoms/Slider.tsx`)

| Prop | Type | Notes |
|------|------|-------|
| `id` | `string` | links the label in `Field` |
| `min`, `max`, `step?`, `value` | `number` | |
| `valueText` | `string` | `aria-valuetext` |
| `onChange` | `(value: number) => void` | called with the new numeric value |

### `TextArea` (`atoms/TextArea.tsx`)

Native `<textarea>` props, plus `invalid?: boolean` → `aria-invalid="true"` and the error
border. Styles move from `DataPanel.module.css` `.textarea`.

### `MutedText` (`atoms/MutedText.tsx`)

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `as` | `'p' \| 'span'` | `'p'` | `span` where it sits inline (the "Preparing…" indicator) |
| `children` | `ReactNode` | | |

## 3. Molecules

### `Field` (`molecules/Field.tsx`)

| Prop | Type | Notes |
|------|------|-------|
| `label` | `string` | rendered as `<label htmlFor={controlId}>` |
| `controlId` | `string` | id of the control passed as `children` |
| `display` | `string?` | visible value beside the label, `aria-hidden` (the control carries the spoken value) |
| `children` | `ReactNode` | exactly one control |
| `className` | `string?` | appended to the field's own class |

### `RangeField` (`molecules/RangeField.tsx`)

Unchanged public props (`label`, `min`, `max`, `step?`, `value`, `display`, `valueText`,
`onChange`, `className?`); now built from `Field` and `Slider`.

### `Legend` (`molecules/Legend.tsx`)

No props; unchanged output (list named "Legend" with four entries).

## 4. Templates

### `Region` (`templates/Region.tsx`)

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `id` | `string` | | heading id is `${id}-heading`; the section is `aria-labelledby` it |
| `title` | `string` | | the `<h2>` text |
| `hideTitle` | `boolean` | `false` | keeps the heading for assistive technology, hidden visually |
| `children` | `ReactNode` | | |

### `PageLayout` (`templates/PageLayout.tsx`)

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | the `<h1>` in the header |
| `controls` | `ReactNode` | left column from 1,024 px (Data and Algorithm regions) |
| `stage` | `ReactNode` | right column from 1,024 px (Visualization, Playback, Sound regions) |
| `summary` | `ReactNode` | full-width row below both columns |
| `announcements` | `ReactNode` | rendered last inside `<main>` (the live region) |

One column below 1,024 px; every slot wrapper keeps `min-width: 0` so wide content
cannot push the page past the viewport (FR-029 of feature 001).

## 5. Page

`SortLabPage` (`pages/SortLabPage.tsx`) is the only export `src/main.tsx` renders. It runs
the page-wide effects and passes `Region`s holding organisms into `PageLayout`'s slots,
in the region order and with the titles and hidden headings of feature 001's
[UI contract](../../001-sorting-visualizer/contracts/ui-contract.md).

## 6. Visual check (FR-013, SC-002)

`tests/e2e/visual.spec.ts`, `chromium` project only.

| Image name | Viewport | Color scheme |
|------------|----------|--------------|
| `light-360.png` | 360 × 740 | light |
| `dark-360.png` | 360 × 740 | dark |
| `light-1440.png` | 1440 × 900 | light |
| `dark-1440.png` | 1440 × 900 | dark |

Before each capture: new browser context (empty storage); open `/`; wait for the chart to
be ready ("step 0 of" a non-zero total); paste exactly
`12, 87, 45, 3, 66, 29, 91, 54, 8, 73, 38, 61, 17, 95, 42, 26, 80, 5, 69, 33, 58, 14, 99, 47, 21, 76, 36, 63, 10, 84`
into Paste numbers, press Use these numbers, wait for "Bar chart of 30 values … step 0
of" a non-zero total, then clear the text box and move focus to the page body. Capture
the full page with `animations: 'disabled'`, `caret: 'hide'`, and `maxDiffPixels: 0`.

Reference images live in `tests/e2e/visual.spec.ts-snapshots/` with Playwright's
`-chromium-darwin` and `-chromium-linux` suffixes, and are captured from the code as it
is before any component moves.
