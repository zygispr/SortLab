# Contract: Style Authoring Rules

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

The interface this feature gives contributors: the shared partial's API, the authoring
rules, the quality checks with their messages, and the README section. SortLab exposes
no external API, so the stylesheet conventions are its contract.

## 1. Shared partial (`src/styles/_shared.scss`)

The partial emits no CSS on its own. Every item below emits exactly the declarations
listed, so including one never adds rules to the shipped styles (FR-008).

| Item | Signature | Emits |
|------|-----------|-------|
| Wide-screen breakpoint | `$wide: 1024px` | — (used as `@media (min-width: shared.$wide)`) |
| Bordered surface | `@mixin bordered-surface` | `border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface);` |
| Bare list | `@mixin bare-list` | `margin: 0; padding: 0; list-style: none;` |
| Wrapping row | `@mixin wrap-row` | `display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2);` (Revised 2026-10-29 (feature 001, sound prompt removed): the `$display` parameter was dropped with its only `inline-flex` use) |
| Focus ring | `@mixin focus-ring` | `outline: var(--focus-width) solid var(--color-focus); outline-offset: 2px;` |

Each item has a one-line `///` comment saying what it is for and where it is used.

**Usage** (namespaced, never `as *`):

```scss
@use '../../styles/shared';

.button {
  @include shared.bordered-surface;
}
```

## 2. Authoring rules

1. Every stylesheet under `src/` is `.scss`. Component stylesheets are
   `<Component>.module.scss` next to the component. Partials start with `_` and live in
   `src/styles/`.
2. Load shared items with `@use` and the `shared.` namespace. Do not use `@import`
   (deprecated in Sass) or `additionalData` injection.
3. Nest an element's states (`&:hover`, `&:disabled`, `&[aria-…]`, `&::before`), its
   `@media` changes, and its directly related children or siblings under the element's
   rule. Do not nest to invent a selector that did not exist: the compiled selectors
   must match what the element needs, not the source's indentation.
4. Nesting depth is at most 3 levels (a top-level rule plus two nested ones). A nested
   `@media` counts as a level, so `.table { th { @media … { &:hover {} } } }` is too
   deep.
5. Runtime values (theme colors, spacing, radius, fonts, bar-color parameters) stay CSS
   custom properties in `tokens.scss`. A Sass `$variable` is only for a value that never
   changes while the app runs and that a media query needs, or that is otherwise used in
   more than one file.
6. `composes:` is allowed only within the same file (`composes: button;`). To reuse
   another component's look, use that component, or a class helper it exports (for
   example `buttonClass()` from the Button atom). Do not import its stylesheet.
7. A group of three or more declarations used in three or more places becomes a mixin in
   `_shared.scss`. Fewer repeats stay inline.
8. When `hsl()`, `rgb()`, or a similar color function takes `var()` arguments, interpolate
   them: `hsl(#{var(--h) var(--s) var(--l)})`. Without interpolation, Sass rewrites the
   space-separated syntax into the comma form (research R8).

## 3. Quality checks

| Check | Where | Fails when | Message (contains) |
|-------|-------|------------|--------------------|
| Plain stylesheets | `tests/unit/styleRules.test.ts` → `no plain stylesheets` | any `src/**/*.css` exists | `Plain stylesheets are not allowed (feature 003, FR-001); rename to .scss:` followed by the paths |
| Cross-file composes | `tests/unit/styleRules.test.ts` → `no cross-file composes` | any `src/**/*.scss` contains `composes:` … `from` | `composes from another file ships uncompiled SCSS (feature 003, research R3); reuse the component or a class helper it exports (e.g. buttonClass()) instead:` followed by the paths |
| Nesting depth | `npm run lint` → `stylelint "src/**/*.scss" --max-warnings 0` | a rule nested deeper than 3 levels | Stylelint: `<file>` `<line>:<col> ✖ Too deep nesting, maximum 2  max-nesting-depth` |
| Depth rule proof | `tests/unit/styleRules.test.ts` → `nesting depth` | the config stops rejecting a 4-level sample (including one whose fourth level is a nested `@media`), or starts rejecting a 3-level sample (including one with a nested `@media`) | — |
| Formatting | `npm run format:check` | an `.scss` file is not Prettier-formatted | Prettier: `[warn] <file>` |

`stylelint.config.js` (repo root):

```js
export default {
  customSyntax: 'postcss-scss',
  rules: { 'max-nesting-depth': 2 },
};
```

The `package.json` `lint` script becomes
`eslint . --max-warnings 0 && stylelint "src/**/*.scss" --max-warnings 0`. CI's existing
`npm run lint` step then covers it. During the conversion, T004 added
`--allow-empty-input` so lint stayed green before the first `.scss` existed. T026 removed
it, so a glob that matches nothing fails instead of passing silently.

`tests/unit/styleRules.test.ts` runs in the default jsdom environment. The shared
`tests/setup.ts` patches browser globals, so it cannot load under `node`. Stylelint's
Node API was confirmed to work under jsdom, as ESLint's does in `boundaries.test.ts`.

The test:

- reads the real config with `stylelint.lint({ code, codeFilename, configFile: 'stylelint.config.js' })`, so it needs no import or `.d.ts`
- uses `import.meta.glob` keys for the file list
- uses `import.meta.glob<string>('/src/**/*.{css,scss}', { query: '?raw', import: 'default', eager: true })` for the `composes` scan. This works only because `vite.config.ts` sets `test.css.include: [/[?&]raw(&|$)/]`; without it, Vitest blanks stylesheet sources (research R6).

## 4. Compiled output

The shipped CSS stays ordinary CSS with no Sass syntax. Compared with the build before
the conversion, it may differ only as listed in
[research R8](../research.md#r8-proving-no-visible-change). Hashed class names change and
nothing depends on them (R9).

## 5. README section

A new "Styles" section after "Component structure" covers:

- one `.module.scss` per component, plus `tokens.scss`, `global.scss`, and the
  `_shared.scss` partial in `src/styles/`
- the table from §1 (name and purpose)
- rules 2–7 from §2, in short form
- which values must stay runtime tokens, and why (theme switching and the bar
  renderer)
- the nesting limit and the command that checks it

It also updates the "Component structure" sentence "Importing a component includes
importing its CSS module" to say "CSS module (`.module.scss`)".
