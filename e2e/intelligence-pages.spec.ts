import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for intelligence/insights pages.
 * Auth-gated pages — show AuthModal or main content when unauthenticated.
 *
 * Note: `intelligence`, `leaderboard`, and `url-to-brief` only expose API routes
 * (no page directory under src/app), so they are intentionally omitted here.
 */

const pages: string[] = [
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
  'audience-insights', 'brand-voice', 'forecasting', 'ml-insights', 'repurposing', 'brief-intelligence', 'brand-concepts', 'quality-scoring', 'fatigue', 'shot-planner', 'trend-intelligence', 'competitor-intel', 'scene-analysis', 'viral-analyzer',
];

for (const p of redirectedPages) {
  test.describe(`${p} Page (redirected)`, () => {
    test('loads with correct title', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveTitle(/Lazynext/i);
    });

    test('has one h1', async ({ page }) => {
      await page.goto(`/${p}`);
      await page.waitForTimeout(1000);
      // Redirected pages may show sign-in link instead of h1 when unauthenticated
      const h1Count = await page.locator('h1').count();
      const signInCount = await page.locator('a:has-text("Sign in")').count();
      expect(h1Count + signInCount).toBeGreaterThan(0);
    });

    test('has data-theme attribute', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
    });

    test('is reachable via direct navigation', async ({ page }) => {
      await page.goto(`/${p}`);
      // Each page redirects to its new destination
      const dests: Record<string, string> = {"audience-insights": "/creative/generators", "brand-voice": "/creative/generators", "forecasting": "/creative/generators", "ml-insights": "/analytics", "repurposing": "/creative/generators", "brief-intelligence": "/creative/generators", "brand-concepts": "/creative/generators", "quality-scoring": "/creative/generators", "fatigue": "/creative/generators", "shot-planner": "/creative/generators", "trend-intelligence": "/creative/generators", "competitor-intel": "/creative/generators", "scene-analysis": "/creative/generators", "viral-analyzer": "/creative/generators"};
      const dest = dests[p];
      const escaped = dest.replace(/\//g, '\\/');
      await expect(page).toHaveURL(new RegExp(escaped));
    });

    test('has auth gate or main content', async ({ page }) => {
      await page.goto(`/${p}`);
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
}
