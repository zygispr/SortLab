import { expect, type Page, test } from '@playwright/test';
import { expectNoA11yViolations, expectNoHorizontalScroll } from './helpers';

/** User Story 2 — re-run the same data with a different algorithm (quickstart.md → Story 2). */

const chart = (page: Page) => page.getByRole('img', { name: /^Bar chart of/ });
const summaryRows = (page: Page) =>
  page.getByRole('table', { name: 'Run summary' }).locator('tbody tr');

async function runToCompletion(page: Page, name: string) {
  await expect(chart(page)).toHaveAccessibleName(new RegExp(`${name}, step 0 of [1-9]`));
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(`Sorted with ${name}`, { exact: true })).toBeVisible();
}

test('re-run the same data with a different algorithm', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('No runs yet. Press Start to sort this dataset.')).toBeVisible();
  await page.getByRole('slider', { name: 'Speed' }).fill('1000');

  // Finish a Bubble Sort run.
  await runToCompletion(page, 'Bubble Sort');
  await expect(summaryRows(page)).toHaveCount(1);

  // Selecting Merge Sort resets the bars to the original order (step 0), then it runs.
  await page.getByRole('combobox', { name: 'Algorithm' }).selectOption('merge');
  await runToCompletion(page, 'Merge Sort');

  // Both runs are listed with comparisons, moves, and time.
  await expect(summaryRows(page)).toHaveCount(2);
  await expect(summaryRows(page).nth(0).locator('td').first()).toHaveText('Bubble Sort');
  await expect(summaryRows(page).nth(1).locator('td').first()).toHaveText('Merge Sort');
  await expect(summaryRows(page).nth(1).locator('td').nth(3)).toHaveText(/^\d+\.\d s$/);
  await expectNoA11yViolations(page);
  await expectNoHorizontalScroll(page);

  // Reset after finishing returns to step 0 without starting a new run.
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(chart(page)).toHaveAccessibleName(/Merge Sort, step 0 of/);
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await page.waitForTimeout(300);
  await expect(chart(page)).toHaveAccessibleName(/step 0 of/);
  await expect(summaryRows(page)).toHaveCount(2);

  // A new dataset clears the summary.
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByText('No runs yet. Press Start to sort this dataset.')).toBeVisible();
});
