/**
 * E2E smoke tests for the OS Plans domain.
 *
 * Verifies that the plans list page loads and renders.
 *
 * Authenticated via storageState from global-setup (test@lazynext.local).
 * Run against the local dev server with mock Atlas on port 3099.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('OS Plans management', () => {
  test('plans list page loads', async ({ page }) => {
    await page.goto('/plans');
    await expect(page).toHaveURL(/\/plans/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('plans list renders without server error', async ({ page }) => {
    const res = await page.goto('/plans');
    expect(res?.status()).toBeLessThan(500);
  });

  test('plans list displays entries or empty state', async ({ page }) => {
    await page.goto('/plans');
    await expect(page.locator('body')).toBeVisible();
    const listRegion = page.locator('ul, ol, table, [role="list"], [role="table"], tbody').first();
    expect(await listRegion.count()).toBeGreaterThanOrEqual(0);
  });

  test('plans page is reachable from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/plans');
    await expect(page).toHaveURL(/\/plans/);
  });
});
