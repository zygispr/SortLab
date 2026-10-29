# Research: SCSS Styling

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Decisions behind the plan. Two of them (R3 and R5) rest on a throwaway build made in a
scratch folder with the exact tool versions below; it is not part of the repository.

## R1. Sass compiler: `sass` (Dart Sass, pure JS)

- **Decision**: Add `sass@1.105.2` as a dev dependency. Vite 8.3.5 compiles `.scss` and
  `.module.scss` as soon as a Sass compiler is installed, using Sass's modern API by
  default, so `vite.config.ts` does not change.
- **Rationale**: The pure-JS package has no native binary to download or match per
  platform (macOS dev, Ubuntu CI). 1.105.2 is the version Vite 8.3.5 itself builds
  against, and it was released on 2026-10-16. The newest release (1.107.0) was a day
  old when this was planned.
- **Alternatives considered**:
  - `sass-embedded`: faster on large codebases, but it ships a platform-specific Dart
    binary. For 19 files and about 540 lines the speed difference cannot be measured
    against Vite's own build time.
  - A Vite `css.preprocessorOptions` block (`loadPaths`, `additionalData`): not needed.
    `additionalData` would inject the shared partial into every file without any visible
    reference, which hurts the readability this feature is for (see R4).

## R2. Plain CSS nesting instead of SCSS (Constitution Principle II)

- **Decision**: Use SCSS, as the request asks. Record the new dependency in
  Complexity Tracking.
- **Rationale**: Native CSS nesting works in every supported browser (current and
  previous Chrome, Edge, Firefox, Safari) and would meet FR-003 with no dependency. It
  cannot meet FR-005 or FR-006 in plain CSS:
  - `var()` is not allowed in a media query, so the breakpoint cannot be a named value.
    `@custom-media` has no browser support.
  - Plain CSS has no mixins, so repeated declaration groups cannot be named once.

  Sass meets all three requirements, and it compiles away, so nothing new reaches the
  browser.
- **Alternatives considered**: Native nesting plus Lightning CSS drafts (`customMedia`):
  covers the breakpoint but not mixins, and it relies on an unstable draft-spec flag.
  Rejected.

## R3. Cross-file `composes` cannot point at a `.scss` file

- **Finding** (scratch build with Vite 8.3.5 and sass 1.105.2): Vite resolves
  `composes: x from './Other.module.scss'` with postcss-modules' `FileSystemLoader`,
  which reads the target file **raw from disk** and never runs Sass on it.
  - With a `//` comment in the target, the build fails (`CssSyntaxError: Unexpected
    '/'`).
  - Without one, the build succeeds. But it pastes the **uncompiled** SCSS
    (`@use`, `@include`, `&:hover`, `shared.$wide`) into the shipped CSS under a second
    class hash (`_button_yc4jh_4` next to the compiled `_button_1q98p_2`). The composing
    element then gets the uncompiled class, and Lightning CSS minification fails with
    "Invalid media query".
- **Decision**: Remove SortLab's only cross-file `composes`
  (`FileButton.module.css` `.label { composes: button from '../atoms/Button.module.css' }`).
  The Button atom now exports `buttonClass(variant = 'secondary')`, the variant-to-class
  lookup it already uses internally, and `FileButton.tsx` puts `buttonClass()` on the
  label. The rendered class list loses only `.label`, which had no declarations of its
  own, so the label's look does not change.
  - The Button atom stays the one place buttons are styled (feature 002, FR-007), now
    through its own API.
  - Feature 002's permanent test "applies button classes only in the Button atom"
    (`tests/unit/boundaries.test.ts`) keeps its assertion. Its regex matches
    `className={…button…}` as a whole word, so the first version of this decision
    (FileButton importing `Button.module.scss` and using `styles.button`) would have
    failed it, and FR-015 forbids changing it.
  - A molecule may import an atom (`['molecules', '../atoms/Button']` is an allowed
    case).
- **Same-file `composes`** (`Button.module.scss` `.primary`/`.quiet { composes: button }`)
  is unaffected: it is resolved inside the already-compiled file. The scratch build
  confirmed it.
