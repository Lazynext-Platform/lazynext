import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the Creative Workflow Builder page.
 * /workflow-builder redirects to /creative/pipelines (next.config.mjs)
 * When unauthenticated, the page shows a "Sign in" link instead of h1 content.
 */

test.describe('Workflow Builder Page (redirected to /creative/pipelines)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('redirects to /creative/pipelines', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page).toHaveURL(/\/creative\/pipelines/);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('shows auth gate or main content', async ({ page }) => {
    await page.goto('/workflow-builder');
    await page.waitForTimeout(1000);
    // When unauthenticated, the page shows a "Sign in" link or h1 content
    const h1Count = await page.locator('h1').count();
    const signInCount = await page.locator('a:has-text("Sign in")').count();
    expect(h1Count + signInCount).toBeGreaterThan(0);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/workflow-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/workflow-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 280px', async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 600 });
    await page.goto('/workflow-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/workflow-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('RTL layout has no horizontal overflow', async ({ page }) => {
    await page.context().addCookies([{ name: 'locale', value: 'ar', url: 'http://localhost:3100' }]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/workflow-builder');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('dashboard config includes workflow-builder route', async ({ page }) => {
    // Verify the route exists by navigating to it (even if auth-gated)
    const response = await page.goto('/workflow-builder');
    expect(response?.status()).toBeLessThan(400);
  });
});
