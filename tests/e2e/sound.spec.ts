import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers';

/** User Story 4 — hear the sort (quickstart.md → Story 4, steps 1–4). */

test('unmute, mute again, and keep the choice after a reload', async ({ page }) => {
  // A fresh browser context has no stored settings: sound is off, with no prompt.
  await page.goto('/');
  const unmute = page.getByRole('button', { name: 'Unmute', exact: true });
  await expect(unmute).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Turn on sound', exact: true })).toHaveCount(0);
  await expectNoA11yViolations(page);

  await unmute.click();
  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  await expect(mute).toHaveAttribute('aria-pressed', 'false');

  // Sorting continues with sound on; Mute applies at once.
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await mute.click();
  await expect(unmute).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

  await page.reload();
  await expect(unmute).toHaveAttribute('aria-pressed', 'true');
  await expectNoA11yViolations(page);
});
