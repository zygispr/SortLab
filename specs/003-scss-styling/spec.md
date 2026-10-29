# Feature Specification: SCSS Styling

**Feature Branch**: `003-scss-styling`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Use scss instead of css for styling for easier reading experience"

## Overview

SortLab's look is defined in 19 plain stylesheets: two shared ones (design tokens and
global rules) and one per component across the atomic design levels, about 540 lines in
all. Plain stylesheets make a reader piece related rules together by hand: a control's
hover, focus, and disabled states are written as separate top-level rules away from the
control itself; the wide-screen layout rule sits apart from the layout it changes; and
small patterns such as "wrapping row of items with a small gap" are written out again in
each place they are needed.

This feature moves all styling to SCSS so that each component's styles read as one
block: states and screen-size changes are nested under the element they change, and
repeated patterns and shared values such as the wide-screen breakpoint are named once and
reused. End users see no change.

The "users" of this feature are the people who maintain and extend SortLab.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a component's styles as one block (Priority: P1)

A contributor opens the stylesheet of a component, for example the Button atom or the
page layout template, to understand or change how it looks. Everything about one element
is together: its base look, then its hover, focus, and disabled states, then how it
changes on wide screens, all nested under that element. They do not have to scan the
file for other rules that also target it. The app looks and behaves exactly as before.

**Why this priority**: This is the conversion itself and the readability gain the
request is about. On its own it already delivers the value; Stories 2 and 3 refine and
protect it.

**Independent Test**: Every stylesheet in the project is in SCSS, the rules for each
element's states and screen-size changes are nested under that element, and the full
existing test suite, including the pixel-for-pixel visual check, passes unchanged.

**Acceptance Scenarios**:

1. **Given** the converted codebase, **When** a contributor lists the project's
   stylesheets, **Then** every one is an SCSS file and no plain stylesheet remains.
2. **Given** a component whose element has interaction states (for example the Button
   atom with hover and disabled), **When** a contributor reads its stylesheet, **Then**
   those states are nested under the element's own rule rather than written as separate
   top-level rules.
3. **Given** a rule that changes with screen size or a user preference (for example the
   two-column layout on wide screens), **When** a contributor reads it, **Then** the
   change is nested inside the rule it modifies.
4. **Given** the converted app, **When** it is used in any way covered by the existing
   validation guides, **Then** every screen, color in both themes, layout at every
   supported width, focus outline, animation, and reduced-motion behavior is exactly as
   before.

---

### User Story 2 - Name shared values and patterns once (Priority: P2)

A contributor needs the wide-screen breakpoint, or another wrapping row of controls with
a small gap, or the standard focus outline. Instead of copying a literal width or a set
of declarations from a neighboring stylesheet, they use the named shared value or
pattern, which every existing use already relies on.

**Why this priority**: Naming repeated values and patterns removes duplication
(Constitution Principle I) and keeps the interface consistent (Principle IV). It builds
on the SCSS files from Story 1.

**Independent Test**: Each value or group of declarations that is written out in three
or more places is defined once in a shared location and every use refers to it; no
stylesheet repeats it literally.

**Acceptance Scenarios**:

1. **Given** the converted codebase, **When** a contributor searches the stylesheets for
   the wide-screen breakpoint width, **Then** it appears in exactly one place, as a named
   value that layout rules use.
2. **Given** a group of declarations that occurs three or more times (for example a
   wrapping row of items with a small gap), **When** a contributor inspects its uses,
   **Then** all of them use one shared, named pattern.
3. **Given** the shared values and patterns, **When** a contributor wants to use them in
   a component's stylesheet, **Then** they can include them with a single reference
   without copying anything.

---

### User Story 3 - Keep the styling readable and consistent (Priority: P3)

A contributor adds a new component and writes its styles. The project's standard quality
checks keep the new stylesheet consistent with the rest: it is formatted like the others,
plain stylesheets are rejected, and nesting stays shallow enough to read. The
documentation tells them how styles are organized and where shared values live.

