# Quickstart & Validation Guide: SCSS Styling

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This guide shows how to prove that every stylesheet is SCSS, that it reads as intended,
and that nothing changed for end users. Setup and the full quality gates are the same as
in [feature 001's quickstart](../001-sorting-visualizer/quickstart.md#setup-and-run). The
visual references from feature 002 are reused as they are and are **not** re-captured.

## 1. Before converting anything: record the baseline

On the feature branch, before any stylesheet changes:

```bash
npm ci && npm run build
for f in dist/assets/index-*.css; do wc -c < "$f"; gzip -9 -c "$f" | wc -c; done
npx prettier --parser css < dist/assets/index-*.css \
  | sed -E 's/\._([A-Za-z]+)_[a-z0-9]{5}_[0-9]+/.\1/g' > "$TMPDIR/sortlab-css-before.css"
```

**Expect**: the raw and gzip byte counts of the CSS chunk. Record them in
[Measured results](#measured-results); the last `dist/` measured 8,022 B raw and
2,353 B gzip. You also get a readable copy of the shipped CSS in which each hashed class
is replaced by its local name.

**If the "before" file is gone** (`$TMPDIR` can be cleared by a reboot or a new
session), rebuild it from the baseline commit recorded in Measured results, without
touching your working tree:

```bash
git worktree add "$TMPDIR/sortlab-baseline" <baseline-commit>
(cd "$TMPDIR/sortlab-baseline" && npm ci >&2 && npm run build >&2 \
  && npx prettier --parser css < dist/assets/index-*.css \
  | sed -E 's/\._([A-Za-z]+)_[a-z0-9]{5}_[0-9]+/.\1/g') > "$TMPDIR/sortlab-css-before.css"
git worktree remove --force "$TMPDIR/sortlab-baseline"
```

## 2. After the conversion

### Story 1 – every stylesheet is SCSS and reads as one block

```bash
find src -name '*.css'                       # nothing
find src -name '*.scss' | wc -l              # 20 (19 converted + _shared.scss)
npm run lint && npm run format:check && npm run typecheck
npm test                                     # includes tests/unit/styleRules.test.ts
npx playwright test --project=chromium --project=webkit --project=phone
```

**Expect**:

- No `.css` files and 20 `.scss` files.
- Lint (ESLint, then Stylelint), format, and type checks pass with zero warnings.
- All unit, component, and e2e tests pass, including `visual.spec.ts` with 0 differing
  pixels in all 8 images (SC-002).
- `git status tests/e2e/visual.spec.ts-snapshots` shows nothing: the references are
  unchanged (FR-014).
- CI runs the same checks on Linux, including Firefox.

Readability (SC-004, SC-006): open `atoms/Button.module.scss`,
`templates/PageLayout.module.scss`, and `organisms/RunSummary.module.scss`. Each element
has a single top-level rule that contains its states and its `@media` change. A reviewer
picks three elements at random, for example the Pause button, the summary row on wide
screens, and the first table column. For each one, every rule that affects it is in one
block, found within 30 seconds.

### Story 2 – shared values and patterns

```bash
grep -rn "1024px" src                                    # only styles/_shared.scss
grep -rnE "list-style: none|border: 1px solid var\(--color-border\)" src/components
grep -rn "@include shared\." src | wc -l                 # 12 (one per use in data-model.md)
```

**Expect**:

- The breakpoint is defined once (SC-005).
- The second grep finds nothing, because the `bare-list` and `bordered-surface`
  declarations now exist only in `_shared.scss`.
- There are 12 includes: `bordered-surface` 4, `bare-list` 3, `wrap-row` 3,
  `focus-ring` 2.

Compare the result against the inventory in
[data-model.md](./data-model.md#inventory).

### Story 3 – the rules are enforced (SC-008)

1. Create `src/components/atoms/Stray.css` containing `.x {}` and run `npm test`.
   **Expect**: `no plain stylesheets` fails and names `/src/components/atoms/Stray.css`.
   Delete the file.
2. In `organisms/RunSummary.module.scss`, nest `span { color: red; }` inside the
   `&:first-child` block (4 levels) and run `npm run lint`. **Expect**: one Stylelint
   error, `Too deep nesting, maximum 2`, with the file name and line. Undo the change.
3. In `molecules/FileButton.module.scss`, add
   `.x { composes: button from '../atoms/Button.module.scss'; }` and run `npm test`.
   **Expect**: `no cross-file composes` fails and names the file. Undo the change.
4. Add two spaces of indentation to any `.scss` line and run `npm run format:check`.
   **Expect**: Prettier names the file. Run `npm run format` to fix it.

`npm run lint` and `npm run format:check` pass again afterwards.
`tests/unit/styleRules.test.ts` checks items 1–3 automatically.

## 3. Compiled-CSS equivalence review

This review covers the states the screenshots cannot reach: hover, disabled,
`aria-invalid`, reduced motion, and wide-screen rules at other widths.

```bash
npm run build
npx prettier --parser css < dist/assets/index-*.css \
  | sed -E 's/\._([A-Za-z]+)_[a-z0-9]{5}_[0-9]+/.\1/g' > "$TMPDIR/sortlab-css-after.css"
diff -u "$TMPDIR/sortlab-css-before.css" "$TMPDIR/sortlab-css-after.css"
```

**Expect**: every difference is one of these, from
[research R8](./research.md#r8-proving-no-visible-change):

- dropped comments
- FileButton's empty `.label` rule removed
- PageLayout's `@media (min-width: 1024px)` split into one block after `.main` and one
  after `.summary`
- the reduced-motion block moved next to the box-sizing rule
- declarations reordered inside `.panel` (Region), where none of the reordered
  declarations set the same property

Any changed selector, value, or `!important`, or any added or removed declaration, is a
defect. Record the reviewed diff summary in [Measured results](#measured-results).

## 4. Performance (FR-016, SC-007)

| Check | How | Target |
|-------|-----|--------|
| Shipped styles | Raw and gzip bytes of `dist/assets/index-*.css` vs §1 | grows ≤ 5% |
| Total bundle | gzip JS + CSS vs §1 (method in [feature 002's results](../002-atomic-design-components/quickstart.md#measured-results)) | JS differs only in the hashed class-name strings (a few bytes); worker chunk byte-identical |
| Frame rate and response | Feature 001 quickstart → Performance checks, frame-rate and Pause rows | no frames > 50 ms, response < 100 ms |
| Load | Lighthouse mobile preset | interactive < 2 s |

## Measured results

Bundle sizes are exact byte counts for each file in `dist/assets/` after `npm run build`:
raw is `wc -c < <file>`, and gzip is `gzip -9 -c <file> | wc -c`. File names carry
content hashes, so rows compare files by chunk name. The FR-016 limit for the CSS chunk
is the "Before" gzip size + 5%: 2,350 × 1.05 = **2,467 bytes** (raw: 8,022 × 1.05 =
8,423 bytes).

| Measured | Commit | `index-*.js` | `steps.worker-*.js` | `index-*.css` | Total gzip JS + CSS |
|----------|--------|--------------|---------------------|---------------|---------------------|
| Before (plain CSS) | `3271b34` | 84,108 (raw 267,075) | 5,356 (raw 14,751) | 2,350 (raw 8,022) | **91,814** |

The "Before" CSS was saved normalized (hashed class names replaced by their local names,
453 lines) to `$TMPDIR/sortlab-css-before.css` on 2026-10-29. If it is lost, rebuild it
from `3271b34` as described in §1.

### Story 1 compiled-CSS review (T016), 2026-10-29

The normalized "after" CSS has 455 lines (before: 453). Compared line by line with
order ignored (`diff <(sort before) <(sort after)`), the only addition is one
`@media (width>=1024px) { … }` wrapper. Every selector, declaration, value, and
`!important` is otherwise identical. The ordered diff has three moves, all allowed by
research R8:

| Difference | Cause | Allowed because |
|------------|-------|-----------------|
| PageLayout's wide-screen `@media` split into one block after `.main` and one after `.summary` | T013 nesting | each override still follows its base rule |
| The reduced-motion `@media` moved from the end of the global rules to right after the box-sizing rule | T009 nesting | its declarations are `!important`, so position does not matter |
| The Button atom's rules (`.button`, `:hover`, `.primary`, `.quiet`) moved before `.muted` … `.fieldValue` | T007: FileButton imports `atoms/Button` | none of the crossed classes styles a button or the file picker's label |

The first build also changed Legend's four `hsl()` stops to comma syntax. That was fixed
by interpolation (research R8, contract §2 rule 8) before the review above. The empty
`.label` rule from T007 did not appear in either build, because the minifier drops empty
rules.

Gates at the end of Story 1: lint, format, and typecheck pass; 571/571 unit and
component tests pass; 61 e2e tests pass on chromium, webkit, and phone (17 skipped); the
visual check reports 0 differing pixels; and the reference images are unchanged.

### Story 2 compiled-CSS review (T021), 2026-10-29

Compared with the Story 1 build, the only difference is Region's `.panel`: `background`
moved after `border` and `border-radius`. These set different properties, so the
reorder is allowed (R8). Compared with the baseline, with order ignored, the CSS is still
identical except for PageLayout's extra `@media (width>=1024px)` wrapper. The mixins emit
exactly the declarations they replaced.

| Check | Result |
|-------|--------|
| `shared patterns are written out once` (5 signatures) | Pass |
| `grep -rn "1024px" src` | Only `src/styles/_shared.scss:6` |
| `grep -rn "@include shared\." src \| wc -l` | 12 (`bordered-surface` 4, `bare-list` 3, `wrap-row` 3, `focus-ring` 2) |
| Gates | Lint, format, and typecheck pass; 576/576 unit and component tests; 61 e2e pass on chromium, webkit, and phone (17 skipped); visual check 0 differing pixels; references unchanged |

_Still to fill: the after sizes, the Story 3 results, and the performance rows._
