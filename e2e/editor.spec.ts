import { test, expect } from '@playwright/test';

test.describe('Editor page (/editor)', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/editor');
    await expect(page).toHaveTitle(/Lazynext/i);
  });

  test('has data-theme attribute', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('[data-theme]')).toHaveCount(1);
  });

  test('has exactly one h1', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('has three tabs: Rough Cut, Skills, Timeline', async ({ page }) => {
    await page.goto('/editor');
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);
  });

  test('rough cut tab is active by default', async ({ page }) => {
    await page.goto('/editor');
    const firstTab = page.locator('[role="tab"]').first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  test('has transcript textarea on rough cut tab', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('#transcript')).toHaveCount(1);
  });

  test('has generate button on rough cut tab', async ({ page }) => {
    await page.goto('/editor');
    // The generate button is the one with Scissors icon (not a tab)
    const btn = page.locator('section button').filter({ hasNot: page.locator('[role="tab"]') }).first();
    await expect(btn).toBeVisible();
  });

  test('can switch to skills tab', async ({ page }) => {
    await page.goto('/editor');
    const skillsTab = page.locator('[role="tab"]').nth(1);
    await skillsTab.click();
    await expect(skillsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to timeline tab', async ({ page }) => {
    await page.goto('/editor');
    const timelineTab = page.locator('[role="tab"]').nth(2);
    await timelineTab.click();
    await expect(timelineTab).toHaveAttribute('aria-selected', 'true');
  });

  test('timeline tab has name input', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('[role="tab"]').nth(2).click();
    await expect(page.locator('#tlName')).toHaveCount(1);
  });

  test('no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/editor');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no horizontal overflow at 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/editor');
    await page.waitForTimeout(500);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/editor');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('all textareas have accessible names', async ({ page }) => {
    await page.goto('/editor');
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    for (let i = 0; i < count; i++) {
      const ta = textareas.nth(i);
      const ariaLabel = await ta.getAttribute('aria-label');
      const id = await ta.getAttribute('id');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(ariaLabel || hasLabel, `textarea ${i} should have accessible name`).toBeTruthy();
    }
  });

  test('all selects have accessible names', async ({ page }) => {
    await page.goto('/editor');
    // Switch to timeline tab to reveal selects
    await page.locator('[role="tab"]').nth(2).click();
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      const ariaLabel = await sel.getAttribute('aria-label');
      const id = await sel.getAttribute('id');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(ariaLabel || hasLabel, `select ${i} should have accessible name`).toBeTruthy();
    }
  });
});

test.describe('Editor page — transcript from URL query param (Director → Editor flow)', () => {
  test('editor page reads transcript from URL query param', async ({ page }) => {
    const transcript = JSON.stringify({
      text: 'test',
      duration: 6,
      segments: [
        { start: 0, end: 3, text: 'hello' },
        { start: 3, end: 6, text: 'world' },
      ],
    });
    await page.goto(`/editor?transcript=${encodeURIComponent(transcript)}`);
    const textarea = page.locator('#transcript');
    await expect(textarea).toHaveCount(1);
    const value = await textarea.inputValue();
    expect(value).toContain('hello');
    expect(value).toContain('world');
    // Should not be the default sample transcript
    expect(value).not.toContain('Hey guys today I want to show you this amazing product.');
  });

  test('editor page handles invalid transcript query param gracefully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/editor?transcript=invalid-json');
    const textarea = page.locator('#transcript');
    await expect(textarea).toHaveCount(1);
    const value = await textarea.inputValue();
    expect(value.trim().length).toBeGreaterThan(0);
    // Falls back to sample transcript
    expect(value).toContain('Hey guys today I want to show you this amazing product.');
    expect(errors).toEqual([]);
  });

  test('editor page handles empty transcript query param', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/editor?transcript=');
    const textarea = page.locator('#transcript');
    await expect(textarea).toHaveCount(1);
    const value = await textarea.inputValue();
    expect(value.trim().length).toBeGreaterThan(0);
    // Falls back to sample transcript
    expect(value).toContain('Hey guys today I want to show you this amazing product.');
    expect(errors).toEqual([]);
  });

  test('creative-director page has send to editor link when results exist', async ({ page }) => {
    // Smoke test: at idle (no results), the "Send to Editor" link should NOT exist
    // in the results section. The nav bar link to /editor always exists, so we
    // check for links with a transcript query param (only present in the Send to Editor link).
    await page.goto('/creative-director');
    await page.waitForTimeout(1000);
    const sendToEditorLinks = page.locator('a[href*="/editor?transcript="]');
    await expect(sendToEditorLinks).toHaveCount(0);
  });
});

test.describe('Editor page — OCR section (Rough Cut tab)', () => {
  test('OCR section is visible on Rough Cut tab', async ({ page }) => {
    await page.goto('/editor');
    // Rough Cut is the default tab; verify the OCR input and its label are visible
    await expect(page.locator('#ocrImageUrl')).toBeVisible();
    await expect(page.locator('label[for="ocrImageUrl"]')).toBeVisible();
  });

  test('OCR section has image URL input and run button', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('#ocrImageUrl')).toHaveCount(1);
    // The run button is the adjacent sibling of the OCR input
    const ocrRunBtn = page.locator('#ocrImageUrl + button');
    await expect(ocrRunBtn).toHaveCount(1);
    await expect(ocrRunBtn).toBeVisible();
  });
});

test.describe('Editor page — Timeline persistence (Timeline tab)', () => {
  test('Timeline tab shows saved timelines section', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('[role="tab"]').nth(2).click();
    // The saved timelines section is identified by its h3 heading
    const savedListHeading = page.locator('section h3');
    await expect(savedListHeading).toHaveCount(1);
    await expect(savedListHeading).toBeVisible();
  });

  test('Timeline tab shows no saved timelines message when empty', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('[role="tab"]').nth(2).click();
    // When not authenticated, the saved list is empty and a message <p> appears
    // immediately after the saved-list h3 heading
    const noSavedMsg = page.locator('section h3 + p');
    await expect(noSavedMsg).toHaveCount(1);
    await expect(noSavedMsg).toBeVisible();
  });

  test('Timeline tab has create button', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('[role="tab"]').nth(2).click();
    // The create button is a direct child of the timeline section
    const createBtn = page.locator('section > button');
    await expect(createBtn).toHaveCount(1);
    await expect(createBtn).toBeVisible();
  });
});
