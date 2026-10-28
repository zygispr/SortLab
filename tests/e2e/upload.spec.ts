import { expect, type Page, type Request, test } from '@playwright/test';
import { expectNoA11yViolations, expectNoHorizontalScroll } from './helpers';

/** User Story 3 — sort my own uploaded dataset (quickstart.md → Story 3). */

const chart = (page: Page) => page.getByRole('img', { name: /^Bar chart of/ });
const upload = (page: Page) => page.getByLabel('Upload file');
const fixture = (name: string) => `tests/fixtures/${name}`;

/** Runs `action` and fails if the page made any network request meanwhile (FR-008). */
async function withoutNetwork(page: Page, action: () => Promise<void>): Promise<void> {
  const requests: string[] = [];
  const record = (r: Request) => requests.push(r.url());
  page.on('request', record);
  try {
    await action();
  } finally {
    page.off('request', record);
  }
  expect(requests).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // The step worker loads with the first dataset; wait so later requests would be ours.
  await expect(chart(page)).toHaveAccessibleName(/step 0 of [1-9]/);
});

test('uploads mixed values and disables the sorts that cannot handle them', async ({ page }) => {
  await withoutNetwork(page, async () => {
    await upload(page).setInputFiles(fixture('valid-mixed.csv'));
    await expect(chart(page)).toHaveAccessibleName(/^Bar chart of 20 values/);
  });
  await expect(page.getByText('valid-mixed.csv', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Loaded 20 values from valid-mixed.csv.');
  for (const name of ['Counting Sort', 'Radix Sort (LSD)', 'Radix Sort (MSD)']) {
    await expect(
      page.getByRole('option', { name: `${name} — needs whole numbers` }),
    ).toBeDisabled();
  }

  // Any other algorithm sorts it.
  await page.getByRole('combobox', { name: 'Algorithm' }).selectOption('merge');
  await page.getByRole('slider', { name: 'Speed' }).fill('1000');
  await expect(chart(page)).toHaveAccessibleName(/Merge Sort, step 0 of [1-9]/);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Sorted with Merge Sort', { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);
  await expectNoHorizontalScroll(page);
});

test('shows 1,000 uploaded values within 1 second (SC-005)', async ({ page }) => {
  await withoutNetwork(page, async () => {
    await upload(page).setInputFiles(fixture('valid-1000.txt'));
    await expect(chart(page)).toHaveAccessibleName(/^Bar chart of 1000 values/, { timeout: 1000 });
  });
});

test.describe('rejected files keep the current dataset', () => {
  for (const [file, message] of [
    ['header-row.csv', "Line 1: 'value' is not a number. If this is a header row, remove it."],
    ['too-many.txt', 'Too many numbers: found 1001, the maximum is 1,000.'],
    ['image.png', 'Please choose a .txt or .csv file.'],
  ] as const) {
    test(file, async ({ page }) => {
      await withoutNetwork(page, async () => {
        await upload(page).setInputFiles(fixture(file));
        await expect(page.getByText(message, { exact: true })).toBeVisible();
      });
      await expect(page.getByRole('status')).toHaveText(message);
      await expect(chart(page)).toHaveAccessibleName(/^Bar chart of 50 values/);
      await expect(page.getByText('Random · 50 values', { exact: true })).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }
});

test('pastes numbers and uses them in the order entered', async ({ page }) => {
  await withoutNetwork(page, async () => {
    await page.getByRole('textbox', { name: 'Paste numbers' }).fill('5, 3, 8, 1');
    await page.getByRole('button', { name: 'Use these numbers' }).click();
    await expect(chart(page)).toHaveAccessibleName(/^Bar chart of 4 values/);
  });
  await expect(page.getByText('Pasted numbers', { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);
});
