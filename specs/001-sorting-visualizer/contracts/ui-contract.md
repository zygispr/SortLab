# Contract: User Interface

What the single screen exposes to users, keyboard users, and assistive technology. Tests
(component and end-to-end) select elements by the accessible names listed here.

## Layout

One page, top to bottom on phones; controls beside the visualization on wide screens
(≥ 1024 px). No horizontal page scroll from 360 px upward (FR-029).

| Region | Contents |
|--------|----------|
| Header | App name "SortLab" |
| Data panel | Size slider + **Generate** button; **Upload file** button; **Paste numbers** text area + **Use these numbers** button; current dataset label |
| Algorithm panel | **Algorithm** picker grouped by family; description and complexity of the selection |
| Visualization | Canvas of bars; legend; live counters (comparisons, moves, elapsed time, step `position / total`) |
| Playback bar | **Start/Pause/Resume**, **Step back**, **Step forward**, **Reset**, **Speed** slider |
| Sound | **Turn on sound** prompt (first visit), **Mute/Unmute** toggle, **Volume** slider |
| Run summary | Table of runs on the current dataset |
| Messages | One polite live region for status and errors |

## Controls

| Accessible name | Type | Enabled when | Action |
|-----------------|------|--------------|--------|
| Dataset size | slider 10–1,000, step 10 (default 50) | always | Sets size for the next Generate |
| Generate | button | always | New random dataset; stops current run (FR-014) |
| Upload file | file input (`.txt,.csv`) | always | Parse and load; on error, keep current dataset |
| Paste numbers | textarea | always | |
| Use these numbers | button | textarea not empty | Parse and load as above |
| Algorithm | select with `optgroup` per family | always | Changes algorithm; stops run, resets bars (FR-014); unsupported options disabled with reason in the label, e.g. "Radix Sort (LSD) — needs whole numbers" |
| Start / Pause / Resume | one toggle button; name follows status (`ready`/`finished` → Start, `running` → Pause, `paused` → Resume, `preparing` → Start) | always | See state machine in [data-model.md](../data-model.md) |
| Step back | button | status `paused` or `finished` and `position > 0` | Undo one step |
| Step forward | button | status `ready` or `paused` and `position < total` | Apply one step; status becomes `paused` |
| Reset | button | `position > 0` | Bars to original order, status `ready` |
| Speed | slider, logarithmic, 2–60,000 steps/s (default 100); value text e.g. "100 steps per second" | always | Takes effect on the next frame |
| Turn on sound | button in prompt | prompt visible | Unmute, create audio, hide prompt for good |
| Not now | button in prompt | prompt visible | Hide prompt for good; stay muted |
| Mute / Unmute | toggle button (`aria-pressed`) | always | Immediate (FR-025) |
| Volume | slider 0–100 % | always | Immediate |

Disabled controls use the native `disabled` attribute and a visibly dimmed style (FR-030).

## Keyboard

| Key | Action | Scope |
|-----|--------|-------|
| Space | Start / Pause / Resume | Anywhere except text inputs, selects, sliders, and buttons (a focused button keeps its native Space activation) |
| → | Step forward | When enabled; not in text inputs, selects, or sliders |
| ← | Step back | When enabled; not in text inputs, selects, or sliders |
| Tab / Shift+Tab | Move focus in visual order | Everywhere |

Every control has a visible focus outline with at least 3:1 contrast.

## Visual states (FR-017, FR-018)

Each state has a color **and** a non-color cue. All colors meet 3:1 contrast against the
canvas background in both light and dark themes.

| State | Color | Non-color cue |
|-------|-------|---------------|
| Unsorted | Value-based hue gradient (low = violet, high = orange) at reduced saturation | — (baseline) |
| Comparing / read | White (dark theme) / near-black (light theme) | Small ▲ marker under the bar |
| Moving | Hot pink | Bar drawn at its own height with a thick outline, ● marker under the bar |
| Sorted | Same hue gradient at full saturation | Solid baseline strip under the bar |

The legend shows each state's swatch and marker with its name. When finished, a sweep runs
left to right turning every bar *sorted*, drawn as a highlighted band (the comparing color,
no marker) travelling across the bars over 800 ms, followed by the message
"Sorted with {algorithm name}" (FR-020). With reduced motion, the sweep is skipped and all
bars turn sorted at once.

## Announcements (live region, `aria-live="polite"`)

| Event | Text |
|-------|------|
| Dataset loaded | "Loaded {count} values from {label}." |
| Upload / paste error | The parser message from [dataset-input-format.md](./dataset-input-format.md) |
| Algorithm auto-changed | "{old} can't sort this data ({reason}). Switched to Bubble Sort." |
| Run finished | "Sorted with {name}: {comparisons} comparisons, {moves} moves." |
| Manual step | "Comparing positions 4 and 5." / "Swapped positions 4 and 5." / "Wrote 37 at position 12." |
| Auto-paused (tab hidden) | "Paused." |

Not announced: individual steps during continuous playback.

The canvas has `role="img"` and an `aria-label` such as "Bar chart of 50 values, sorting
with Merge Sort, step 120 of 572."

## Errors and empty states

- There is never an empty visualization: a random dataset is shown on load (FR-001).
- Invalid uploads leave the current dataset and run untouched and show the error next to
  the data panel plus in the live region.
- Worker failure: "Couldn't prepare this sort. Try again." with a **Retry** button.
- Missing Web Audio support: sound controls are hidden and a note says "Sound isn't
  supported in this browser."
