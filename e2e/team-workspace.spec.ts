import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for Team Collaboration v2 pages.
 * Same pattern as e2e/new-features.spec.ts — auth-gated pages show AuthModal
 * when unauthenticated, so we test page-level structure only.
 */

// ── Teams listing page ──

test.describe('Teams Listing Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/teams');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/teams');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('has #main-content or auth gate', async ({ page }) => {
    await page.goto('/teams');
    // Unauthenticated: AuthModal is present
    // Authenticated: page content is present
    const authModal = page.locator('[role="dialog"]');
    const mainContent = page.locator('#main-content');
    // At least one should be present
    const authCount = await authModal.count();
    const mainCount = await mainContent.count();
    expect(authCount + mainCount).toBeGreaterThan(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/teams');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/teams');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/teams');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('is reachable via direct navigation', async ({ page }) => {
    await page.goto('/teams');
    await expect(page).toHaveURL(/\/teams/);
  });
});

// ── Team workspace page ──

test.describe('Team Workspace Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/teams/test-team-id');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/teams/test-team-id');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/teams/test-team-id');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.*/);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/teams/test-team-id');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/teams/test-team-id');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('is reachable via direct navigation', async ({ page }) => {
    await page.goto('/teams/test-team-id');
    await expect(page).toHaveURL(/\/teams\/test-team-id/);
  });
});
