import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the TT-series ad-creative designer pages.
 * Auth-gated pages — show AuthModal or main content when unauthenticated.
 */

const pages = [
  // All routes redirected
];

for (const p of pages) {
  test.describe(`${p} Page`, () => {
    test('loads with correct title', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveTitle(/Lazynext/i);
    });

    test('has one h1', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('has data-theme attribute', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
    });

    test('is reachable via direct navigation', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveURL(new RegExp(`/${p}`));
    });

    test('has auth gate or main content', async ({ page }) => {
      await page.goto(`/${p}`);
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      expect(authCount + contentCount).toBeGreaterThan(0);
    });
  });
}

// Redirected routes — these old pages redirect to new destinations
const redirectedPages = [
  'ad-creative-implementation-intention-designer', 'ad-creative-pain-of-paying-designer', 'ad-creative-choice-simplifier-designer', 'ad-creative-future-pacing-designer', 'ad-creative-hook-story-offer-designer', 'ad-creative-mental-accounting-designer',
];

for (const p of redirectedPages) {
  test.describe(`${p} Page (redirected)`, () => {
    test('loads with correct title', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveTitle(/Lazynext/i);
    });

    test('has one h1', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('has data-theme attribute', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
    });

    test('is reachable via direct navigation', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveURL(/\/creative\/generators/);
    });

    test('has auth gate or main content', async ({ page }) => {
      await page.goto(`/${p}`);
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      expect(authCount + contentCount).toBeGreaterThan(0);
    });
  });
}
