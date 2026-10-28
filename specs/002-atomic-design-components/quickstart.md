# Quickstart & Validation Guide: Atomic Design Component Structure

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

How to prove the restructuring is complete and changed nothing for end users. Setup and
the full quality gates are as in
[feature 001's quickstart](../001-sorting-visualizer/quickstart.md#setup-and-run).

## Before any component moves: capture the references

1. On the feature branch, with `src/components/` still flat, add the visual check
   ([contract §6](./contracts/component-levels.md#6-visual-check-fr-013-sc-002)).
2. Capture the macOS images and confirm they are stable:

   ```bash
   npx playwright test tests/e2e/visual.spec.ts --project=chromium --update-snapshots
   npx playwright test tests/e2e/visual.spec.ts --project=chromium --repeat-each=3
   ```

   **Expect**: 4 images written to `tests/e2e/visual.spec.ts-snapshots/` with a
   `-chromium-darwin.png` suffix, then 12 passing runs with 0 differing pixels.
3. Capture the Linux images in CI and add them:

   ```bash
   gh workflow run visual-baselines.yml --ref 002-atomic-design-components
   gh run watch "$(gh run list --workflow visual-baselines.yml --limit 1 --json databaseId -q '.[0].databaseId')"
   gh run download --name visual-baselines --dir tests/e2e/visual.spec.ts-snapshots
   ```

   **Expect**: 4 more images with a `-chromium-linux.png` suffix. Commit all 8 before
   restructuring.
4. Record the bundle size:

   ```bash
   npm run build   # note the gzip sizes of the JS and CSS files
   ```

## After the restructure

### Story 1 – every component has a level, nothing looks different

```bash
ls src/components                       # exactly: atoms molecules organisms pages templates
npm test                                # includes tests/unit/boundaries.test.ts
npx playwright test --project=chromium --project=webkit --project=phone
```

**Expect**: the five folders and no files; all unit, component, and e2e tests pass,
including `visual.spec.ts` with 0 differing pixels in all 4 images (SC-002). CI runs the
same on Linux, including Firefox.

### Story 2 – shared building blocks

```bash
grep -rln -E "<button|className=\{[^}]*(button|primary|dismiss)" src/components
grep -rn "type=\"range\"" src/components
```

**Expect**: the first finds only `atoms/Button.tsx`; the second only `atoms/Slider.tsx`
(SC-004). Using the README section, pick three on-screen controls (Speed slider, Run
summary table, Upload file) and confirm each is found in at most two lookups (SC-005).

### Story 3 – rules are enforced

1. Add `import { useAppStore } from '../../store/appStore';` to `atoms/Button.tsx` and run
   `npm run lint`. **Expect**: one error naming FR-004.
2. Replace it with `import { DataPanel } from '../organisms/DataPanel';`. **Expect**: one
   error naming FR-005. Remove it; `npm run lint` passes.

`tests/unit/boundaries.test.ts` checks every rule the same way automatically (SC-003).

### Performance (SC-006)

| Check | How | Target |
|-------|-----|--------|
| Bundle size | `npm run build` gzip sizes vs the numbers recorded before | JS + CSS grow ≤ 2% |
| Frame rate and response | Feature 001 quickstart → Performance checks, frame-rate and Pause rows | unchanged budgets: no frames > 50 ms, response < 100 ms |
| Load | Lighthouse mobile preset | interactive < 2 s |
