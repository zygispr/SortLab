# Data Model: SCSS Styling

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This feature has no runtime data. Its "entities" are the stylesheets and the shared
style items defined in the spec's Key Entities. This file inventories them so tasks can
be cut per file and reviewers can check each conversion.

## Entities

### Component stylesheet

| Field | Rule | Source |
|-------|------|--------|
| Path | `src/components/<level>/<Component>.module.scss`, next to `<Component>.tsx` | FR-001, FR-002 |
| Scope | CSS-module local class names, private to the component and imported only by its own component's `.tsx` files (another component reuses a look through that component or a class helper it exports, such as `buttonClass()`) | FR-002, FR-011 |
| Shared items | `@use '../../styles/shared';` then `shared.<name>`, only when the file uses a shared item | FR-008, [R4](./research.md#r4-shared-values-and-patterns-one-namespaced-partial) |
| Nesting | States, screen-size and user-preference changes, and directly related children are nested under their element; at most 3 levels | FR-003, FR-004 |
| Composition | `composes:` only from the same file | [R3](./research.md#r3-cross-file-composes-cannot-point-at-a-scss-file) |

### Shared style values and patterns (`src/styles/_shared.scss`)

A partial (leading underscore) that only contains build-time items and emits no CSS on
its own. Signatures and emitted declarations are in
[contracts/style-rules.md §1](./contracts/style-rules.md#1-shared-partial-srcstyles_sharedscss).

| Item | Kind | Uses | Why it is shared |
|------|------|------|------------------|
| `$wide` (1024px) | value | PageLayout (2 media queries) | Named by FR-005 and SC-005. It is the one breakpoint the layout, README, and e2e layout tests refer to |
| `bordered-surface` | mixin | Button, TextArea, AlgorithmPanel `.select`, Region `.panel` | 3 declarations × 4 uses (FR-006) |
| `bare-list` | mixin | Legend `.legend`, AlgorithmPanel `.complexity`, Counters `.counters` | 3 declarations × 3 uses (FR-006) |
| `wrap-row` | mixin | PlaybackBar `.buttons` and `.error` | 3 declarations (`flex-wrap`, `align-items`, `gap`) × 3 uses (FR-006). Revised 2026-10-29 (feature 001, sound prompt removed): Sound `.prompt` (`inline-flex`) and the `$display` parameter were removed, leaving 2 uses; the mixin stays rather than being written out again |
| `focus-ring` | mixin | global `:focus-visible`, FileButton label | 2 uses, below the threshold, but covered by the spec's edge-case exception for two copies that must stay identical: FileButton's ring must match the global ring exactly, so the two are one fact rather than two similar texts |

**What counts as a repeated group (FR-006)**: three or more declarations that recur
together with identical values (order ignored). Two-declaration pairs that recur, such
as `display: grid; gap: …` (7 uses) and `color: muted; font-size: small` (3 uses), stay
written out. An `@include` line is no shorter or clearer than the two declarations it
would replace. Two-copy groups stay inline under Principle I: the RangeField and
DataPanel field rows, and the Button and `.select` control height.

### Design tokens (`src/styles/tokens.scss`)

Unchanged in name and value (FR-007): the same custom properties on `:root`, overridden
under `prefers-color-scheme: dark`. They are read at runtime by every stylesheet and by
`src/render/barRenderer.ts`. No Sass variable mirrors a token.

### Global rules (`src/styles/global.scss`)

Page-wide element rules: box sizing, base typography, focus ring, disabled controls,
visually hidden, and reduced motion. They are imported once from `src/main.tsx`, after
the tokens.

## Inventory

All 19 stylesheets plus the new partial. "Nested" lists what moves under its element;
"Shared" lists the shared items used. Everything else is a rename with identical content
(comments may be kept as `//` or `/* */`).

| # | File (`.css` → `.scss`) | Nested | Shared |
|---|-------------------------|--------|--------|
| 1 | `styles/tokens` | the dark `@media` inside `:root` | — |
| 2 | `styles/global` | the reduced-motion `@media` inside `*, *::before, *::after` | `focus-ring` |
| 3 | `styles/_shared` (new) | — | defines all items |
| 4 | `atoms/Button.module` | `&:hover:not(:disabled)` | `bordered-surface` |
| 5 | `atoms/MutedText.module` | — | — |
| 6 | `atoms/Slider.module` | — | — |
| 7 | `atoms/TextArea.module` | `&[aria-invalid='true']` | `bordered-surface` |
| 8 | `molecules/FileButton.module` | `.upload { label }`, `.fileInput { &:focus-visible + label }`; `.label` removed | `focus-ring` |
| 9 | `molecules/Legend.module` | — (swatch modifiers stay separate classes) | `bare-list` |
| 10 | `molecules/RangeField.module` | — | — |
| 11 | `organisms/AlgorithmPanel.module` | `.complexity { li }` | `bordered-surface`, `bare-list` |
| 12 | `organisms/Counters.module` | `.counters { li }` | `bare-list` |
| 13 | `organisms/DataPanel.module` | `.divider { &::before, &::after }` | — |
| 14 | `organisms/PlaybackBar.module` | — | `wrap-row` ×2 |
| 15 | `organisms/RunSummary.module` | `.table { th, td { &:first-child } th }` (3 levels) | — |
| 16 | `organisms/Sound.module` | — | `wrap-row(inline-flex)` (none since 2026-10-29: `.prompt` removed) |
| 17 | `organisms/Visualizer.module` | — | — |
| 18 | `pages/SortLabPage.module` | — | — |
| 19 | `templates/PageLayout.module` | the wide `@media` inside `.main` and inside `.summary` | `$wide` |
| 20 | `templates/Region.module` | — | `bordered-surface` |

**Non-stylesheet files that change**:

- `src/main.tsx`: the two global imports become `.scss`.
- Each component `.tsx`: its stylesheet import becomes `.module.scss`.
- `src/components/atoms/Button.tsx`: exports `buttonClass(variant = 'secondary')`,
  which it also uses itself (R3).
- `src/components/molecules/FileButton.tsx`: imports `buttonClass` from `../atoms/Button`
  and uses `buttonClass()` on the label (R3).
- `eslint.boundaries.js` (`SIBLING`) and `tests/unit/boundaries.test.ts` (allowed-import
  paths): `.module.css` → `.module.scss` (FR-011, FR-015).

## Validation rules (from requirements)

| Rule | Checked by |
|------|------------|
| No `.css` file under `src/` (FR-001, SC-001) | `tests/unit/styleRules.test.ts` |
| No `composes … from` in any stylesheet (R3) | `tests/unit/styleRules.test.ts` |
| Nesting ≤ 3 levels (FR-004, SC-008) | Stylelint `max-nesting-depth: 2` in `npm run lint`; its behavior is proven in `tests/unit/styleRules.test.ts` |
| SCSS formatted (FR-009) | `npm run format:check` (Prettier) |
| Selectors and declarations unchanged (FR-013) | Compiled-CSS review ([quickstart §3](./quickstart.md#3-compiled-css-equivalence-review)) plus the visual check |
| Shared values and groups defined once (FR-005, FR-006, SC-005) | Review against the table above, with the grep in [quickstart §2](./quickstart.md#story-2--shared-values-and-patterns) |