**Why this priority**: Without guidance and checks the styling drifts back to mixed
formats or deeply nested rules that are harder to read than before. It protects
Stories 1 and 2 rather than adding to them.

**Independent Test**: Adding a plain stylesheet, or nesting deeper than the documented
limit, makes the standard quality checks fail with a message naming the problem;
removing it makes them pass.

**Acceptance Scenarios**:

1. **Given** the converted codebase, **When** a contributor adds a plain (non-SCSS)
   stylesheet for a component, **Then** the quality checks fail and say why.
2. **Given** a component stylesheet, **When** its selectors are nested more than three
   levels deep, **Then** the quality checks fail and name the file and rule.
3. **Given** an SCSS file with inconsistent formatting, **When** the format check runs,
   **Then** it reports the file, and the project's formatter fixes it.
4. **Given** a new contributor, **When** they read the project README, **Then** they find
   how stylesheets are organized, where the shared values and patterns live, and the
   nesting limit.

---

### Edge Cases

- **Design tokens that change at runtime**: colors and other tokens that switch with the
  light or dark theme, and the bar-color values that the bar-chart renderer reads while
  the app runs, MUST stay available to the running page exactly as now. SCSS's own
  named values are fixed when the styles are built and cannot replace them; they are
  used only for values that never change while the app runs (such as the breakpoint).
- **Global rules for plain elements** (focus outline for every focusable element, dimmed
  disabled controls, reduced motion): these stay page-wide; converting them must not
  change which elements they apply to or their order of precedence.
- **Selectors that depend on a neighboring element** (for example the hidden file input
  whose focus shows on the visible label next to it): the relationship must be kept
  exactly when nested.
- **Order-sensitive rules**: where a later rule deliberately overrides an earlier one,
  nesting must not change which one wins.
- **A pattern used only once or twice**: it stays inline in its component; it is not
  extracted (Constitution Principle I tolerates duplication until the third occurrence).
  The one exception is two copies that must stay identical by design, so that changing
  one without the other would be a defect (the focus outline, which the file picker's
  label reproduces exactly). These may be named once, because they are one fact, not two
  similar texts.
- **Component-scoped class names**: each component's class names must stay private to
  that component after conversion, as they are now.
- **Shipped styles**: the build produces ordinary styles for the browser; no SCSS
  reaches end users, and the converted styles must not add unused rules.

## Requirements *(mandatory)*

### Functional Requirements

**Conversion**

- **FR-001**: Every project stylesheet (the shared design tokens, the global rules, and
  every component's stylesheet at every atomic design level) MUST be authored in SCSS;
  no plain stylesheet may remain in the project's source.
- **FR-002**: Each component MUST keep exactly one stylesheet of its own, next to the
  component, with class names scoped to that component as today.
- **FR-003**: Within a stylesheet, an element's interaction states (hover, focus,
  disabled and similar), its screen-size and user-preference changes, and its directly
  related child or sibling elements MUST be nested under that element's rule when that
  keeps all rules about one element together.
- **FR-004**: Rules MUST NOT be nested more than three levels deep. A screen-size or
  user-preference block nested inside a rule counts as one of the three levels.

**Shared values and patterns**

- **FR-005**: Values that never change while the app runs and are used by more than one
  stylesheet (at least the wide-screen breakpoint) MUST be defined once as named values
  in a shared location and used by name everywhere.
- **FR-006**: Any group of declarations that appears three or more times after the
  conversion MUST be defined once as a named, reusable pattern in a shared location and
  used by name everywhere (Constitution Principle I).
- **FR-007**: Theme colors, spacing, and every other design token the running page reads
  MUST remain runtime values with the same names and values, so theme switching and the
  bar-chart renderer keep working unchanged.
- **FR-008**: Shared values and patterns MUST be usable from any component's stylesheet
  without copying, and using them MUST NOT emit duplicated rules into the shipped styles.

**Quality and documentation**

- **FR-009**: The project's formatter and format check MUST cover SCSS files.
- **FR-010**: The project's standard quality checks MUST fail when a plain stylesheet is
  added to the source, and when the nesting limit in FR-004 is exceeded, naming the file.
