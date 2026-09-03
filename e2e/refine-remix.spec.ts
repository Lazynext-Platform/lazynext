import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for two conversational-iteration features:
 *
 * 1. Conversational Refinement UI on /creative-director (→ /creative)
 * 2. viral2viral Remix Button on /creative-studio (→ /creative)
 *
 * Both routes redirect to /creative via next.config.mjs.
 * Smoke tests verify the page loads, has correct title, no overflow, and
 * the refine/remix UI elements are absent at idle (unauthenticated).
 */

test.describe('Conversational Refinement UI (/creative-director → /creative)', () => {
  test('refine section is NOT visible when there are no results', async ({ page }) => {
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const refineHeading = page.locator('h2', { hasText: /^Refine$/i });
    await expect(refineHeading).toHaveCount(0);
  });

  test('refine section appears only after results are shown (absent at idle)', async ({ page }) => {
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    await expect(page.locator('#refine-target')).toHaveCount(0);
    await expect(page.locator('#refine-instruction')).toHaveCount(0);
  });

  test('refine section has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('refine section has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('page has data-theme attribute', async ({ page }) => {
    await page.goto('/creative-director');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });
});

test.describe('viral2viral Remix Button (/creative-studio → /creative)', () => {
  test('remix button is NOT visible when there is no reference analysis', async ({ page }) => {
    await page.goto('/creative-studio');
    await page.waitForTimeout(1000);
    const remixBtn = page.locator('button', { hasText: /^Remix$/i });
    await expect(remixBtn).toHaveCount(0);
  });

  test('page loads with correct title', async ({ page }) => {
    await page.goto('/creative-studio');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/creative-studio');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/creative-studio');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('data-theme attribute is present', async ({ page }) => {
    await page.goto('/creative-studio');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });
});
