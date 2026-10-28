# Feature Specification: Sorting Algorithm Visualizer

**Feature Branch**: `001-sorting-visualizer`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "I want to create a sorting algorhitm visualized web application, where user could either upload their own data set they would want to see sorted or just generate a random data set without any uploading. They could then choose a sorting algorhitm from a variety of sorting algorhitms and see the sorting take place in real time with colorful and smooth animations. Also satisfying sounds could play during sorting. After sorting finishes user could choose a different sorting algorhitm."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch a random dataset get sorted (Priority: P1)

A visitor opens the app, gets a random dataset with one click (or uses the one shown on
arrival), picks a sorting algorithm from a list, and presses Start. Each value is shown as a
bar whose height matches the value. The bars move in real time as the algorithm compares and
swaps them, with distinct colors for elements being compared, elements being moved, and
elements already in their final position. The visitor can pause, resume, and change the
playback speed. When sorting ends, a short completion animation confirms the data is sorted.

**Why this priority**: This is the core experience. Without it nothing else in the app has
value; with it alone the app is already a usable, enjoyable learning tool.

**Independent Test**: Open the app, generate a random dataset, choose any algorithm, start
it, and confirm the bars animate step by step into ascending order and a completion state is
shown.

**Acceptance Scenarios**:

1. **Given** the app has just opened, **When** the page finishes loading, **Then** a random
   dataset is displayed as bars and a default algorithm is pre-selected so the user can press
   Start immediately.
2. **Given** a dataset is displayed, **When** the user chooses a size and presses Generate,
   **Then** a new random dataset of that size replaces the current one.
3. **Given** a dataset and an algorithm are selected, **When** the user presses Start,
   **Then** the bars animate through each comparison and move of that algorithm until the
   dataset is in ascending order.
4. **Given** sorting is in progress, **When** the user presses Pause, **Then** the animation
   freezes on the current step, and **When** the user presses Resume, **Then** it continues
   from that step.
5. **Given** sorting is in progress, **When** the user changes the speed, **Then** the
   animation pace changes immediately without restarting.
6. **Given** sorting is in progress, **When** the last step completes, **Then** all bars show
   the "sorted" state, a completion animation plays, and a message names the algorithm used.
7. **Given** a color-coded state is shown, **When** the user looks at the legend, **Then**
   each state (unsorted, comparing, moving, sorted) is explained, and each is also
   distinguishable without relying on color alone.

---

### User Story 2 - Re-run the same data with a different algorithm (Priority: P2)

After a sort finishes (or while it is paused or running), the user picks a different
algorithm and runs it on the same original, unsorted dataset, so they can see how
algorithms differ on identical input. A small summary shows each run's number of
comparisons, number of moves, and elapsed time.

**Why this priority**: Comparing algorithms is the main reason people return to a
visualizer, and it reuses everything built for Story 1.

**Independent Test**: Sort a dataset with one algorithm, select another, start it, and
confirm the bars first return to the same original order before the new sort begins, and
that run statistics are shown for both runs.

**Acceptance Scenarios**:

1. **Given** a sort has finished, **When** the user selects a different algorithm and
   presses Start, **Then** the bars reset to the original unsorted order and the new
   algorithm sorts them.
2. **Given** a sort is running or paused, **When** the user selects a different algorithm,
   **Then** the current run stops, the bars reset to the original unsorted order, and the
   new algorithm is ready to start.
3. **Given** a sort has finished, **When** the user views the run summary, **Then** they
   see the algorithm name, comparison count, move count, and elapsed time for that run and
   for earlier runs on the same dataset.
4. **Given** a sort has finished, **When** the user presses Reset, **Then** the bars return
   to the original unsorted order without starting a new run.

---

### User Story 3 - Sort my own uploaded dataset (Priority: P3)

The user uploads a file containing their own numbers (or pastes them into a text box). The
app checks the input, shows the values as bars, and from then on everything in Stories 1
and 2 works the same way on that data.

**Why this priority**: It personalizes the experience and makes the app useful for
coursework or demos with specific data, but the app is fully usable without it.

**Independent Test**: Upload a valid file of numbers, confirm the bars match the file's
values in order, then sort them with any algorithm.

**Acceptance Scenarios**:

1. **Given** the user has a valid file of numbers, **When** they upload it, **Then** the
   values are displayed as bars in the same order as in the file.
2. **Given** the user pastes numbers into the input box, **When** they confirm, **Then** the
   values are displayed as bars in the order entered.
3. **Given** the user uploads a file with invalid content, **When** the app reads it,
   **Then** the current dataset is left unchanged and a message explains what is wrong
   (for example, "Line 4: 'abc' is not a number") and how to fix it.
