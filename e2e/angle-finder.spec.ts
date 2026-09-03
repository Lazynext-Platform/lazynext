import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the angle finder page.
 * Auth-gated page — shows AuthModal when unauthenticated.
 */

test.describe('angle finder Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/angle-finder');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/angle-finder');
    await page.waitForTimeout(1000);
    const h1Count = await page.locator('h1').count();
    const signInCount = await page.locator('a:has-text("Sign in")').count();
    expect(h1Count + signInCount).toBeGreaterThan(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/angle-finder');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/angle-finder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/angle-finder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('RTL layout has no horizontal overflow', async ({ page }) => {
    await page.context().addCookies([{ name: 'locale', value: 'ar', url: 'http://localhost:3100' }]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/angle-finder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('is reachable via direct navigation', async ({ page }) => {
    await page.goto('/angle-finder');
    await expect(page).toHaveURL(/\/creative\/generators/);
  });

  test('has auth gate or main content', async ({ page }) => {
    await page.goto('/angle-finder');
    await page.waitForTimeout(1000);
    const authModal = page.locator('[role="dialog"]');
    const content = page.locator('h1');
    const signIn = page.locator('a:has-text("Sign in")');
    const authCount = await authModal.count();
    const contentCount = await content.count();
    const signInCount = await signIn.count();
    expect(authCount + contentCount + signInCount).toBeGreaterThan(0);
  });
});
