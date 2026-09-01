import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for intelligence/insights pages.
 * Auth-gated pages — show AuthModal or main content when unauthenticated.
 *
 * Note: `intelligence`, `leaderboard`, and `url-to-brief` only expose API routes
 * (no page directory under src/app), so they are intentionally omitted here.
 */

const pages = [
  'audience-insights',
  'brand-concepts',
  'brand-voice',
  'brief-intelligence',
  'competitor-intel',
  'fatigue',
  'forecasting',
  'ml-insights',
  'quality-scoring',
  'repurposing',
  'scene-analysis',
  'shot-planner',
  'trend-intelligence',
  'viral-analyzer',
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
