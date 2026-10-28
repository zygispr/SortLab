# Feature Specification: Atomic Design Component Structure

**Feature Branch**: `002-atomic-design-components`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "restructure components to follow atomic design"

## Overview

SortLab's interface is built from about fifteen components kept side by side in one flat
collection. Small building blocks (buttons, labelled sliders) sit next to whole panels
(Data, Playback, Run summary), and the same control styling is written out by hand in
several places: ten buttons across six components each apply the shared button look
themselves. This feature reorganizes the interface into the five levels of atomic design
(atoms, molecules, organisms, templates, pages) so contributors can find, reuse, and
extend parts of the interface predictably. End users see no change.

The "users" of this feature are the people who maintain and extend SortLab.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find any part of the interface by its level (Priority: P1)

A contributor wants to change how a control looks or behaves. They open the component
collection and see it grouped into atoms, molecules, organisms, templates, and pages. From
the control's role (a single button, a labelled slider, the whole Playback panel, the page
layout) they know which level to look in, and the component is there. The app behaves and
looks exactly as before.

**Why this priority**: This is the restructuring itself. Without it there is nothing to
reuse or enforce, and on its own it already makes the codebase easier to navigate.

**Independent Test**: Every interface component sits in exactly one level, the
classification rules are documented, and the full existing test suite (unit, component,
end-to-end, accessibility) passes with no change to what it asserts about behavior.

**Acceptance Scenarios**:

1. **Given** the restructured codebase, **When** a contributor lists the interface
   components, **Then** each one belongs to exactly one of the five levels and none sits
   outside the level structure.
2. **Given** an on-screen control (for example the Speed slider or the Run summary
   table), **When** a contributor applies the documented classification rules, **Then**
   they arrive at the level and component that renders it.
3. **Given** the restructured app, **When** it is used in any way covered by the
   existing validation guide, **Then** every screen, control, label, announcement,
   keyboard shortcut, sound, and saved setting behaves exactly as before.

---

### User Story 2 - Reuse shared building blocks instead of re-creating them (Priority: P2)

A contributor adds a new control, such as another button in the Playback panel or another
labelled slider. Instead of copying styling and markup from a neighboring component, they
use the existing atom or molecule, which already has the right look, focus outline,
disabled state, and accessible labelling.

**Why this priority**: Shared building blocks are the main payoff of atomic design: they
keep the interface consistent (Constitution Principle IV) and remove duplication
(Principle I). They depend on the levels from Story 1 existing.

**Independent Test**: Each repeated visual pattern (button and its variants, labelled
slider, labelled panel region) is defined once at the lowest fitting level, and no
higher-level component re-creates it.

**Acceptance Scenarios**:

1. **Given** the restructured codebase, **When** a contributor searches for places that
   style a button directly, **Then** they find only the button atom; every other button
   in the interface uses that atom.
2. **Given** the labelled sliders (Dataset size, Speed, Volume), **When** a contributor
   inspects them, **Then** all three use one shared labelled-slider building block.
3. **Given** a new button added through the atom, **When** it is rendered, **Then** it has
   the same look, visible focus outline, and dimmed disabled state as every existing
   button, without extra styling.

---

### User Story 3 - Keep the structure from eroding (Priority: P3)

A contributor accidentally makes an atom depend on a whole panel, or makes a small
building block read the app's state directly. The project's standard quality checks catch
it before merge and say which rule was broken.

**Why this priority**: Without enforcement the structure drifts back to a flat
collection. It builds on Stories 1 and 2 and adds protection, not new structure.

**Independent Test**: Introducing a deliberate violation of each dependency rule makes the
standard quality checks fail with a message naming the rule; removing it makes them pass.

**Acceptance Scenarios**:

1. **Given** an atom, **When** a contributor makes it depend on a molecule, organism,
   template, or page, **Then** the quality checks fail and name the broken rule.
2. **Given** an atom or molecule, **When** a contributor makes it read or change the
   app's shared state, **Then** the quality checks fail.
3. **Given** a codebase that follows all rules, **When** the quality checks run, **Then**
   they pass with no new warnings.

---

### Edge Cases

- **A component that could fit two levels**: classify by composition and state access,
  not size. A component that reads or changes app state is an organism or higher, even if
  it is small (for example the screen-reader announcement area or the first-visit sound
  prompt).
- **A self-contained panel with no smaller parts** (for example the bar-chart canvas):
  it is still an organism because it is a distinct, state-connected section of the
  interface.
- **Shared styling and formatting helpers** that are not components (the shared control
  styles, the time formatter): they live with the lowest level that uses them, or in a
  shared, non-level location, and never count as a level.
- **Page-wide behaviors that render nothing** (the keyboard shortcuts): not components,
  so outside the levels; the page uses them.
- **The page layout regions** (labelled sections and the one- or two-column arrangement):
  they form the template; the single SortLab screen that fills them is the page.