4. **Given** the user uploads a file with more values than the supported maximum, **When**
   the app reads it, **Then** the upload is rejected with a message stating the limit.

---

### User Story 4 - Hear the sort (Priority: P4)

While sorting, each comparison or move plays a short, pleasant tone whose pitch reflects
the value involved, so the user can "hear" the data become ordered. A rising sweep of tones
accompanies the completion animation. The user can mute and adjust the volume at any time.

**Why this priority**: Sound adds delight and a second sense for following the algorithm,
but the visual experience is complete without it.

**Independent Test**: Start a sort with sound on and confirm tones play in step with the
animation, their pitch rises with value, and muting silences them immediately.

**Acceptance Scenarios**:

1. **Given** sound is on, **When** sorting is in progress, **Then** a tone plays for each
   visualized step, with higher values producing higher pitches.
2. **Given** sound is on, **When** the user presses Mute, **Then** sound stops immediately
   and sorting continues silently.
3. **Given** sound is on, **When** sorting completes, **Then** a completion sweep of tones
   plays alongside the completion animation.
4. **Given** the user muted sound, **When** they return to the app later on the same device,
   **Then** sound is still muted.
5. **Given** the playback speed is very fast, **When** sorting is in progress, **Then**
   tones remain pleasant (no harsh clicks, distortion, or overwhelming volume).

---

### Edge Cases

- Dataset already sorted: the algorithm still runs and shows its comparisons, then
  completes normally.
- Dataset of all-equal values or many duplicates: bars are displayed and sorted correctly;
  equal values stay visibly distinguishable as separate bars.
- Dataset with negative numbers, zero, or decimals: bars are scaled so every value is
  visible and the relative order is clear.
- Very small dataset (2 values) and maximum-size dataset (1,000 values): both display and
  animate correctly; at 1,000 values bars may be thin but remain visible.
- Empty file, file with only separators, or file with fewer than 2 values: rejected with a
  clear message.
- Uploaded file is not text (for example an image) or exceeds the size limit: rejected with
  a clear message; the current dataset is unchanged.
- User generates or uploads a new dataset while a sort is running: the current run stops
  and the new dataset is shown in its unsorted state.
- User switches to another browser tab during a sort: sorting pauses and resumes from the
  same step when the user returns and presses Resume (no skipped or garbled steps).
- User resizes the window or rotates the device mid-sort: the visualization re-fits the new
  size without restarting.
- Browser blocks sound until the user interacts: sound starts working after the first user
  action (pressing Start counts) without an error message.
- User prefers reduced motion (system setting): movement animations are shortened or
  replaced with instant updates, while color states still show progress.

## Requirements *(mandatory)*

### Functional Requirements

**Datasets**

- **FR-001**: System MUST display a random dataset immediately when the app opens.
- **FR-002**: Users MUST be able to generate a new random dataset and choose its size from
  10 to 1,000 values (default 50).
- **FR-003**: Users MUST be able to upload a plain-text or CSV file of numbers separated by
  commas, spaces, tabs, semicolons, or new lines.
- **FR-004**: Users MUST be able to paste or type numbers into a text input as an
  alternative to uploading a file, using the same format rules as FR-003.
- **FR-005**: System MUST accept integers and decimals, including negative values and
  duplicates, and MUST reject non-numeric entries with a message identifying the first
  invalid entry and its position.
- **FR-006**: System MUST accept datasets of 2 to 1,000 values and files up to 1 MB, and
  MUST reject anything outside these limits with a message stating the limit.
- **FR-007**: System MUST keep the original unsorted order of the current dataset so it can
  be restored for reset and for re-runs.
- **FR-008**: Uploaded or pasted data MUST stay on the user's device; it MUST NOT be sent to
  or stored on any server.

**Algorithms and playback**

- **FR-009**: System MUST offer at least these algorithms: Bubble Sort, Selection Sort,
  Insertion Sort, Merge Sort, Quick Sort, Heap Sort, Shell Sort, and Cocktail Shaker Sort.
- **FR-010**: System MUST show a one-to-two sentence description and the typical time
  complexity of the selected algorithm.
- **FR-011**: System MUST sort values in ascending order.
- **FR-012**: Users MUST be able to Start, Pause, Resume, and Reset a sort.
- **FR-013**: Users MUST be able to change playback speed at any time, from a slow pace
  where individual steps are easy to follow to a fast pace where the largest dataset
  finishes in under 30 seconds with any offered algorithm.
- **FR-014**: Selecting a different algorithm, generating a new dataset, or uploading new
  data during a run MUST stop the run and show the (new or original) unsorted dataset.
