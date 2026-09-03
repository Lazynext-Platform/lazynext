import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the /creative-assets browsing page.
 * /creative-assets redirects to /creative/generators (proxy.ts)
 */

test.describe('Creative Assets Page (redirected to /creative/generators)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/creative-assets');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/creative-assets');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText(/Creative Generators/i);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-assets');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-assets');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-assets');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/creative-assets');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('redirects to /creative/generators', async ({ page }) => {
    await page.goto('/creative-assets');
    await expect(page).toHaveURL(/\/creative\/generators/);
  });
});
