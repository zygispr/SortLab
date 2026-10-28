import { expect, type Page, test } from '@playwright/test';
import { expectNoA11yViolations, expectNoHorizontalScroll } from './helpers';

/** User Story 1 — watch a random dataset get sorted (quickstart.md → Story 1). */

const chart = (page: Page) => page.getByRole('img', { name: /^Bar chart of/ });

/** Current step position, read from the "Step n / total" counter. */
async function stepPosition(page: Page): Promise<number> {
  const value = page
    .getByRole('list', { name: 'Counters' })
    .getByRole('listitem')
    .filter({ hasText: 'Step' })
    .locator('span')
    .nth(1);
  const text = (await value.textContent()) ?? '';
  return Number(text.split('/')[0]!.replace(/[^\d]/g, ''));
}

async function blurFocus(page: Page): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
}

test('watch a random dataset get sorted', async ({ page }) => {
  // 1. On arrival: 50 bars and Bubble Sort, no clicks needed (FR-001, SC-001).
  await page.goto('/');
  await expect(chart(page)).toHaveAccessibleName(
    /^Bar chart of 50 values, sorting with Bubble Sort/,
  );
  await expect(page.getByRole('combobox', { name: 'Algorithm' })).toHaveValue('bubble');
  await expectNoA11yViolations(page);
  await expectNoHorizontalScroll(page);

  // 2. Size 200 + Generate → 200 bars.
  await page.getByRole('slider', { name: 'Dataset size' }).fill('200');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(chart(page)).toHaveAccessibleName(/^Bar chart of 200 values.*step 0 of [1-9]/);

  // 3. Start → the step counter rises.
  await page.getByRole('button', { name: 'Start' }).click();
  await expect.poll(() => stepPosition(page)).toBeGreaterThan(0);

  // 4. Space pauses; → twice applies two steps; ← undoes one, each announced.
  await blurFocus(page);
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const paused = await stepPosition(page);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('status')).toHaveText(/[Pp]ositions? \d+/);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => stepPosition(page)).toBe(paused + 2);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => stepPosition(page)).toBe(paused + 1);
  await expect(page.getByRole('status')).toHaveText(/^Undid: /);

  // 5. Maximum speed, Resume → completes with the sweep and the message.
  await page.getByRole('slider', { name: 'Speed' }).fill('1000');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Sorted with Bubble Sort', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(/^Sorted with Bubble Sort: [\d,]+ comparisons/);
  await expectNoA11yViolations(page);
  await expectNoHorizontalScroll(page);
});

test('pauses when the page is hidden', async ({ page }) => {
  // 6. Switching tabs mid-run pauses it (FR-015).
  await page.goto('/');
  await page.getByRole('slider', { name: 'Speed' }).fill('0');
  await expect(chart(page)).toHaveAccessibleName(/step 0 of [1-9]/);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Paused.');
});
