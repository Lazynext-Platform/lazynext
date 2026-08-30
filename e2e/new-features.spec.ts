/**
 * E2E tests for the 4 newest API endpoints and their pages.
 *
 * Covers:
 * 1. POST /api/creative/product-brief
 * 2. POST /api/creative/reference-remix
 * 3. POST /api/creative/multi-concept
 * 4. GET /api/ads/meta-safety and POST /api/ads/meta-approve
 *
 * Authenticated tests use storageState from global-setup (test@lazynext.local).
 * Rate-limited (429) responses skip the test gracefully.
 */
import { test, expect } from '@playwright/test';

// Run all tests in this file as the authenticated test account
// (test@lazynext.local). This mirrors the page-coverage.spec.ts pattern for
// authenticated coverage — the file is not named auth-*.spec.ts so it would
// otherwise run under the unauthenticated projects only.
test.use({ storageState: 'e2e/.auth/user.json' });

// ---------------------------------------------------------------------------
// Product Brief API
// ---------------------------------------------------------------------------

test.describe('Product Brief API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/product-brief');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
  });

  test('POST without auth returns 401', async ({ playwright }) => {
    // Use a fresh request context without auth storage state
    const request = await playwright.request.newContext({
      baseURL: 'http://localhost:3100',
      extraHTTPHeaders: { Cookie: '' },
    });
    try {
      const res = await request.post('/api/creative/product-brief', {
        data: { productName: 'Test', benefits: ['test'] },
        headers: { Cookie: '' },
      });
      expect([401, 403]).toContain(res.status());
    } finally {
      await request.dispose();
    }
  });

  test('POST with valid input returns brief', async ({ request }) => {
    const res = await request.post('/api/creative/product-brief', {
      data: {
        productName: 'Test Product',
        benefits: ['benefit 1', 'benefit 2'],
        audience: 'testers',
        platform: 'tiktok',
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.angles).toHaveLength(3);
    expect(data.result.scripts).toHaveLength(3);
    expect(data.result.storyboard).toHaveLength(5);
    expect(data.result.generationPrompt).toBeTruthy();
    expect(Array.isArray(data.result.complianceNotes)).toBeTruthy();
  });

  test('POST with missing required fields returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/product-brief', {
      data: { productName: 'Test' }, // missing benefits
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Reference Remix API
// ---------------------------------------------------------------------------

test.describe('Reference Remix API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/reference-remix');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
  });

  test('POST with valid input returns remix analysis', async ({ request }) => {
    const res = await request.post('/api/creative/reference-remix', {
      data: {
        referenceUrl: 'https://example.com/video.mp4',
        referenceType: 'video',
        targetProduct: 'Test Product',
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.evidence).toBeTruthy();
    expect(data.result.analysis).toBeTruthy();
    expect(data.result.remixBrief).toBeTruthy();
    expect(data.result.remixBrief.generationPrompt).toBeTruthy();
  });

  test('POST with missing URL returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/reference-remix', {
      data: { targetProduct: 'Test' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Multi-Concept API
// ---------------------------------------------------------------------------

test.describe('Multi-Concept API', () => {
  test('GET returns credit cost and 6 emotional triggers', async ({ request }) => {
    const res = await request.get('/api/creative/multi-concept');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(6);
    expect(data.emotionalTriggers).toHaveLength(6);
  });

  test('POST with valid input returns 6 concepts', async ({ request }) => {
    const res = await request.post('/api/creative/multi-concept', {
      data: {
        productOrBrand: 'Test Brand',
        audience: 'young professionals',
        platform: 'tiktok',
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.concepts).toHaveLength(6);
    // Each emotional trigger should be represented
    const triggers = data.result.concepts.map((c: any) => c.trigger);
    expect(triggers).toContain('fear');
    expect(triggers).toContain('aspiration');
    expect(triggers).toContain('humor');
    expect(triggers).toContain('urgency');
    expect(triggers).toContain('curiosity');
    expect(triggers).toContain('social_proof');
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/multi-concept', {
      data: { audience: 'testers' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Meta Ads Safety API
// ---------------------------------------------------------------------------

test.describe('Meta Ads Safety API', () => {
  test('GET returns current config and audit summary', async ({ request }) => {
    const res = await request.get('/api/ads/meta-safety');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.config).toBeTruthy();
    expect(data.auditSummary).toBeTruthy();
    expect(typeof data.pendingApprovals).toBe('number');
  });

  test('GET pending approvals', async ({ request }) => {
    const res = await request.get('/api/ads/meta-approve');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// New feature pages
// ---------------------------------------------------------------------------

test.describe('New feature pages', () => {
  test('/product-brief page loads', async ({ page }) => {
    const res = await page.goto('/product-brief');
    expect(res).not.toBeNull();
    expect([200, 401, 403]).toContain(res!.status());
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
  });

  test('/reference-remix page loads', async ({ page }) => {
    const res = await page.goto('/reference-remix');
    expect(res).not.toBeNull();
    expect([200, 401, 403]).toContain(res!.status());
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
  });

  test('/multi-concept page loads', async ({ page }) => {
    const res = await page.goto('/multi-concept');
    expect(res).not.toBeNull();
    expect([200, 401, 403]).toContain(res!.status());
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
  });

  test('/meta-safety page loads', async ({ page }) => {
    const res = await page.goto('/meta-safety');
    expect(res).not.toBeNull();
    expect([200, 401, 403]).toContain(res!.status());
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toBeVisible();
  });
});
