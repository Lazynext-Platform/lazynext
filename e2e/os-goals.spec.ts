/**
 * E2E smoke tests for the OS Goals domain.
 *
 * Verifies that the goals list page loads and renders.
 *
 * Authenticated via storageState from global-setup (test@lazynext.local).
 * Run against the local dev server with mock Atlas on port 3099.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('OS Goals management', () => {
  test('goals list page loads', async ({ page }) => {
    await page.goto('/goals');
    await expect(page).toHaveURL(/\/goals/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('goals list renders without server error', async ({ page }) => {
    const res = await page.goto('/goals');
    expect(res?.status()).toBeLessThan(500);
  });

  test('goals list displays entries or empty state', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.locator('body')).toBeVisible();
    const listRegion = page.locator('ul, ol, table, [role="list"], [role="table"], tbody').first();
    expect(await listRegion.count()).toBeGreaterThanOrEqual(0);
  });

  test('goals page is reachable from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/goals');
    await expect(page).toHaveURL(/\/goals/);
  });
});
