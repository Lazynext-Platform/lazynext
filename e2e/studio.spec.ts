import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for old studio pages.
 * All routes redirect: /lazynext-studio → /creative, /drama-studio → /creative,
 * /ad-skit → /creative/generators, /ad-reference → /creative/generators
 */

test.describe('Lazynext Studio (redirected to /creative)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/lazynext-studio');
    await expect(page).toHaveTitle(/Lazynext/);
  });

  test('redirects to /creative', async ({ page }) => {
    await page.goto('/lazynext-studio');
    await expect(page).toHaveURL(/\/creative/);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/lazynext-studio');
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Drama Studio (redirected to /creative)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/drama-studio');
    await expect(page).toHaveTitle(/Lazynext/);
  });

  test('redirects to /creative', async ({ page }) => {
    await page.goto('/drama-studio');
    await expect(page).toHaveURL(/\/creative/);
  });
});

test.describe('Ad-Skit (redirected to /creative/generators)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ad-skit');
    await expect(page).toHaveTitle(/Lazynext/);
  });

  test('redirects to /creative/generators', async ({ page }) => {
    await page.goto('/ad-skit');
    await expect(page).toHaveURL(/\/creative\/generators/);
  });
});

test.describe('Ad-Reference (redirected to /creative/generators)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/ad-reference');
    await expect(page).toHaveTitle(/Lazynext/);
  });

  test('redirects to /creative/generators', async ({ page }) => {
    await page.goto('/ad-reference');
    await expect(page).toHaveURL(/\/creative\/generators/);
  });
});
