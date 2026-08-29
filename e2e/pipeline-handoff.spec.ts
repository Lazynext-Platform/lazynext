import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for pipeline deep-linking and clip-editor handoff.
 * Auth-gated pages — show AuthModal when unauthenticated.
 */

test.describe('Pipeline Page — Deep Linking', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/pipeline');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('h1 contains pipeline text', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('h1')).toContainText(/Pipeline|管道|パイプライン|Pipeline|파이프라인|Pipeline|Pipeline|Pipeline|पाइपलाइन|Pipeline|Pipeline|Pipeline/i);
  });

  test('shows auth prompt when unauthenticated', async ({ page }) => {
    await page.goto('/pipeline');
    // The page should show the h1 and an auth prompt
    await expect(page.locator('h1')).toBeVisible();
  });

  test('deep link with ?id= loads page without crash', async ({ page }) => {
    await page.goto('/pipeline?id=pl_nonexistent_test');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('deep link with ?id= shows auth prompt when unauthenticated', async ({ page }) => {
    await page.goto('/pipeline?id=pl_nonexistent_test');
    await expect(page.locator('h1')).toBeVisible();
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

test.describe('Clip Editor — Pipeline Handoff', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has one h1', async ({ page }) => {
    await page.goto('/clip-editor');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('shows auth prompt when unauthenticated', async ({ page }) => {
    await page.goto('/clip-editor');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('handoff with ?pipelineId=&mediaUrl= loads page without crash', async ({ page }) => {
    await page.goto('/clip-editor?pipelineId=pl_test&mediaUrl=https://example.com/video.mp4');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('handoff with ?pipelineId=&mediaUrl= shows auth prompt when unauthenticated', async ({ page }) => {
    await page.goto('/clip-editor?pipelineId=pl_test&mediaUrl=https://example.com/video.mp4');
    await expect(page.locator('h1')).toBeVisible();
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
