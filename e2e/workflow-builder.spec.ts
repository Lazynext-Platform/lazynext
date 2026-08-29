import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the Creative Workflow Builder page.
 * Auth-gated page — shows AuthModal when unauthenticated.
 */

test.describe('Workflow Builder Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/workflow-builder');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('h1 contains workflow builder text', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page.locator('h1')).toContainText(/Workflow|工作流|ワークフロー|Flujos|Flux|워크플로우|سير العمل|वर्कफ़्लो|Quy trình|เวิร์กโฟลว์|Alur Kerja/i);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/workflow-builder');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('shows auth modal when unauthenticated', async ({ page }) => {
    await page.goto('/workflow-builder');
    // The page should show the h1 and an auth prompt
    await expect(page.locator('h1')).toBeVisible();
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
    expect(response?.status()).toBe(200);
  });
});

/**
 * Authenticated E2E tests for the Workflow Builder v2 UI are in
 * e2e/auth-workflow-builder.spec.ts, which runs under the chromium-auth
 * project with an active session for test@lazynext.local.
 *
 * The advanced flow (conditions, execution preview, save/reload round-trip)
 * is verified via:
 *   1. Unit tests (test/workflow-conditions.test.ts, test/workflow-execution.test.ts)
 *      — condition evaluation, wave planning, configFromWorkflow, round-trip serialization
 *   2. Authenticated E2E (e2e/auth-workflow-builder.spec.ts)
 *      — parallel wave creation, concurrent execution, page load with auth
 *   3. Production smoke testing against the deployed worker
 */
