import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for pipeline deep-linking and clip-editor handoff.
 * /pipeline redirects to /creative/pipelines (next.config.mjs)
 * /clip-editor redirects to /creative (next.config.mjs)
 * When unauthenticated, pages show a "Sign in" link instead of h1 content.
 */

test.describe('Pipeline Page — Deep Linking (redirected to /creative/pipelines)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('redirects to /creative/pipelines', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page).toHaveURL(/\/creative\/pipelines/);
  });

  test('shows auth gate or main content', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForTimeout(1000);
    const h1Count = await page.locator('h1').count();
    const signInCount = await page.locator('a:has-text("Sign in")').count();
    expect(h1Count + signInCount).toBeGreaterThan(0);
  });

  test('deep link with ?id= loads page without crash', async ({ page }) => {
    await page.goto('/pipeline?id=pl_nonexistent_test');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('deep link with ?id= shows auth gate or main content', async ({ page }) => {
    await page.goto('/pipeline?id=pl_nonexistent_test');
    await page.waitForTimeout(1000);
    const h1Count = await page.locator('h1').count();
    const signInCount = await page.locator('a:has-text("Sign in")').count();
    expect(h1Count + signInCount).toBeGreaterThan(0);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/pipeline');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/pipeline');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('RTL layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/pipeline');
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Clip Editor — Pipeline Handoff (redirected to /creative)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('redirects to /creative', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page).toHaveURL(/\/creative/);
  });

  test('shows auth gate or main content', async ({ page }) => {
    await page.goto('/clip-editor');
    await page.waitForTimeout(1000);
    const h1Count = await page.locator('h1').count();
    const signInCount = await page.locator('a:has-text("Sign in")').count();
    expect(h1Count + signInCount).toBeGreaterThan(0);
  });

  test('handoff with ?pipelineId=&mediaUrl= loads page without crash', async ({ page }) => {
    await page.goto('/clip-editor?pipelineId=pl_test&mediaUrl=https://example.com/video.mp4');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('handoff with ?pipelineId=&mediaUrl= shows auth gate or main content', async ({ page }) => {
    await page.goto('/clip-editor?pipelineId=pl_test&mediaUrl=https://example.com/video.mp4');
    await page.waitForTimeout(1000);
    const h1Count = await page.locator('h1').count();
    const signInCount = await page.locator('a:has-text("Sign in")').count();
    expect(h1Count + signInCount).toBeGreaterThan(0);
  });

  test('has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/clip-editor?pipelineId=pl_test&mediaUrl=https://example.com/video.mp4');
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('RTL layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/clip-editor');
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
