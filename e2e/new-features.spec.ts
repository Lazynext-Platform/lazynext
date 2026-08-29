import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for the four new pages added in the creator-kits/brand-concepts/
 * clip-editor/media-service-boundary batch.
 *
 * Follows the same pattern as e2e/new-pages.spec.ts:
 * - Page loads with correct title
 * - Has exactly one h1
 * - No horizontal overflow at 375px and 1920px
 * - Has data-theme attribute
 * - Has #main-content
 * - Nav links are visible on desktop
 *
 * Note: These pages show an AuthModal when unauthenticated (the form component
 * is not rendered until authenticated), so form element tests are omitted.
 * The creative-director page renders forms even when unauthenticated, but
 * these 4 pages use an early-return auth gate pattern.
 */

// ── Creator Campaign Kits ──

test.describe('Creator Kits Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/creator-kits');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/creator-kits');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creator-kits');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creator-kits');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/creator-kits');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/creator-kits');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

// ── Brand-to-Multi-Concept ──

test.describe('Brand Concepts Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/brand-concepts');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/brand-concepts');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/brand-concepts');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/brand-concepts');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/brand-concepts');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/brand-concepts');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

// ── Conversational Clip Editor ──

test.describe('Clip Editor Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/clip-editor');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/clip-editor');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/clip-editor');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

// ── Media Service Boundary ──

test.describe('Media Service Boundary Page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/media-service-boundary');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/media-service-boundary');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/media-service-boundary');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/media-service-boundary');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/media-service-boundary');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('has #main-content', async ({ page }) => {
    await page.goto('/media-service-boundary');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

// ── Navigation ──

test.describe('New Pages Navigation', () => {
  test('nav links are visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Creator Kits' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Concepts' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Clip Edit' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Media API' })).toBeVisible();
  });

  test('Creator Kits page is reachable via direct navigation', async ({ page }) => {
    await page.goto('/creator-kits');
    await expect(page).toHaveURL(/\/creator-kits/);
  });

  test('Brand Concepts page is reachable via direct navigation', async ({ page }) => {
    await page.goto('/brand-concepts');
    await expect(page).toHaveURL(/\/brand-concepts/);
  });

  test('Clip Editor page is reachable via direct navigation', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page).toHaveURL(/\/clip-editor/);
  });

  test('Media Service Boundary page is reachable via direct navigation', async ({ page }) => {
    await page.goto('/media-service-boundary');
    await expect(page).toHaveURL(/\/media-service-boundary/);
  });
});
