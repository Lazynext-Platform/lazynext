import { test, expect } from '@playwright/test';

/**
 * E2E page-coverage smoke tests for the 39 pages without dedicated E2E specs.
 *
 * Each test verifies a page renders without errors by:
 * - Navigating to the page
 * - Asserting the response is OK (or acceptable for invalid-token pages)
 * - Checking for an h1 or main content (#main-content)
 * - Verifying no horizontal overflow at a narrow viewport
 *
 * Public pages (no auth): /privacy, /terms, /reset-password, /share/[token]
 * Authenticated pages: all others use the saved storageState from global-setup.
 */

/**
 * Helper that navigates to a page, asserts it loads, checks for an h1 or
 * #main-content, and verifies no horizontal overflow at 375px.
 */
async function assertPageLoads(page: import('@playwright/test').Page, path: string) {
  const res = await page.goto(path);
  expect(res, `GET ${path} should return a response`).not.toBeNull();
  // Accept OK or 404 (e.g. invalid share token, missing my-work id)
  const status = res!.status();
  expect([200, 404]).toContain(status);

  // Wait for hydration/render to settle
  await page.waitForLoadState('networkidle').catch(() => {});

  // Page should have either an h1 or #main-content
  const hasH1 = await page.locator('h1').count().then((c) => c > 0);
  const hasMain = await page.locator('#main-content').count().then((c) => c > 0);
  expect(hasH1 || hasMain, `${path} should render an h1 or #main-content`).toBeTruthy();

  // Body should be visible (page rendered, not a hard crash)
  await expect(page.locator('body')).toBeVisible();

  // No horizontal overflow at 375px
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, `${path} should have no horizontal overflow at 375px`).toBeLessThanOrEqual(0);
}

// ---------------------------------------------------------------------------
// Public pages (no auth required)
// ---------------------------------------------------------------------------

test.describe('Public pages', () => {
  test('/privacy loads', async ({ page }) => {
    await assertPageLoads(page, '/privacy');
  });

  test('/terms loads', async ({ page }) => {
    await assertPageLoads(page, '/terms');
  });

  test('/reset-password loads', async ({ page }) => {
    await assertPageLoads(page, '/reset-password');
  });

  test('/share/[token] loads (invalid token shows error/not-found, that is OK)', async ({ page }) => {
    // An invalid token is acceptable — the page should still render (error or not-found UI).
    await assertPageLoads(page, '/share/invalid-e2e-token');
  });
});

// ---------------------------------------------------------------------------
// Authenticated page coverage
// ---------------------------------------------------------------------------

test.describe('Authenticated page coverage', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('/ab-test-results loads', async ({ page }) => {
    await assertPageLoads(page, '/ab-test-results');
  });

  test('/admin/feedback loads', async ({ page }) => {
    await assertPageLoads(page, '/admin/feedback');
  });

  test('/approvals loads', async ({ page }) => {
    await assertPageLoads(page, '/approvals');
  });

  test('/assets loads', async ({ page }) => {
    await assertPageLoads(page, '/assets');
  });

  test('/audience-insights loads', async ({ page }) => {
    await assertPageLoads(page, '/audience-insights');
  });

  test('/audio-studio loads', async ({ page }) => {
    await assertPageLoads(page, '/audio-studio');
  });

  test('/brand-voice loads', async ({ page }) => {
    await assertPageLoads(page, '/brand-voice');
  });

  test('/brief-intelligence loads', async ({ page }) => {
    await assertPageLoads(page, '/brief-intelligence');
  });

  test('/budget-optimizer loads', async ({ page }) => {
    await assertPageLoads(page, '/budget-optimizer');
  });

  test('/calendar loads', async ({ page }) => {
    await assertPageLoads(page, '/calendar');
  });

  test('/campaign-orchestrator loads', async ({ page }) => {
    await assertPageLoads(page, '/campaign-orchestrator');
  });

  test('/competitor-intel loads', async ({ page }) => {
    await assertPageLoads(page, '/competitor-intel');
  });

  test('/compliance loads', async ({ page }) => {
    await assertPageLoads(page, '/compliance');
  });

  test('/creative-diff loads', async ({ page }) => {
    await assertPageLoads(page, '/creative-diff');
  });

  test('/fatigue loads', async ({ page }) => {
    await assertPageLoads(page, '/fatigue');
  });

  test('/forecasting loads', async ({ page }) => {
    await assertPageLoads(page, '/forecasting');
  });

  test('/image-studio loads', async ({ page }) => {
    await assertPageLoads(page, '/image-studio');
  });

  test('/inspiration loads', async ({ page }) => {
    await assertPageLoads(page, '/inspiration');
  });

  test('/mcp-server loads', async ({ page }) => {
    await assertPageLoads(page, '/mcp-server');
  });

  test('/ml-insights loads', async ({ page }) => {
    await assertPageLoads(page, '/ml-insights');
  });

  test('/my-work/[id] loads (invalid id shows not-found, that is OK)', async ({ page }) => {
    await assertPageLoads(page, '/my-work/invalid-e2e-id');
  });

  test('/narrative-studio loads', async ({ page }) => {
    await assertPageLoads(page, '/narrative-studio');
  });

  test('/personas loads', async ({ page }) => {
    await assertPageLoads(page, '/personas');
  });

  test('/publish loads', async ({ page }) => {
    await assertPageLoads(page, '/publish');
  });

  test('/quality-scoring loads', async ({ page }) => {
    await assertPageLoads(page, '/quality-scoring');
  });

  test('/repurposing loads', async ({ page }) => {
    await assertPageLoads(page, '/repurposing');
  });

  test('/scene-analysis loads', async ({ page }) => {
    await assertPageLoads(page, '/scene-analysis');
  });

  test('/shot-planner loads', async ({ page }) => {
    await assertPageLoads(page, '/shot-planner');
  });

  test('/skills loads', async ({ page }) => {
    await assertPageLoads(page, '/skills');
  });

  test('/teams/join loads', async ({ page }) => {
    await assertPageLoads(page, '/teams/join');
  });

  test('/templates loads', async ({ page }) => {
    await assertPageLoads(page, '/templates');
  });

  test('/testing-lab loads', async ({ page }) => {
    await assertPageLoads(page, '/testing-lab');
  });

  test('/trend-intelligence loads', async ({ page }) => {
    await assertPageLoads(page, '/trend-intelligence');
  });

  test('/ugc-studio loads', async ({ page }) => {
    await assertPageLoads(page, '/ugc-studio');
  });

  test('/variant-matrix loads', async ({ page }) => {
    await assertPageLoads(page, '/variant-matrix');
  });
});