- **A building block needed by only one component today**: it still gets its own level
  when it is a self-contained piece of interface; splitting further than that is not
  required.

## Requirements *(mandatory)*

### Functional Requirements

**Structure**

- **FR-001**: Every interface component MUST belong to exactly one of five levels:
  atoms, molecules, organisms, templates, pages.
- **FR-002**: The levels MUST be visible in the codebase's organization, so a component's
  level can be told from where it lives.
- **FR-003**: Levels MUST follow these rules:
  - **Atoms**: the smallest reusable elements (for example a button, a slider input, a
    visually hidden label). They depend on no other component.
  - **Molecules**: small groups of atoms that work as one unit (for example a labelled
    slider with its value shown). They depend only on atoms.
  - **Organisms**: distinct sections of the interface (for example the Data panel, the
    Playback bar, the Run summary). They may depend on atoms, molecules, and other
    organisms.
  - **Templates**: page layout: the labelled regions and their arrangement on narrow and
    wide screens, with no app content of their own.
  - **Pages**: the SortLab screen, which places organisms into the template and wires up
    page-wide behavior (keyboard shortcuts, pausing when the tab is hidden, reduced
    motion).
- **FR-004**: Atoms and molecules MUST NOT read or change the app's shared state; they
  receive everything they show and report every user action through their inputs and
  outputs. Only organisms, templates, and pages may connect to shared state.
- **FR-005**: A component MUST NOT depend on a component at a higher level.
- **FR-006**: The classification rules (FR-003 to FR-005) and the list of components per
  level MUST be documented for contributors, including how to decide the level of a new
  component.

**Shared building blocks**

- **FR-007**: Buttons MUST be provided by one button atom with the variants the interface
  already uses (primary, standard, and the low-emphasis "Not now" style); no other
  component may style a button directly.
- **FR-008**: The labelled slider (label, visible value, spoken value) MUST be one
  molecule used by Dataset size, Speed, and Volume.
- **FR-009**: The labelled page region (a section named by its heading, with the heading
  optionally hidden visually) MUST be defined once, at the template level.
- **FR-010**: Any other visual pattern that appears three or more times after the
  restructuring MUST be extracted into the lowest fitting level (Constitution
  Principle I).

**No change for end users**

- **FR-011**: The restructuring MUST NOT change anything an end user can see, hear, or
  do: layout at every supported width, colors in both themes, text, accessible names,
  live announcements, keyboard behavior, focus order, sound, and saved settings.
- **FR-012**: The existing automated tests MUST keep verifying the same behavior; tests
  may change only where they refer to a component's location or name.
- **FR-013**: The performance budgets of the sorting visualizer (steady animation,
  control response, load time) MUST still be met.

**Enforcement**

- **FR-014**: The standard quality checks MUST fail when a component depends on a higher
  level (FR-005) or when an atom or molecule connects to shared state (FR-004), with a
  message that names the rule.
- **FR-015**: Each atom and molecule MUST have its own automated test covering its
  inputs, outputs, and accessible labelling.

### Key Entities

- **Level**: one of atoms, molecules, organisms, templates, pages, with the rules for
  what it may contain and depend on.
- **Component**: a piece of the interface with exactly one level, the components it is
  built from, and whether it connects to shared state.
- **Shared building block**: an atom or molecule reused by higher levels (button,
  labelled slider) that carries the common look and accessibility behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of interface components are assigned to exactly one level, and none
  remain outside the level structure.
- **SC-002**: Zero end-user-visible differences: the full existing test suite passes, and
  side-by-side screenshots of the screen before and after, at the narrowest and widest
  supported widths in both light and dark themes, show no difference.
- **SC-003**: Zero dependency-rule violations in the finished codebase, and a deliberately
  introduced violation of each rule is caught by the standard quality checks every time.
- **SC-004**: Buttons are styled in exactly one place (down from six components today),
  and the labelled slider is defined in exactly one place.
- **SC-005**: Using only the documented rules, a contributor can identify the level and
  component for each on-screen control in at most two lookups.
- **SC-006**: The app still meets its performance budgets: interactive in under 2 seconds
  on a mid-range phone, steady animation with no frames over 50 ms at maximum speed, and
  controls responding within 100 ms; the size of the downloaded app grows by no more than
  2%.

## Assumptions

- This is an internal restructuring only: no new features, controls, or visual changes.
- The five standard atomic design levels are used as named, with no custom extra levels.
- The single SortLab screen is the only page; the template is its region layout.
- No component catalog or showcase tool is added; that would be a new dependency, which
  Constitution Principle II rules out without a present need. It can be a separate
  feature later.
- No new runtime dependencies are added.
- The restructuring covers interface components and their styles only; algorithms, step
  playback, rendering logic, sound, data parsing, and the app's shared state logic
  are unchanged.
- The existing component, end-to-end, and accessibility tests are the main safety net
  that behavior is unchanged.
