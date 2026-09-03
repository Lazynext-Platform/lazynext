import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the Creative Studio page.
 * /creative-studio redirects to /creative (next.config.mjs)
 */

test.describe('Creative Studio Page (redirected to /creative)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/creative-studio');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('redirects to /creative', async ({ page }) => {
    await page.goto('/creative-studio');
    await expect(page).toHaveURL(/\/creative/);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-studio');
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-studio');
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('page has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-studio');
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });
});