- **FR-015**: System MUST pause a running sort automatically when the app is hidden (for
  example, the user switches tabs).

**Visualization**

- **FR-016**: System MUST draw each value as a bar whose height is proportional to its value
  relative to the dataset's range, with all bars visible including the smallest value.
- **FR-017**: System MUST show each step of the selected algorithm in order, using distinct
  visual states for unsorted, being compared, being moved, and in final sorted position.
- **FR-018**: Visual states MUST be distinguishable without relying on color alone and
  MUST be explained in an on-screen legend.
- **FR-019**: Bar movements MUST animate smoothly between positions rather than jumping,
  except when the user's reduced-motion preference is set.
- **FR-020**: System MUST play a completion animation when sorting finishes and show a
  message naming the algorithm used.
- **FR-021**: System MUST show live counters for comparisons and moves during a run.
- **FR-022**: System MUST keep a run summary (algorithm, comparisons, moves, elapsed time)
  for all runs on the current dataset, cleared when the dataset changes.

**Sound**

- **FR-023**: System MUST play a short tone for each visualized step, with pitch mapped to
  the value involved (higher value, higher pitch).
- **FR-024**: System MUST play a completion sweep of tones when sorting finishes.
- **FR-025**: Users MUST be able to mute/unmute and adjust volume at any time; the change
  MUST take effect immediately.
- **FR-026**: System MUST remember the user's mute and volume choice on the same device.
- **FR-027**: Sound MUST stay pleasant at every speed: no clicks or distortion, and overall
  loudness MUST NOT build up as steps get faster.

**Interface**

- **FR-028**: Every control MUST be usable with a keyboard and have a clear label, and
  Space MUST toggle Start/Pause.
- **FR-029**: The interface MUST work on screens from 360 px wide (phones) to large desktop
  monitors without horizontal scrolling.
- **FR-030**: Controls that cannot be used in the current state (for example, Resume when
  nothing is paused) MUST appear disabled.

### Key Entities

- **Dataset**: An ordered list of 2–1,000 numbers. Has a source (random or uploaded), its
  original order, and its current order during a run.
- **Algorithm**: A named sorting method with a short description and typical time
  complexity. Produces an ordered sequence of steps for a given dataset.
- **Step**: A single action in a sort — a comparison between two positions, or a move/swap
  of values between positions — plus the positions now known to be in final order.
- **Run**: One execution of an algorithm on a dataset. Has a status (ready, running,
  paused, finished), current step, comparison count, move count, and elapsed time.
- **Playback Settings**: Speed, mute state, and volume chosen by the user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from opening the app to watching a sort in under
  10 seconds and no more than 2 clicks.
- **SC-002**: Every offered algorithm produces a correctly sorted result for 100% of test
  datasets, including already sorted, reverse sorted, all-equal, duplicates, negatives, and
  decimals.
- **SC-003**: Animations stay smooth (no visible stutter or frozen frames) for datasets up
  to 1,000 values at every speed on a mid-range laptop and phone.
- **SC-004**: Every control (start, pause, speed, mute, algorithm change) shows a visible
  response within 100 ms of the user's action.
- **SC-005**: A valid uploaded file of 1,000 values is displayed within 1 second.
- **SC-006**: Sounds play in step with the animation: each tone starts within 50 ms of the
  bar change it belongs to.
- **SC-007**: In usability testing, at least 90% of participants can correctly say which
  bars are being compared and which are sorted, using the legend.
- **SC-008**: At least 90% of participants with invalid upload files can fix them using
  only the error message shown.
- **SC-009**: The app is fully usable at 360 px width and passes WCAG 2.1 AA checks for
  contrast, labels, and keyboard access.

## Assumptions

- Only numeric data is sorted; sorting text, dates, or records with multiple fields is out
  of scope for this version.
- Sorting is ascending only; a descending option is out of scope for this version.
- Random datasets use whole numbers spread evenly between 1 and 1,000.
- The maximum of 1,000 values keeps every bar visible on common screens and keeps
  animations smooth; larger datasets are out of scope.
- No user accounts, login, saving, or sharing of datasets or runs; everything happens in
  the browser for the current visit, except remembered sound settings.
- Sound is on by default at a moderate volume, since it is part of the intended experience;
  it can be muted with one click and the choice is remembered.
- The app supports the current and previous major versions of common desktop and mobile
  browsers; it needs no installation.
- The default algorithm pre-selected on arrival is Bubble Sort, as the most widely
  recognized.
- The app is a single page with all controls and the visualization visible together; no
  multi-page navigation is needed.
