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
