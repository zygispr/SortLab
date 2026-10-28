# SortLab Constitution

## Core Principles

### I. Code Quality

- Code MUST be readable first: clear names, small focused functions, and one
  responsibility per module.
- Every change MUST pass the project's linter, formatter, and type checker with zero
  errors before merge. Warnings MUST NOT be suppressed without an inline justification.
- Dead code, commented-out code, and unused dependencies MUST be removed, not left behind.
- Comments explain *why*, not *what*; public interfaces MUST document their contract
  (inputs, outputs, errors).
- Duplication is tolerated once; on the third occurrence it MUST be extracted.

**Rationale**: Code is read far more often than it is written. Consistent, self-explanatory
code lowers the cost of every future change.

### II. Simplicity Over Complexity

- The simplest solution that meets the current, stated requirement MUST be chosen (YAGNI).
- New dependencies, abstractions, layers, or patterns MUST be justified in the feature plan
  by a concrete present need, not a speculative future one.
- Prefer standard library and platform features over third-party packages when they are
  adequate.
- Any deviation that adds complexity MUST be recorded in the plan's Complexity Tracking
  table with the simpler alternative that was rejected and why.

**Rationale**: Every abstraction has a maintenance cost. Simple systems are easier to test,
optimize, scale, and hand over.

### III. Testing Discipline (NON-NEGOTIABLE)

- Tests MUST be written alongside or before the code they verify; a feature is not done
  until its acceptance scenarios are covered by automated tests.
- Core logic (algorithms, data transformations, state management) MUST have unit tests
  covering normal cases, edge cases (empty, single element, duplicates, already sorted,
  reverse sorted, large inputs), and error paths.
- User-facing flows MUST have at least one integration or end-to-end test per user story.
- Bug fixes MUST include a regression test that fails before the fix and passes after.
- The full test suite MUST pass before merge; flaky tests MUST be fixed or quarantined
  with a tracked issue, never ignored.

**Rationale**: Tests are the executable specification. They make refactoring safe and keep
correctness from silently eroding.

### IV. User Experience First

- Every feature MUST start from a user story with clear acceptance criteria describing what
  the user sees and does.
- Interfaces MUST be consistent: shared components, terminology, spacing, and interaction
  patterns are reused rather than reinvented.
- Every user action MUST give visible feedback; loading, empty, and error states MUST be
  designed explicitly, and error messages MUST tell the user what happened and what to do.
- Interfaces MUST be accessible: keyboard operable, sufficient color contrast (WCAG 2.1 AA),
  meaningful labels, and no information conveyed by color alone.
- Layouts MUST work across supported screen sizes without horizontal scrolling.

**Rationale**: Users judge the product by what they experience, not by its internals.
Predictable, accessible, responsive interfaces build trust.

### V. Performance by Design

- Each feature plan MUST state measurable performance goals. Unless a plan justifies
  otherwise, user-facing defaults are: visible response to input within 100 ms, animations
  at a steady 60 fps, and initial load interactive within 2 s on a mid-range device.
- Algorithmic complexity MUST be considered and documented for core operations; avoid
  accidental quadratic work in hot paths.
- Performance claims MUST be backed by measurement (profiling or benchmarks), not
  assumption. Optimization without a measured bottleneck is prohibited (see Principle II).
- Regressions beyond the stated budgets MUST block merge until fixed or the budget is
  formally revised in the plan.

**Rationale**: Performance is a feature users feel directly. Setting budgets up front is
cheaper than retrofitting speed later.

### VI. Scalability

- Designs MUST state the expected scale (data size, concurrent users, or workload) they
  support and degrade gracefully beyond it rather than failing abruptly.
- Components MUST have clear boundaries and minimal shared mutable state so they can be
  extended or replaced independently.
- Long-running or heavy work MUST NOT block the user interface or request path; it MUST
  be chunked, cancellable, or moved off the main thread.
- Scalability work MUST target the stated scale, not hypothetical extremes (see
  Principle II).

**Rationale**: Clear limits and loosely coupled components let the system grow with real
demand without rewrites.

## Quality Gates

A change MAY be merged only when all of the following hold:

1. Lint, format, and type checks pass with zero errors.
2. The full automated test suite passes, including new tests for the change.
3. Acceptance scenarios from the spec are demonstrably met.
4. Performance budgets from the plan are met, or a measured exception is documented.
5. UI changes have been checked for loading, empty, error, and accessibility states.
6. Any added complexity is justified in the plan's Complexity Tracking table.

## Development Workflow

- Work follows the Spec Kit flow: specify → clarify (as needed) → plan → tasks → implement.
- Each plan MUST include a Constitution Check that evaluates the design against every
  principle above; violations MUST be resolved or explicitly justified before tasks are
  generated.
- Changes are delivered in small, reviewable increments, each leaving the main branch in a
  working state.
- Every change is reviewed (by a person or an automated reviewer) against this
  constitution before merge.

## Governance

- This constitution supersedes all other development practices and conventions in the
  project. Where guidance conflicts, the constitution wins.
- Amendments MUST be made through `/speckit-constitution`, documented with a rationale,
  and accompanied by any needed updates to dependent plans or workflows.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle,
  MINOR for adding a principle or materially expanding guidance, PATCH for clarifications
  and wording fixes.
- Compliance is verified during plan review (Constitution Check) and code review; any
  unresolved violation blocks merge.

**Version**: 1.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
