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
| After (SCSS) | `35d2d57` | 84,103 (raw 267,073) | 5,356 (raw 14,751) | 2,337 (raw 8,045) | **91,796** (−18, −0.02%) |

FR-016 / SC-007 shipped styles: **pass**. The CSS chunk is 2,337 B gzip, 13 B smaller
(−0.55%) and well under the 2,467 B limit. Raw, it is 23 B larger (+0.29%), because
PageLayout's wide-screen query is now emitted twice.

- **`steps.worker-*.js`**: byte-identical (`cmp` against a build of `3271b34` in a
  temporary worktree; same content hash, `Crl2wk39`).
- **`index-*.js`**: 2 B smaller raw. A byte diff is not meaningful, because FileButton now
  imports `atoms/Button` (T007), which changes module order, so the minifier assigns
  different short identifiers throughout the bundle. Instead:
  - The source changes in `.ts`/`.tsx` since `3271b34` are only the 22 stylesheet import
    paths, the `buttonClass()` helper and its use in FileButton, and 3 comments.
  - With hashed class names normalized, the bundle's string literals are identical. The
    one difference is a minified function name inside a template string.

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

### Story 3 checks on real files (T023), 2026-10-29

Each violation was made, checked, and undone. `git status` showed no leftover change
afterwards.

| # | Violation | Command | Result |
|---|-----------|---------|--------|
| 1 | `src/components/atoms/Stray.css` containing `.x {}` | `npm test` | `no plain stylesheets` fails: `Plain stylesheets are not allowed (feature 003, FR-001); rename to .scss:` with `/src/components/atoms/Stray.css`. No other test fails |
| 2 | `span { color: red; }` nested inside `&:first-child` in `organisms/RunSummary.module.scss` (4 levels) | `npm run lint` | One error: `src/components/organisms/RunSummary.module.scss` `21:7 ✖ Too deep nesting, maximum 2  max-nesting-depth` |
| 3 | `.x { composes: button from '../atoms/Button.module.scss'; }` in `molecules/FileButton.module.scss` | `npm test` | `no cross-file composes` fails: `composes from another file ships uncompiled SCSS …` with `/src/components/molecules/FileButton.module.scss` |
| 4 | Two extra spaces before `width: 100%;` in `atoms/Slider.module.scss` | `npm run format:check`, then `npm run format` | `[warn] src/components/atoms/Slider.module.scss`; `npm run format` restored the file byte for byte |

SC-008: **pass**. Each check fails on its violation, names the file, and passes again
once the violation is removed.

### Performance re-check (T025), 2026-10-29

Measured on the production build `35d2d57` with `npm run preview`, on an Apple Silicon
Mac with Chromium 156.0.8078.4 from Playwright 1.64. The method is feature 001's
quickstart → Measured results: a Playwright and CDP script with 1,000 values, Bubble Sort,
the Speed slider at maximum (60,000 steps/s), and the run started with Space.

| Check | Measured | Target | Result |
|-------|----------|--------|--------|
| Frame rate over a 5 s sample, while sorting | 1× CPU: 60 fps, p95 frame 16.8 ms, max 16.8 ms. 4× CPU: 60 fps, p95 16.8 ms, max 16.8 ms. 0 frames > 50 ms and 0 long animation frames ≥ 50 ms at both rates. Still sorting when the sample ended | No frames > 50 ms, ~60 fps | Pass |
| Pause and Resume response, 4× CPU, same load, 5 real mouse clicks each | Event Timing (input to next paint): 16–24 ms for every `pointerdown` and `click` | < 100 ms | Pass |
| Load, Lighthouse 12.8.2, mobile preset (150 ms RTT, 1.6 Mbps, 4× CPU), 5 runs | Time to Interactive 1.35–1.41 s, FCP and LCP 1.35 s, TBT 0–8 ms, CLS 0, score 100 in every run | Interactive < 2 s | Pass |

FR-016 / SC-007 runtime budgets: **pass**. They are unchanged from features 001 and 002,
as expected: the browser still receives plain CSS, and the CSS is smaller gzipped.

### Walkthrough (T028), 2026-10-29

Run against the production build on `npm run preview`, with Chromium 156 from Playwright
1.64, scripted step by step. The script checked each step against the page's accessible
names, the live region, and the counters.

| Scenario | Result |
|----------|--------|
| This guide: baseline (§1), Story 1, Story 2, and Story 3 checks, compiled-CSS reviews (§3), performance (§4) | Pass (T002, T016, T021, T023, T024, T025) |
| Feature 001 Story 1: 50 bars and Bubble Sort on open; size 200 + Generate; Start makes the counters rise; Space pauses, → → applies two steps (26 → 28), ← undoes one (→ 27), each announced; max speed finishes with "Sorted with Bubble Sort"; hiding the tab pauses ("Paused.") | Pass, 6/6 steps |
| Feature 001 Story 2: Merge Sort restarts from the start and finishes; the summary lists Bubble Sort and Merge Sort; Generate clears it | Pass, 3/3 steps |
| Feature 001 Story 3: `valid-mixed.csv` loads with Counting and both Radix sorts disabled ("needs whole numbers"); `valid-1000.txt` loads in 27 ms; `header-row.csv`, `too-many.txt`, and `image.png` show their messages and keep the dataset; pasting `5, 3, 8, 1` gives 4 bars | Pass, 6/6 checks |
| Feature 001 Story 4: a fresh visit shows Turn on sound and Not now next to Start; after Turn on sound, Start scheduled 35 tones in 0.8 s (counted by wrapping `OscillatorNode.start`); Mute stops new tones while sorting continues (step 36 → 72); reload keeps it muted without the prompt | Pass, 4/4 steps |
| Feature 001 Story 4.5, listening at max speed | Not repeated: `src/audio/` is unchanged by this feature, so feature 001's listening check (2026-10-28) still applies |

SC-006 readability, three elements checked:

| Element | Where its component rules are | Result |
|---------|-------------------------------|--------|
| The Pause button | `atoms/Button.module.scss`: one `.button` block holding the base look (`bordered-surface`) and `&:hover:not(:disabled)`. The page-wide `:focus-visible` and `button:disabled` rules in `global.scss` are exempt under SC-004 | Pass |
| The wide-screen summary row | `templates/PageLayout.module.scss`: one `.summary` block holding `min-width: 0` and its `@media (min-width: shared.$wide)` change | Pass |
| The first Run summary column | `organisms/RunSummary.module.scss`: one `.table` block, with `th, td` and their `&:first-child` override nested together | Pass |

Each lookup is one file and one block. This was checked by reading the files, not timed
with a separate reviewer.

Final gates (T027) before the push: lint (ESLint + Stylelint), format, typecheck, 576/576
unit and component tests, the build, and 61 e2e tests on chromium, webkit, and phone (17
skipped) all pass. The visual check reports 0 differing pixels, and the reference images
are unchanged. CI passed on Linux, including Firefox and the Linux visual references, for `2969219` (the SCSS conversion), `35d2d57`, and the final `51ee821` (run 40842397626: 79 e2e passed, 25 skipped)

