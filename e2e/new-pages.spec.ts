import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the three new pages added in the ad-platforms/director/performance phase.
 *
 * Note: /creative-director → /creative, /performance → /analytics (next.config.mjs redirects)
 * /ads is a real page. Nav links are tested on /dashboard (which has the Shell).
 */

test.describe('Creative Director Page (redirected to /creative)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/creative-director');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('redirects to /creative', async ({ page }) => {
    await page.goto('/creative-director');
    await expect(page).toHaveURL(/\/creative/);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-director');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/creative-director');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

test.describe('Ad Campaigns Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ads');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/ads');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/ads');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/ads');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/ads');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

test.describe('Performance Dashboard Page (redirected to /analytics)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/performance');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('redirects to /analytics', async ({ page }) => {
    await page.goto('/performance');
    await expect(page).toHaveURL(/\/analytics/);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/performance');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/performance');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/performance');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/performance');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

test.describe('Header Navigation Links', () => {
  test('nav links are visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    // The OsShell nav has links: Dashboard, Projects, Tasks, Documents, Files, Creative, Automations
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Creative' })).toBeVisible();
  });

  test('nav links are hidden on mobile (<768px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    // Main nav should be hidden on narrow screens (lg:flex)
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeHidden();
  });

  test('clicking Creative nav link navigates to /creative', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    await page.locator('nav[aria-label="Main navigation"] a', { hasText: 'Creative' }).click();
    await expect(page).toHaveURL(/\/creative/);
  });

  test('clicking Dashboard nav link navigates to /dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/creative');
    await page.waitForTimeout(1000);
    await page.locator('nav[aria-label="Main navigation"] a', { hasText: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
