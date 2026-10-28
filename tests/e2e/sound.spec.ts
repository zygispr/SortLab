import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers';

/** User Story 4 — hear the sort (quickstart.md → Story 4, steps 1–4). */

test('turn sound on, mute it, and keep the choice after a reload', async ({ page }) => {
  // A fresh browser context has no stored settings: sound is off and the prompt shows.
  await page.goto('/');
  const turnOn = page.getByRole('button', { name: 'Turn on sound', exact: true });
  await expect(turnOn).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unmute', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectNoA11yViolations(page);

  await turnOn.click();
  await expect(turnOn).toBeHidden();
  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  await expect(mute).toHaveAttribute('aria-pressed', 'false');

  // Sorting continues with sound on; Mute applies at once.
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await mute.click();
  const unmute = page.getByRole('button', { name: 'Unmute', exact: true });
  await expect(unmute).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

  await page.reload();
  await expect(unmute).toHaveAttribute('aria-pressed', 'true');
  await expect(turnOn).toBeHidden();
  await expect(page.getByRole('button', { name: 'Not now', exact: true })).toBeHidden();
  await expectNoA11yViolations(page);
});

test('"Not now" hides the prompt for good and stays muted', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Turn on sound', exact: true })).toBeHidden();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unmute', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Turn on sound', exact: true })).toBeHidden();
});
