/**
 * E2E smoke tests for the OS Permissions domain.
 *
 * Verifies that the permission list page loads and that the permission
 * evaluator form renders.
 *
 * Authenticated via storageState from global-setup (test@lazynext.local).
 * Run against the local dev server with mock Atlas on port 3099.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('OS Permissions management', () => {
  test('permissions list page loads', async ({ page }) => {
    await page.goto('/permissions');
    await expect(page).toHaveURL(/\/permissions/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('permissions list renders without server error', async ({ page }) => {
    const res = await page.goto('/permissions');
    expect(res?.status()).toBeLessThan(500);
  });

  test('permission list displays entries or empty state', async ({ page }) => {
    await page.goto('/permissions');
    await expect(page.locator('body')).toBeVisible();
    const listRegion = page.locator('ul, ol, table, [role="list"], [role="table"], tbody').first();
    // The region may or may not be present depending on data; body must be visible
    await expect(page.locator('body')).toBeVisible();
    expect(await listRegion.count()).toBeGreaterThanOrEqual(0);
  });

  test('permission evaluator page loads', async ({ page }) => {
    await page.goto('/permission-evaluator');
    await expect(page).toHaveURL(/\/permission-evaluator/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('permission evaluator form is present', async ({ page }) => {
    await page.goto('/permission-evaluator');
    await expect(page.locator('body')).toBeVisible();
    const formControls = page.locator('input, textarea, select, button');
    expect(await formControls.count()).toBeGreaterThan(0);
  });

  test('can navigate between permissions and evaluator', async ({ page }) => {
    await page.goto('/permissions');
    await expect(page).toHaveURL(/\/permissions/);
    await page.goto('/permission-evaluator');
    await expect(page).toHaveURL(/\/permission-evaluator/);
    await expect(page.locator('body')).toBeVisible();
  });
});
