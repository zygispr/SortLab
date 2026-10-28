import { expect, type Page, test } from '@playwright/test';
import { expectNoA11yViolations, expectNoHorizontalScroll } from './helpers';

/** Layout, keyboard, reduced-motion, and theme checks across the whole page (FR-019, FR-028–FR-030). */

const chart = (page: Page) => page.getByRole('img', { name: /^Bar chart of/ });

/** Loads 1,000 values and finishes one run at max speed so the summary has a row. */
async function fillPage(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Upload file').setInputFiles('tests/fixtures/valid-1000.txt');
  await expect(chart(page)).toHaveAccessibleName(/^Bar chart of 1000 values/);
  await page.getByRole('combobox', { name: 'Algorithm' }).selectOption('merge');
  await expect(chart(page)).toHaveAccessibleName(/Merge Sort, step 0 of [1-9]/);
  await page.getByRole('slider', { name: 'Speed' }).fill('1000');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Sorted with Merge Sort', { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('table', { name: 'Run summary' }).locator('tbody tr')).toHaveCount(1);
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1440, height: 900 },
]) {
  test.describe(`at ${String(viewport.width)}×${String(viewport.height)}`, () => {
    test.use({ viewport });

    test('has no horizontal scroll with 1,000 values and a filled summary', async ({ page }) => {
      await fillPage(page);
      await expectNoHorizontalScroll(page);
    });
  });
}

/** Accessible name or text of the focused element, plus whether it shows an outline. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    const label =
      el.getAttribute('aria-label') ??
      (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null) ??
      el.closest('label')?.textContent ??
      el.textContent;
    const box = el.getBoundingClientRect();
    return {
      label: label.trim(),
      outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
      top: box.top + window.scrollY,
      left: box.left,
    };
  });
}

test('every control is reachable by Tab, in visual order, with a visible outline', async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(isMobile, 'Tab order is a keyboard check; the phone project has no keyboard');
  // Like Safari on macOS, WebKit's plain Tab skips buttons and sliders unless Full Keyboard
  // Access is on; Option+Tab moves through every control.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.goto('/');
  await expect(chart(page)).toHaveAccessibleName(/step 0 of [1-9]/);
  // Give every control its enabled state so none is skipped by Tab.
  await page.getByRole('button', { name: 'Step forward', exact: true }).click();
  await page.locator('body').click({ position: { x: 1, y: 1 } });

  const seen: NonNullable<Awaited<ReturnType<typeof focused>>>[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(tab);
    const f = await focused(page);
    if (!f || seen.some((s) => s.label === f.label)) break;
    seen.push(f);
  }

  const labels = seen.map((s) => s.label);
  for (const name of [
    'Dataset size',
    'Generate',
    'Upload file',
    'Paste numbers',
    'Algorithm',
    'Resume',
    'Turn on sound',
    'Not now',
    'Step back',
    'Step forward',
    'Reset',
    'Speed',
    'Unmute',
    'Volume',
  ]) {
    expect(labels, `Tab reaches ${name}`).toContainEqual(expect.stringContaining(name));
  }
  for (const s of seen) expect(s.outline, `${s.label} shows a focus outline`).toBe(true);

  // Visual order: within each column, focus moves downward (never back up the page).
  const stage = labels.findIndex((l) => l.startsWith('Resume'));
  const isOrdered = (group: typeof seen) =>
    group.every((s, i) => i === 0 || s.top >= group[i - 1]!.top - 1);
  expect(isOrdered(seen.slice(0, stage)), 'controls column in order').toBe(true);
  expect(isOrdered(seen.slice(stage)), 'playback and sound in order').toBe(true);
});

/** Finishes a Bubble Sort run at max speed and reports whether the canvas still changes. */
async function canvasMovesAfterFinish(page: Page): Promise<boolean> {
  await page.goto('/');
  await expect(chart(page)).toHaveAccessibleName(/step 0 of [1-9]/);
  await page.getByRole('slider', { name: 'Speed' }).fill('1000');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Sorted with Bubble Sort', { exact: true })).toBeVisible();
  const snapshot = () => page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const first = await snapshot();
  await page.waitForTimeout(200);
  return (await snapshot()) !== first;
}

test('without reduced motion the finish plays the sweep', async ({ page }) => {
  expect(await canvasMovesAfterFinish(page)).toBe(true);
});

test('with reduced motion the finish shows at once, without the sweep', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await canvasMovesAfterFinish(page)).toBe(false);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`has no accessibility violations in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await fillPage(page);
    await expectNoA11yViolations(page);
  });
}