- **FR-011**: Existing quality rules that refer to component stylesheets (such as the
  rule that lets a component import its own stylesheet but not another component's)
  MUST keep working for SCSS stylesheets.
- **FR-012**: The project README MUST document how styles are organized: one SCSS file
  per component, where the shared values and patterns live and how to use them, which
  values must stay runtime design tokens, and the nesting limit.

**No change for end users**

- **FR-013**: The conversion MUST NOT change anything an end user can see, hear, or do:
  layout at every supported width, colors in both themes, focus outlines, disabled
  states, animation, and reduced-motion behavior.
- **FR-014**: The existing permanent visual check (full-page and Data panel reference
  images in light and dark themes) MUST pass with no pixel difference and with its
  reference images unchanged.
- **FR-015**: The existing automated tests MUST keep verifying the same behavior; tests
  may change only where they refer to a stylesheet's file name.
- **FR-016**: The performance budgets of the sorting visualizer (steady animation,
  control response, load time) MUST still be met, and the size of the shipped styles
  MUST NOT grow by more than 5% compared with before the conversion.

### Key Entities

- **Component stylesheet**: the SCSS file that styles one component; lives next to it,
  its class names are private to it, and it may use the shared values and patterns.
- **Shared style values**: named values fixed at build time, such as the wide-screen
  breakpoint, defined once and used by name.
- **Shared style patterns**: named groups of declarations used in three or more places,
  defined once and included by name.
- **Design tokens**: runtime values (colors per theme, spacing, radius, font, bar-color
  parameters) that the running page and the bar-chart renderer read; unchanged in name
  and value.
- **Global rules**: page-wide styles for plain elements (focus outline, disabled
  controls, reduced motion).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the project's stylesheets are SCSS; zero plain stylesheets remain
  in the source.
- **SC-002**: The permanent visual check passes with zero pixel difference across all
  8 reference images, which are left unchanged.
- **SC-003**: The full automated test suite (unit, component, end-to-end, accessibility)
  passes, with test changes limited to stylesheet file names.
- **SC-004**: In every component stylesheet, every rule that targets an element's state
  or a screen-size change is found nested under that element's rule, and a reviewer
  finds no separate top-level rule for the same element in the same file. The page-wide
  global rules are exempt where nesting would change a selector list, for example the
  disabled-controls rule, which also covers `option` elements, unlike the rule above it.
- **SC-005**: The wide-screen breakpoint and every declaration group used three or more
  times each appear exactly once in the stylesheets as a definition.
- **SC-006**: A contributor can find every style rule that affects a given element in
  one place in its component's stylesheet, in under 30 seconds, for any element picked
  at random by a reviewer.
- **SC-007**: The shipped styles grow by no more than 5% in size, and the visualizer's
  animation, response, and load-time budgets are still met.
- **SC-008**: Introducing a plain stylesheet or a four-level nested selector makes the
  quality checks fail; removing it makes them pass.

## Assumptions

- "SCSS" means the SCSS syntax of Sass (brace-and-semicolon syntax), not the older
  indented Sass syntax, as the request names SCSS.
- The goal is readability for contributors; there is no change to the design, colors,
  or layout, and no new visual features.
- All 19 existing stylesheets are converted in this feature, not only new ones, so the
  codebase uses one styling format throughout.
- Design tokens stay runtime values (they power theme switching and the bar-chart
  renderer); SCSS named values are used only for build-time constants such as the
  breakpoint.
- The existing component-scoped stylesheet approach is kept; only the authoring format
  changes.
- The nesting limit of three levels is a common readability guideline for SCSS and is
  adopted as the project default.
- Adding SCSS support introduces a new build-time dependency. Constitution Principle II
  requires the plan to justify it and record it in the Complexity Tracking table, with
  plain CSS's own nesting as the simpler alternative weighed against the request's
  explicit choice of SCSS and its named values and patterns.
- The pixel-for-pixel visual check, reference images, and validation guides from
  features 001 and 002 are reused as the guard against visible change.
