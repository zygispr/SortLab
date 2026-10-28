# Quickstart & Validation Guide: Sorting Algorithm Visualizer

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

How to run the app and prove each user story works. Implementation details belong in
`tasks.md`; this guide only lists what to run and what to expect.

## Prerequisites

- Node.js 24 LTS and npm 11
- For end-to-end tests: Playwright browsers (`npx playwright install`)

## Setup and run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build into dist/
npm run preview      # serve the production build
```

## Quality gates (all must pass before merge)

```bash
npm run lint         # ESLint, zero errors
npm run format:check # Prettier
npm run typecheck    # tsc --noEmit (strict)
npm test             # Vitest unit + component tests
npm run test:e2e     # Playwright end-to-end + axe accessibility checks
```

## Validation scenarios

### Story 1 – Watch a random dataset get sorted (P1)

1. Open the app. **Expect**: 50 colored bars and "Bubble Sort" selected, with no clicks
   needed (FR-001, SC-001).
2. Set size to 200, press **Generate**. **Expect**: 200 new bars.
3. Press **Start**. **Expect**: highlighted bars with ▲/● markers move, and counters rise.
4. Press **Space**. **Expect**: paused. Press **→** twice. **Expect**: exactly two steps
   are applied, counters change, and the live region announces each step. Press **←**.
   **Expect**: the last step is undone exactly.
5. Drag **Speed** to the maximum, then resume. **Expect**: smooth animation, and the run
   finishes with the sweep and "Sorted with Bubble Sort".
6. Switch to another tab mid-run, then return. **Expect**: the run is paused.

Automated: `tests/e2e/visualize.spec.ts`; correctness of all 20 algorithms in
`tests/unit/algorithms.test.ts` (SC-002).

### Story 2 – Re-run the same data with a different algorithm (P2)

1. After Story 1 finishes, select **Merge Sort** and press **Start**. **Expect**: bars first
   return to the original order, then Merge Sort runs.
2. **Expect**: the run summary lists both runs with comparisons, moves, and time.
3. Press **Generate**. **Expect**: the summary clears.

Automated: `tests/e2e/rerun.spec.ts`.

### Story 3 – Sort my own uploaded dataset (P3)

Sample files are in `tests/fixtures/`:

| File | Expected result |
|------|-----------------|
| `valid-mixed.csv` (negatives, decimals) | Loads; Counting and Radix sorts disabled with a reason |
| `valid-1000.txt` | Loads in under 1 s (SC-005) |
| `header-row.csv` | Error naming line 1 with the header hint; previous dataset kept |
| `too-many.txt` (1,001 values) | "Too many numbers: found 1001, the maximum is 1,000." |
| `image.png` | "Please choose a .txt or .csv file." |

Also paste `5, 3, 8, 1` and press **Use these numbers**. **Expect**: 4 bars in that order.

Automated: `tests/unit/parse.test.ts` (every rule in
[contracts/dataset-input-format.md](./contracts/dataset-input-format.md)) and
`tests/e2e/upload.spec.ts`.

### Story 4 – Hear the sort (P4)

1. Clear site data, then open the app. **Expect**: sound is off, and a **Turn on sound**
   prompt sits next to Start.
2. Press **Turn on sound**, then **Start**. **Expect**: tones play with each step, higher
   bars sound higher, and a rising sweep plays at completion.
3. Press **Mute**. **Expect**: silence immediately, and sorting continues.
4. Reload. **Expect**: still muted, and the prompt does not return.
5. Run at maximum speed with sound on. **Expect**: no clicks, crackle, or loudness build-up
   (manual listening check, FR-027).

Automated: `tests/unit/sound.test.ts` (pitch mapping, one-tone-per-frame limit, persisted
settings) and `tests/e2e/sound.spec.ts` (prompt flow and persistence).

## Performance and accessibility checks

| Check | How | Target |
|-------|-----|--------|
| Frame rate | Chrome DevTools Performance, 1,000 values, max speed, 4× CPU throttle | No long frames > 50 ms, steady ~60 fps (SC-003) |
| Control response | Performance trace of clicking Pause | Visible change < 100 ms (SC-004) |
| Step generation | `tests/unit/perf.bench.ts` (Vitest bench), Gnome Sort on 1,000 reversed values | < 300 ms in the worker; UI stays responsive |
| Load | Lighthouse, mobile preset | Interactive < 2 s |
| Accessibility | `@axe-core/playwright` in every e2e spec, plus a manual keyboard-only pass | Zero violations, WCAG 2.1 AA (SC-009) |
| Small screens | Playwright at 360×740 | No horizontal scroll; all controls reachable |