- **Alternatives considered**:
  - FileButton imports `../atoms/Button.module.scss` and applies `styles.button`: this
    styles a button outside the atom and fails feature 002's shared-building-blocks
    test. Rejected.
  - A `button-look` mixin in `_shared.scss` included by both stylesheets: it moves button
    styling out of the atom and ships the button rules twice. Rejected.
  - Keep `composes` and write `Button.module.scss` in plain-CSS syntax only: still ships
    a second, uncompiled copy under another hash. Fragile and invisible. Rejected.
  - A custom `css.modules.Loader` that runs Sass: new build code to maintain for one
    use. Rejected (Principle II).
  - Sass `@extend` across modules: does not work with hashed CSS-module class names.
    Rejected.
- **Guard**: the contract forbids cross-file `composes`
  ([contracts/style-rules.md §3](./contracts/style-rules.md#3-quality-checks)), and the
  `upload-focus-*` visual references cover the FileButton label in both themes.

## R4. Shared values and patterns: one namespaced partial

- **Decision**: One partial, `src/styles/_shared.scss`, loaded with
  `@use '<relative path>/styles/shared';` and referenced with the `shared.` namespace
  (`shared.$wide`, `@include shared.bordered-surface;`).
- **Rationale**: The namespace shows a reader where a name comes from without opening
  another file. A single partial holds one breakpoint and four mixins, too little to
  split. Relative paths need no build configuration.
- **Alternatives considered**: `@use … as *` (shorter, but names lose their origin);
  `loadPaths` (needs config, and editors would resolve paths differently from the
  build); several partials (`_breakpoints`, `_mixins`) behind an `_index` (more files
  than content); the deprecated `@import` (removed in Dart Sass 3).

## R5. Nesting-depth check: Stylelint with only `max-nesting-depth`

- **Decision**: Add `stylelint@17.16.0` and `postcss-scss@4.0.9` as dev dependencies
  and a `stylelint.config.js` with `customSyntax: 'postcss-scss'` and a single rule,
  `'max-nesting-depth': 2`. `npm run lint` runs Stylelint on `src/**/*.scss` after ESLint,
  so CI's existing lint step enforces it.
- **Rationale**: The scratch build confirmed that `max-nesting-depth: 2` allows a
  top-level rule plus two nested levels, which is FR-004's "three levels", and reports a
  fourth level with file, line, and column, for example
  `16:7 ✖ Too deep nesting, maximum 2`. A nested `@media` **counts as a level**: in the
  scratch build, `.main { @media … { &:focus {} } }` (3 levels) passed, and
  `.a { th { @media … { &:hover {} } } }` (4 levels, 3 of them selectors) was reported.
  FR-004 is worded to match. No current stylesheet needs a `@media` below the second
  level.
- **Alternatives considered**:
  - `stylelint-config-standard-scss`: about 100 stylistic rules that would rewrite
    working selectors and declarations and add churn unrelated to readability. Rejected.
  - A hand-written depth counter in a Vitest test: it would have to understand SCSS
    comments, strings, and interpolation, which is a parser to maintain. Rejected.

## R6. Rejecting plain stylesheets: a Vitest glob test

- **Decision**: `tests/unit/styleRules.test.ts` collects
  `import.meta.glob('/src/**/*.css')` and expects no keys. A failure lists each `.css`
  path. This is the same keys-only glob technique as the "component levels" test in
  `tests/unit/boundaries.test.ts`. The same file runs Stylelint's Node API on in-memory
  samples to prove that the depth rule fires and passes as intended (SC-008), as
  `boundaries.test.ts` does for ESLint.
- **Found during T006**: Vitest's CSS plugin (`vitest:css-disable` and
  `vitest:css-empty-post`) blanks **every** stylesheet request, `?raw` included. Plain
  stylesheets become `""` and CSS modules become a class-name `Proxy`, so the scan saw no
  text and failed with `Cannot convert a Symbol value to a string`. The fix is one
  test-only option in `vite.config.ts`, `test.css.include: [/[?&]raw(&|$)/]`, which hands
  `?raw` requests back to Vite's own raw loader. Normal stylesheet imports in component
  tests are still blanked or proxied, so class names in those tests do not change
  (the full suite passed unchanged). Reading files with `node:fs` was rejected because
  the project has no `@types/node` (as in feature 002). Moving the checks into
  Stylelint rules was rejected because T017's "only in `_shared.scss`" check needs file
  text.
- **Alternatives considered**: An ESLint `no-restricted-imports` pattern on `\.css$`
  would only catch imported files and would collide with the per-level
  `no-restricted-imports` entries in `eslint.boundaries.js` (flat config keeps only the
  last options per file). Stylelint cannot reject a file because of its extension.
  Rejected.

## R7. Formatting

- **Decision**: No change. Prettier 3.9 formats `.scss` natively, and the
  `npm run format` and `format:check` scripts (`prettier --write/--check .`) already
  include them. `.prettierignore` does not exclude `src/`.

## R8. Proving "no visible change"

- **Decision**: Use three layers:
  1. **Pixels**: the existing permanent visual check (8 references × 2 platforms) must
     pass with the references untouched (FR-014).
  2. **Compiled-CSS review**: build before and after, replace hashed class names with
     their local names, and diff
     ([quickstart §3](./quickstart.md#3-compiled-css-equivalence-review)). The visual
     check cannot reach some states: hover, disabled, `aria-invalid`, reduced motion,
     and the wide-screen summary row at non-reference widths. The diff covers those
     states for every selector.
  3. **Behavior**: the full unit, component, e2e, and accessibility suites.
- **Allowed differences** in the compiled-CSS diff (anything else is a defect):
  - Comments are dropped.
  - A rule's declarations may be reordered, provided no two of the reordered
    declarations set the same property (or a shorthand and one of its longhands).
  - A `@media` block may be split per selector (PageLayout), provided each overridden
    rule still follows its base rule.
  - Order may change between rules whose selectors match different elements.
  - FileButton's `.label` class disappears (R3).
- **Found in the T016 review**:
  - **Sass rewrites `hsl()` of `var()` values.** `hsl(var(--h) var(--s) var(--l))`
    compiles to the comma form `hsl(var(--h), var(--s), var(--l))`, also inside
    `linear-gradient()` and with an alpha value. The color is the same, but the value
    text changed, so it counts as a defect. Interpolating the arguments,
    `hsl(#{var(--h) var(--s) var(--l)})`, keeps the CSS exactly as written. Legend's
    four gradient stops use this, with a comment explaining it
    ([contract §2 rule 8](./contracts/style-rules.md#2-authoring-rules)).
  - **The Button atom's rules moved earlier in the bundle.** Since T007, FileButton
    imports `atoms/Button`, so `Button.module.scss` is loaded earlier. Its rules now sit
    before `.muted`, `.panel`, `.divider`, `.field`, `.fieldHeader`, `.error`,
    `.textarea`, `.slider`, and `.fieldValue`. None of those classes is applied to a
    button or to FileButton's label (no `<Button>` passes a `className`), so this is an
    allowed reordering of rules that match different elements.
- **Rationale**: Pixels prove the reference states. The selector-level diff proves every
  other state without adding new screenshots, which would be costly in CI time and
  reference maintenance.

## R9. Class-name hashes change; nothing depends on them

- **Finding**: Vite's default scoped name is `_[local]_[hash]_[line]`, and the hash is
  computed from file content. Renaming and nesting change every hash and some line
  numbers. Tests select by role, label, and test id, never by hashed class, and the bar
  renderer reads only `:root` custom properties (`src/render/barRenderer.ts:76`), so no
  test or runtime code depends on the hashes.

## R10. Size and performance budget

- **Baseline** (current `dist/`, to be re-measured on the branch before conversion):
  CSS 8,022 B raw / 2,353 B gzipped.
- **Expected change**:
  - About −40 B for FileButton's empty `.label` rule.
  - About +40 B for PageLayout's second `@media` block.
  - Mixins emit exactly the declarations they replace, so no net change.
  - Overall within ±2%, against a budget of +5% (FR-016, SC-007).
- **Runtime**: unchanged, because the browser receives ordinary CSS, as before. Feature
  001's frame-rate and Lighthouse checks are re-run as in feature 002.
