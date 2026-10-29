import { expect, type Page, test } from '@playwright/test';

/**
 * Permanent visual check (feature 002, FR-013, SC-002): the screen must stay pixel-identical
 * to reference images captured before the component restructure
 * (specs/002-atomic-design-components/contracts/component-levels.md §6).
 */

const chart = (page: Page) => page.getByRole('img', { name: /^Bar chart of/ });
const dataPanel = (page: Page) => page.getByRole('region', { name: 'Data' });

/** Fixed values, so the bars never depend on the random starting dataset. */
const VALUES =
  '12, 87, 45, 3, 66, 29, 91, 54, 8, 73, 38, 61, 17, 95, 42, 26, 80, 5, 69, 33, 58, 14, 99, 47, 21, 76, 36, 63, 10, 84';

const screenshotOptions = { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 } as const;

test.beforeEach(() => {
  // Pixel-exact references only match the browser that took them; one project is enough.
  test.skip(test.info().project.name !== 'chromium', 'Reference images exist for chromium only');
});

async function open(page: Page, colorScheme: 'light' | 'dark'): Promise<void> {
  await page.emulateMedia({ colorScheme });
  await page.goto('/');
  await expect(chart(page)).toHaveAccessibleName(/step 0 of [1-9]/);
}

for (const width of [360, 1440]) {
  test.describe(`full page at ${String(width)} px`, () => {
    test.use({ viewport: { width, height: width === 360 ? 740 : 900 } });

    for (const colorScheme of ['light', 'dark'] as const) {
      test(`matches the ${colorScheme} reference`, async ({ page }) => {
        await open(page, colorScheme);
        const paste = page.getByLabel('Paste numbers');
        await paste.fill(VALUES);
        await page.getByRole('button', { name: 'Use these numbers' }).click();
        await expect(chart(page)).toHaveAccessibleName(/^Bar chart of 30 values.*step 0 of [1-9]/);
        await paste.fill('');
        await page.evaluate(() => {
          (document.activeElement as HTMLElement | null)?.blur();
        });
        // Keep the pointer off every control so no hover style is captured.
        await page.mouse.move(0, 0);

        await expect(page).toHaveScreenshot(`${colorScheme}-${String(width)}.png`, {
          ...screenshotOptions,
          fullPage: true,
        });
      });
    }
  });
}

test.describe('Data panel states', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`shows the paste error in the ${colorScheme} theme`, async ({ page }) => {
      await open(page, colorScheme);
      await page.getByLabel('Paste numbers').fill('1, two, 3');
      await page.getByRole('button', { name: 'Use these numbers' }).click();
      await expect(dataPanel(page).getByText(/'two' is not a number/)).toBeVisible();
      await page.mouse.move(0, 0);

      await expect(dataPanel(page)).toHaveScreenshot(
        `data-error-${colorScheme}.png`,
        screenshotOptions,
      );
    });

    test(`shows the Upload file focus outline in the ${colorScheme} theme`, async ({ page }) => {
      await open(page, colorScheme);
      await page.getByRole('button', { name: 'Generate' }).focus();
      // A real key press, so :focus-visible applies to the file input.
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Upload file')).toBeFocused();

      await expect(dataPanel(page)).toHaveScreenshot(
        `upload-focus-${colorScheme}.png`,
        screenshotOptions,
      );
    });
  }
});
