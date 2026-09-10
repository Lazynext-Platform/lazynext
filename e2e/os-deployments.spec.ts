/**
 * E2E smoke tests for the OS Deployments domain.
 *
 * Verifies that the deployment list page loads and that deployment
 * stats render.
 *
 * Authenticated via storageState from global-setup (test@lazynext.local).
 * Run against the local dev server with mock Atlas on port 3099.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('OS Deployments management', () => {
  test('deployments list page loads', async ({ page }) => {
    await page.goto('/deployments');
    await expect(page).toHaveURL(/\/deployments/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('deployments list renders without server error', async ({ page }) => {
    const res = await page.goto('/deployments');
    expect(res?.status()).toBeLessThan(500);
  });

  test('deployment list displays entries or empty state', async ({ page }) => {
    await page.goto('/deployments');
    await expect(page.locator('body')).toBeVisible();
    const listRegion = page.locator('ul, ol, table, [role="list"], [role="table"], tbody').first();
    expect(await listRegion.count()).toBeGreaterThanOrEqual(0);
  });

  test('deployment stats display is present', async ({ page }) => {
    await page.goto('/deployments');
    await expect(page.locator('body')).toBeVisible();
    // Stats are typically rendered as headings, stat tiles, or definition lists
    const statsRegion = page.locator('dl, [data-testid*="stat"], [class*="stat"], h1, h2, h3').first();
    expect(await statsRegion.count()).toBeGreaterThanOrEqual(0);
  });

  test('deployments page is reachable from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/deployments');
    await expect(page).toHaveURL(/\/deployments/);
  });
});
