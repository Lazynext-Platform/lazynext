/**
 * E2E tests for the LL-series API endpoints.
 *
 * These tests require authentication and run under the authenticated project
 * (chromium-auth) via the auth-*.spec.ts naming convention. The storageState
 * is inherited from the project config.
 *
 * Covers:
 * 1. GET /api/ads/google-safety and GET /api/ads/google-approve
 * 2. GET/POST /api/creative/performance-loop
 * 3. GET/POST /api/creative/skill-chain-builder
 * 4. GET/POST /api/creative/brand-guardrails
 * 5. GET/POST /api/creative/smart-calendar
 * 6. GET/POST /api/creative/competitor-watch
 *
 * Rate-limited (429) responses skip the test gracefully.
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Google Ads Safety API
// ---------------------------------------------------------------------------

test.describe('Google Ads Safety API', () => {
  test('GET returns current config and audit summary', async ({ request }) => {
    const res = await request.get('/api/ads/google-safety');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.config).toBeTruthy();
    expect(data.config.dryRun).toBe(true);
    expect(data.auditSummary).toBeTruthy();
    expect(typeof data.pendingApprovals).toBe('number');
  });

  test('GET pending approvals', async ({ request }) => {
    const res = await request.get('/api/ads/google-approve');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data.pending)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Performance Loop API
// ---------------------------------------------------------------------------

test.describe('Performance Loop API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/performance-loop');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
  });

  test('POST with valid input returns performance loop output', async ({ request }) => {
    const res = await request.post('/api/creative/performance-loop', {
      data: {
        productName: 'Test Product',
        audience: 'testers',
        platform: 'tiktok',
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.learnings)).toBeTruthy();
    expect(Array.isArray(data.result.improvedBriefs)).toBeTruthy();
    expect(data.result.summary).toBeTruthy();
    expect(data.result.generationPrompt).toBeTruthy();
  });

  test('POST with missing productName returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/performance-loop', {
      data: { audience: 'testers' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Skill Chain Builder API
// ---------------------------------------------------------------------------

test.describe('Skill Chain Builder API', () => {
  test('GET returns credit cost and chain catalog', async ({ request }) => {
    const res = await request.get('/api/creative/skill-chain-builder');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(8);
    expect(Array.isArray(data.chains)).toBeTruthy();
    expect(data.chains.length).toBeGreaterThanOrEqual(3);
  });

  test('POST executes a built-in chain', async ({ request }) => {
    const res = await request.post('/api/creative/skill-chain-builder', {
      data: {
        chainId: 'adaptive-hook-chain',
        inputs: { productName: 'Test Product', audience: 'testers', platform: 'tiktok' },
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.chainId).toBe('adaptive-hook-chain');
    expect(Array.isArray(data.result.steps)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Brand Guardrails API
// ---------------------------------------------------------------------------

test.describe('Brand Guardrails API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/brand-guardrails');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns brand guardrails result', async ({ request }) => {
    const res = await request.post('/api/creative/brand-guardrails', {
      data: {
        brief: 'A short TikTok ad for our eco-friendly water bottle.',
        brandKit: {
          brandName: 'EcoSip',
          tone: ['playful', 'sustainable'],
          keywords: ['eco-friendly', 'reusable'],
          forbiddenWords: ['cheap'],
        },
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(typeof data.result.score).toBe('number');
    expect(typeof data.result.grade).toBe('string');
    expect(Array.isArray(data.result.violations)).toBeTruthy();
    expect(Array.isArray(data.result.recommendations)).toBeTruthy();
  });

  test('POST with missing brief returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/brand-guardrails', {
      data: { brandKit: { brandName: 'EcoSip' } },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Smart Calendar API
// ---------------------------------------------------------------------------

test.describe('Smart Calendar API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/smart-calendar');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns smart calendar schedule', async ({ request }) => {
    const res = await request.post('/api/creative/smart-calendar', {
      data: {
        creatives: [
          { id: 'c1', platform: 'tiktok', format: 'video', title: 'Launch teaser' },
          { id: 'c2', platform: 'instagram', format: 'image', title: 'Carousel post' },
        ],
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.schedule)).toBeTruthy();
    expect(typeof data.result.totalPosts).toBe('number');
  });

  test('POST with missing creatives returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/smart-calendar', {
      data: { startDate: '2025-01-01', endDate: '2025-01-07' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Competitor Watch API
// ---------------------------------------------------------------------------

test.describe('Competitor Watch API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/competitor-watch');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns competitor watch result', async ({ request }) => {
    const res = await request.post('/api/creative/competitor-watch', {
      data: {
        competitorUrl: 'https://example-competitor.com',
        productCategory: 'skincare',
        platform: 'tiktok',
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(typeof data.result.analysisReport).toBe('string');
    expect(data.result.creativeExtraction).toBeTruthy();
    expect(Array.isArray(data.result.competitiveGaps)).toBeTruthy();
    expect(Array.isArray(data.result.counterStrategies)).toBeTruthy();
    expect(Array.isArray(data.result.alerts)).toBeTruthy();
  });

  test('POST with missing competitorUrl returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/competitor-watch', {
      data: { productCategory: 'skincare' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});
