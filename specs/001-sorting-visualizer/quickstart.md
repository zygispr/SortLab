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
| Step generation | `tests/perf/steps.bench.ts` (Vitest bench, `npm run bench`), Gnome Sort on 1,000 reversed values | < 300 ms in the worker; UI stays responsive |
| Sound sync | `tests/unit/sound.test.ts` asserts each tone is scheduled within 50 ms of its frame's audio time; manual check with sound on at 2 steps/s | Tone starts ≤ 50 ms after its bar change (SC-006) |
| Load | Lighthouse, mobile preset | Interactive < 2 s |
| Accessibility | `@axe-core/playwright` in every e2e spec, plus a manual keyboard-only pass | Zero violations, WCAG 2.1 AA (SC-009) |
| Small screens | Playwright at 360×740 | No horizontal scroll; all controls reachable |

## Measured results

Measured 2026-10-28 on the production build (`npm run build && npm run preview`), Apple
Silicon Mac, Chromium 156 (Playwright) and Chrome 156 (DevTools) unless noted. Scripts drove the page
through Playwright and the Chrome DevTools Protocol.

### Performance (T086)

| Check | Measured | Target | Result |
|-------|----------|--------|--------|
| Frame rate, 1,000 values, Bubble Sort at 60,000 steps/s, 5 s sample | 1× CPU: 60 fps, p95 frame 16.8 ms, max 16.8 ms. 4× CPU: 60 fps, p95 16.8 ms, max 16.8 ms, 0 frames > 50 ms | No frames > 50 ms, ~60 fps (SC-003) | Pass |
| Long animation frames at 4× CPU, whole run start | 0 frames ≥ 50 ms when Start is pressed with Space or a DOM click (3 runs each). Starting with a Playwright locator click shows one 54–70 ms frame: Playwright's own actionability checks run on the page's main thread (seen in the CPU profile as `expectHitTarget`/`getIdRefs`); app scripts in that frame take 6 ms | No frames > 50 ms | Pass (the long frame is test-harness overhead) |
| Pause click response, 4× CPU, 1,000 values at max speed | Event Timing (input to next paint): 24 ms (5 clicks), 64 ms on the very first click of the page. Click-to-"Resume" round trip through Playwright: 41–53 ms | Visible change < 100 ms (SC-004) | Pass |
| Step generation, `npm run bench` | Gnome Sort, 1,000 reversed: mean 77 ms (p99 88 ms). Bubble Sort, 1,000 reversed: 54 ms. Merge Sort, 1,000 random: 1.1 ms. Vitest warns that its module runner adds getter overhead, so worker times are lower still | < 300 ms | Pass |
| Sound sync at 2 steps/s (real click on "Turn on sound", volume 0) | 13 tones, one per step, 500 ± 1 ms apart. Each tone is scheduled 0 to −5.3 ms from `AudioContext.currentTime`, i.e. at once, in the same animation frame as its bar change. Base latency 5.3 ms. Output latency reported by Chrome: 168 ms, because this Mac's default output is a **Bluetooth** device | Tone starts ≤ 50 ms after its bar change (SC-006) | App part passes (≤ 5 ms). End to end it depends on the output device: about 10–20 ms more on built-in or wired output; Bluetooth adds ~170 ms, which the app cannot shorten. Documented exception, see below |
| Load, Lighthouse 12.8.2, mobile preset (simulated 150 ms RTT, 1.6 Mbps, 4× CPU) | Time to Interactive 1.5 s, FCP 1.4 s, LCP 1.4 s, TBT 60 ms, CLS 0, performance score 100. JS 84 KB gzipped, CSS 2.3 KB | Interactive < 2 s | Pass |
| Load, DevTools trace with "Slow 4G" (562 ms per-request latency) and 4× CPU, for comparison | LCP 2.09 s: HTML 0.6 s, JS downloaded at 1.66 s, React's first render ~0.43 s | (harsher than the Lighthouse preset) | Informational |

**SC-006 exception (Bluetooth output)**: the app schedules every tone in the same frame
as its bar change, so on built-in speakers and wired headphones the tone is heard within
the 50 ms target. Bluetooth headphones add their own codec delay (~170 ms measured here),
which no web page can remove. Meeting 50 ms on Bluetooth would need the bars to be delayed
by the reported `outputLatency` while sound is on; that is a product decision, not made
here.

### Manual and accessibility checks (T087)

| Check | Measured | Result |
|-------|----------|--------|
| Keyboard-only pass | Driven with key presses only: Dataset size (arrows), Generate (Enter), Paste numbers (typing) and Use these numbers (Enter), Algorithm (type-ahead "Merge" selects Merge Sort; on macOS arrow keys open the native list), Space start/pause, → → ← steps, Reset (Enter), Turn on sound (Enter), Mute (Space), Volume (arrows), Speed (End → 60,000 steps/s). Tab reaches every control in visual order with a visible outline (`tests/e2e/layout.spec.ts`; WebKit needs Option+Tab, as Safari does) | Pass |
| Listening check at max speed (FR-027) | Listened by the project owner on 2026-10-28 (production build, 1,000 values, 60,000 steps/s, sound on, including the completion sweep): sound is good, with no clicks, distortion, or loudness build-up reported. Objective check as well: the real sound engine rendered offline at 60 tones/s for 10 s at full volume, then the completion sweep: peak −7.3 dBFS, 0 clipped samples; loudness steady at −18.6 ± 0.1 dBFS RMS from second 2 to 10 (no build-up); steepest sample-to-sample jump 0.052, below a clean 1,200 Hz sine at that peak (0.068), so no discontinuities (clicks) | Pass |
| Token contrast, state colors vs canvas (`src/styles/tokens.css`) | Light: unsorted ≥ 4.52, sorted ≥ 3.52 (worst hue 60), comparing 18.88, moving 5.16. Dark: unsorted ≥ 4.22, sorted ≥ 3.49 (worst hue 240), comparing 18.32, moving 5.59. Focus ring ≥ 5.26 (light) / 7.66 (dark) against surface and page | Pass (all ≥ 3:1) |
| Axe (WCAG 2.1 A/AA) | Zero violations in every e2e spec, and in light and dark themes with 1,000 values and a filled summary (`tests/e2e/layout.spec.ts`) | Pass |
| Small screens | No horizontal scroll at 360×740 and 1440×900 with 1,000 values and a filled run summary | Pass |

### Fixed during measurement

- The completion sweep was invisible for every algorithm: all 20 mark every bar sorted by
  their last step, and the sweep only turned bars sorted. It now draws a highlighted band
  moving left to right over 800 ms (regression test in `tests/unit/barRenderer.test.ts`,
  end-to-end check in `tests/e2e/layout.spec.ts`; contract wording updated in
  `contracts/ui-contract.md`).
