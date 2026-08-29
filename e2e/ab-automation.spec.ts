import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the AI A/B Automation page.
 * Auth-gated page — shows AuthModal when unauthenticated.
 */

test.describe('AB Automation Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ab-automation');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/ab-automation');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/ab-automation');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/ab-automation');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/ab-automation');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('is reachable via direct navigation', async ({ page }) => {
    await page.goto('/ab-automation');
    await expect(page).toHaveURL(/\/ab-automation/);
  });

  test('has auth gate or main content', async ({ page }) => {
    await page.goto('/ab-automation');
    const authModal = page.locator('[role="dialog"]');
    const content = page.locator('h1');
    const authCount = await authModal.count();
    const contentCount = await content.count();
    expect(authCount + contentCount).toBeGreaterThan(0);
  });
});
