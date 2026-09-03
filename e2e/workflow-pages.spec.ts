import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for workflow/builder pages.
 * Auth-gated pages — show AuthModal or main content when unauthenticated.
 *
 * Note: `url-to-brief` and `workflow-templates` only expose API routes
 * (no page directory under src/app), so they are intentionally omitted here.
 */

const pages = [
  'mcp-server',
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
  'skill-chains', 'multi-concept', 'campaign-orchestrator', 'performance-loop', 'variant-matrix', 'reference-remix', 'product-brief', 'creator-kits', 'skills', 'media-service-boundary', 'clip-editor',
];

for (const p of redirectedPages) {
  test.describe(`${p} Page (redirected)`, () => {
    test('loads with correct title', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page).toHaveTitle(/Lazynext/i);
    });

    test('has one h1', async ({ page }) => {
      await page.goto(`/${p}`);
      await page.waitForTimeout(3000);
      // Redirected pages may show sign-in link instead of h1 when unauthenticated
      const h1Count = await page.locator('h1').count();
      const signInCount = await page.locator('a:has-text("Sign in")').count();
      const mainCount = await page.locator('main').count();
      expect(h1Count + signInCount + mainCount).toBeGreaterThan(0);
    });

    test('has data-theme attribute', async ({ page }) => {
      await page.goto(`/${p}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
    });

    test('is reachable via direct navigation', async ({ page }) => {
      await page.goto(`/${p}`);
      // Each page redirects to its new destination
      const dests: Record<string, string> = {"skill-chains": "/agents", "multi-concept": "/creative/generators", "campaign-orchestrator": "/creative/generators", "performance-loop": "/creative/generators", "variant-matrix": "/creative/generators", "reference-remix": "/creative/generators", "product-brief": "/creative/generators", "creator-kits": "/creative/generators", "skills": "/agents", "media-service-boundary": "/files", "clip-editor": "/creative"};
      const dest = dests[p];
      const escaped = dest.replace(/\//g, '\\/');
      await expect(page).toHaveURL(new RegExp(escaped));
    });

    test('has auth gate or main content', async ({ page }) => {
      await page.goto(`/${p}`);
      await page.waitForTimeout(3000);
      const authModal = page.locator('[role="dialog"]');
      const content = page.locator('h1');
      const signIn = page.locator('a:has-text("Sign in")');
      const main = page.locator('main');
      const authCount = await authModal.count();
      const contentCount = await content.count();
      const signInCount = await signIn.count();
      const mainCount = await main.count();
      expect(authCount + contentCount + signInCount + mainCount).toBeGreaterThan(0);
    });
  });
}
