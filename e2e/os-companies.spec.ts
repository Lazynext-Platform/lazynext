/**
 * E2E smoke tests for the OS Company domain.
 *
 * Verifies that the company page loads and that the company creation
 * form renders.
 *
 * Authenticated via storageState from global-setup (test@lazynext.local).
 * Run against the local dev server with mock Atlas on port 3099.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('OS Company management', () => {
  test('company page loads', async ({ page }) => {
    await page.goto('/company');
    await expect(page).toHaveURL(/\/company/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('company page renders without server error', async ({ page }) => {
    const res = await page.goto('/company');
    expect(res?.status()).toBeLessThan(500);
  });

  test('company creation page loads', async ({ page }) => {
    await page.goto('/company/new');
    await expect(page).toHaveURL(/\/company\/new/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('company creation form is present', async ({ page }) => {
    await page.goto('/company/new');
    await expect(page.locator('body')).toBeVisible();
    const formControls = page.locator('input, textarea, select, button');
    expect(await formControls.count()).toBeGreaterThan(0);
  });

  test('can navigate between company list and creation', async ({ page }) => {
    await page.goto('/company');
    await expect(page).toHaveURL(/\/company/);
    await page.goto('/company/new');
    await expect(page).toHaveURL(/\/company\/new/);
    await expect(page.locator('body')).toBeVisible();
  });
});
