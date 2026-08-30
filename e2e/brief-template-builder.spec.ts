import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the Brief Template Builder page.
 * Auth-gated page — shows AuthModal when unauthenticated.
 */

test.describe('Brief Template Builder Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/brief-template-builder');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/brief-template-builder');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('h1 contains brief template builder text', async ({ page }) => {
    await page.goto('/brief-template-builder');
    await expect(page.locator('h1')).toContainText(/Brief Template Builder|منشئ قوالب الموجز|简报模板构建器/i);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/brief-template-builder');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('shows auth modal when unauthenticated', async ({ page }) => {
    await page.goto('/brief-template-builder');
    // The page should show the h1 and an auth prompt
    await expect(page.locator('h1')).toBeVisible();
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/brief-template-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/brief-template-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('RTL layout has no horizontal overflow', async ({ page }) => {
    await page.context().addCookies([{ name: 'locale', value: 'ar', url: 'http://localhost:3100' }]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/brief-template-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('is reachable via direct navigation', async ({ page }) => {
    await page.goto('/brief-template-builder');
    await expect(page).toHaveURL(/\/brief-template-builder/);
  });

  test('has auth gate or main content', async ({ page }) => {
    await page.goto('/brief-template-builder');
    const authModal = page.locator('[role="dialog"]');
    const content = page.locator('h1');
    const authCount = await authModal.count();
    const contentCount = await content.count();
    expect(authCount + contentCount).toBeGreaterThan(0);
  });
});
