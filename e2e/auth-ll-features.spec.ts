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
 * 7. GET/POST /api/creative/ad-copy-generator
 * 8. GET/POST /api/creative/hook-library
 * 9. GET/POST /api/creative/brief-template-builder
 * 10. GET/POST /api/creative/ad-script-writer
 * 11. GET/POST /api/creative/audience-persona-generator
 * 12. GET/POST /api/creative/variant-matrix-generator
 * 13. GET/POST /api/creative/ad-concept-merger
 * 14. GET/POST /api/creative/brief-analyzer
 * 15. GET/POST /api/creative/ad-format-optimizer
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

// ---------------------------------------------------------------------------
// Ad Copy Generator API
// ---------------------------------------------------------------------------

test.describe('Ad Copy Generator API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/ad-copy-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns ad copy result', async ({ request }) => {
    const res = await request.post('/api/creative/ad-copy-generator', {
      data: {
        source: 'Eco-friendly reusable water bottle for active lifestyles.',
        platform: 'tiktok',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.platform).toBe('tiktok');
    expect(typeof data.result.headline).toBe('string');
    expect(typeof data.result.bodyCopy).toBe('string');
    expect(typeof data.result.cta).toBe('string');
    expect(Array.isArray(data.result.hashtags)).toBeTruthy();
    expect(typeof data.result.description).toBe('string');
  });

  test('POST with missing source returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-copy-generator', {
      data: { platform: 'tiktok' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Hook Library API
// ---------------------------------------------------------------------------

test.describe('Hook Library API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/hook-library');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns hooks', async ({ request }) => {
    const res = await request.post('/api/creative/hook-library', {
      data: {
        productOrBrand: 'EcoSip reusable water bottle',
        audience: 'eco-conscious athletes',
        platforms: ['tiktok'],
        count: 3,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.hooks)).toBeTruthy();
    expect(typeof data.result.generated).toBe('number');
    expect(typeof data.result.stored).toBe('number');
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/hook-library', {
      data: { audience: 'eco-conscious athletes' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Brief Template Builder API
// ---------------------------------------------------------------------------

test.describe('Brief Template Builder API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/brief-template-builder');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns brief template', async ({ request }) => {
    const res = await request.post('/api/creative/brief-template-builder', {
      data: {
        industry: 'beauty',
        productCategory: 'skincare serum',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.template).toBeTruthy();
    expect(data.result.industry).toBe('beauty');
    expect(Array.isArray(data.result.template.valueProps)).toBeTruthy();
    expect(Array.isArray(data.result.template.hooks)).toBeTruthy();
    expect(Array.isArray(data.result.template.angles)).toBeTruthy();
  });

  test('POST with missing industry returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/brief-template-builder', {
      data: { productCategory: 'skincare serum' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Ad Script Writer API
// ---------------------------------------------------------------------------

test.describe('Ad Script Writer API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/ad-script-writer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns ad script result', async ({ request }) => {
    const res = await request.post('/api/creative/ad-script-writer', {
      data: {
        source: 'Premium wireless earbuds with active noise cancellation',
        platform: 'tiktok',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.script).toBeTruthy();
    expect(Array.isArray(data.result.script.scenes)).toBeTruthy();
  });

  test('POST with missing source returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-script-writer', {
      data: { platform: 'tiktok' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Audience Persona Generator API
// ---------------------------------------------------------------------------

test.describe('Audience Persona Generator API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/audience-persona-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns personas result', async ({ request }) => {
    const res = await request.post('/api/creative/audience-persona-generator', {
      data: {
        productOrBrand: 'Eco-friendly reusable water bottle for fitness enthusiasts',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.personas)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/audience-persona-generator', {
      data: { industry: 'fitness' },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Variant Matrix Generator API
// ---------------------------------------------------------------------------

test.describe('Variant Matrix Generator API', () => {
  test('GET returns credit cost and schema info', async ({ request }) => {
    const res = await request.get('/api/creative/variant-matrix-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns variants result', async ({ request }) => {
    const res = await request.post('/api/creative/variant-matrix-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        count: 5,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.variants)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/variant-matrix-generator', {
      data: { count: 5 },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Ad Concept Merger API
// ---------------------------------------------------------------------------

test.describe('Ad Concept Merger API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-concept-merger');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns merged concept', async ({ request }) => {
    const res = await request.post('/api/creative/ad-concept-merger', {
      data: {
        concepts: [
          { id: '1', type: 'hook', content: 'Stop scrolling' },
          { id: '2', type: 'angle', content: 'Save time and money' },
        ],
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.merged).toBeTruthy();
    expect(data.result.merged.unifiedHook).toBeTruthy();
  });

  test('POST with missing concepts returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-concept-merger', {
      data: { dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Brief Analyzer API
// ---------------------------------------------------------------------------

test.describe('Brief Analyzer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/brief-analyzer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns analysis', async ({ request }) => {
    const res = await request.post('/api/creative/brief-analyzer', {
      data: {
        briefText:
          'We want to create a TikTok ad for our eco-friendly water bottle targeting fitness enthusiasts aged 18-35. The key value prop is sustainability without sacrificing style. CTA: Shop Now. Visual: product on a gym background.',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.analysis).toBeTruthy();
    expect(typeof data.result.analysis.overallScore).toBe('number');
  });

  test('POST with missing briefText returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/brief-analyzer', {
      data: { dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Ad Format Optimizer API
// ---------------------------------------------------------------------------

test.describe('Ad Format Optimizer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-format-optimizer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns recommendations', async ({ request }) => {
    const res = await request.post('/api/creative/ad-format-optimizer', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platforms: ['tiktok'],
        budget: 'low',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.recommendations)).toBeTruthy();
    expect(data.result.bestPick).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-format-optimizer', {
      data: { platforms: ['tiktok'], budget: 'low', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Mood Board Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/mood-board-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns mood board', async ({ request }) => {
    const res = await request.post('/api/creative/mood-board-generator', {
      data: {
        productOrBrand: 'Premium eco-friendly water bottle',
        styleKeywords: ['minimal', 'natural', 'premium'],
        platform: 'tiktok',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.moodBoard).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/mood-board-generator', {
      data: { styleKeywords: ['minimal'], dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Performance Predictor API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-performance-predictor');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns prediction', async ({ request }) => {
    const res = await request.post('/api/creative/ad-performance-predictor', {
      data: {
        briefOrConcept: 'TikTok ad for eco-friendly water bottle. Hook: Stop scrolling. CTA: Shop Now.',
        platform: 'tiktok',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.prediction).toBeTruthy();
    expect(typeof data.result.prediction.overallScore).toBe('number');
  });

  test('POST with missing briefOrConcept returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-performance-predictor', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative A/B Test Planner API (v2)', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ab-test-planner-v2');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns test plan', async ({ request }) => {
    const res = await request.post('/api/creative/ab-test-planner-v2', {
      data: {
        baseCreative: 'TikTok ad for eco-friendly water bottle. Hook: Stop scrolling. CTA: Shop Now.',
        platform: 'tiktok',
        goal: 'Increase CTR by 20%',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.plan).toBeTruthy();
    expect(Array.isArray(data.result.plan.variants)).toBeTruthy();
  });

  test('POST with missing baseCreative returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ab-test-planner-v2', {
      data: { platform: 'tiktok', goal: 'x', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Hook Tester API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/hook-tester');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns ranked hooks', async ({ request }) => {
    const res = await request.post('/api/creative/hook-tester', {
      data: {
        hooks: ['Stop scrolling!', 'You won\'t believe this', 'This changed everything'],
        productOrBrand: 'Eco-friendly water bottle',
        platform: 'tiktok',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.rankedHooks)).toBeTruthy();
  });

  test('POST with missing hooks returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/hook-tester', {
      data: { productOrBrand: 'test', platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Trend Spotter API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/trend-spotter');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns trends', async ({ request }) => {
    const res = await request.post('/api/creative/trend-spotter', {
      data: {
        niche: 'sustainable fashion',
        platform: 'tiktok',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.trends)).toBeTruthy();
  });

  test('POST with missing niche returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/trend-spotter', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Brand Voice Analyzer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/brand-voice-analyzer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns voice profile', async ({ request }) => {
    const res = await request.post('/api/creative/brand-voice-analyzer', {
      data: {
        brandName: 'EcoBottle',
        sampleContent: 'We believe in a sustainable future. Our products are designed with care for the environment. Every bottle you buy helps reduce plastic waste. Join us in making the world a better place, one bottle at a time.',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.voiceProfile).toBeTruthy();
  });

  test('POST with missing brandName returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/brand-voice-analyzer', {
      data: { sampleContent: 'test content here', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Caption Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-caption-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns captions', async ({ request }) => {
    const res = await request.post('/api/creative/ad-caption-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        count: 3,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.captions)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-caption-generator', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Headline Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-headline-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns headlines', async ({ request }) => {
    const res = await request.post('/api/creative/ad-headline-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        count: 5,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.headlines)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-headline-generator', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Angle Finder API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/angle-finder');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns angles', async ({ request }) => {
    const res = await request.post('/api/creative/angle-finder', {
      data: {
        productOrBrand: 'Eco-friendly water bottle',
        platform: 'tiktok',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.angles)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/angle-finder', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Timing Optimizer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-timing-optimizer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns timing slots', async ({ request }) => {
    const res = await request.post('/api/creative/ad-timing-optimizer', {
      data: {
        platform: 'tiktok',
        audienceDescription: 'Gen Z fitness enthusiasts in the US',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.optimalSlots)).toBeTruthy();
  });

  test('POST with missing audienceDescription returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-timing-optimizer', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Fatigue Detector API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-fatigue-detector');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns fatigue analysis', async ({ request }) => {
    const res = await request.post('/api/creative/creative-fatigue-detector', {
      data: {
        creativeDescription: 'TikTok ad for eco-friendly water bottle with gym background',
        platform: 'tiktok',
        daysRunning: 14,
        currentCTR: 1.2,
        impressions: 50000,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(typeof data.result.fatigueScore).toBe('number');
  });

  test('POST with missing creativeDescription returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-fatigue-detector', {
      data: { platform: 'tiktok', daysRunning: 14, currentCTR: 1.2, impressions: 50000, dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad CTA Optimizer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-cta-optimizer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns optimized CTAs', async ({ request }) => {
    const res = await request.post('/api/creative/ad-cta-optimizer', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        count: 5,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.ctas)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-cta-optimizer', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Concept Expander API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/concept-expander');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns expanded concepts', async ({ request }) => {
    const res = await request.post('/api/creative/concept-expander', {
      data: {
        seedConcept: 'A day-in-the-life ad showing how the product fits into a busy morning routine',
        platform: 'tiktok',
        productOrBrand: 'Eco-friendly water bottle',
        count: 5,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.concepts)).toBeTruthy();
  });

  test('POST with missing seedConcept returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/concept-expander', {
      data: { platform: 'tiktok', productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Story Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-story-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns ad story', async ({ request }) => {
    const res = await request.post('/api/creative/ad-story-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        storyType: 'transformation',
        duration: 30,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.story).toBeTruthy();
    expect(Array.isArray(data.result.story.acts)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-story-generator', {
      data: { platform: 'tiktok', storyType: 'transformation', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Color Palette Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-color-palette-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns palettes', async ({ request }) => {
    const res = await request.post('/api/creative/ad-color-palette-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        emotion: 'energetic',
        count: 3,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.palettes)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-color-palette-generator', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Thumbnail Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-thumbnail-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns thumbnails', async ({ request }) => {
    const res = await request.post('/api/creative/ad-thumbnail-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        videoTitle: 'The best earbuds for your workout',
        count: 3,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.thumbnails)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-thumbnail-generator', {
      data: { platform: 'tiktok', videoTitle: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Font Pairing Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-font-pairing-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns font pairings', async ({ request }) => {
    const res = await request.post('/api/creative/ad-font-pairing-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        count: 3,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.pairings)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-font-pairing-generator', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Hashtag Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-hashtag-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(2);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns hashtags', async ({ request }) => {
    const res = await request.post('/api/creative/ad-hashtag-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        count: 15,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.hashtags)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-hashtag-generator', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Scene Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-scene-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns scenes', async ({ request }) => {
    const res = await request.post('/api/creative/creative-scene-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        concept: 'A day-in-the-life showing the earbuds during a morning workout',
        sceneCount: 5,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.scenes)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-scene-generator', {
      data: { platform: 'tiktok', concept: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Music Mood Matcher API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-music-mood-matcher');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns recommendations', async ({ request }) => {
    const res = await request.post('/api/creative/ad-music-mood-matcher', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        count: 3,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.recommendations)).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-music-mood-matcher', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Voiceover Script Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-voiceover-script-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns voiceover script', async ({ request }) => {
    const res = await request.post('/api/creative/ad-voiceover-script-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        platform: 'tiktok',
        duration: 30,
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.script).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-voiceover-script-generator', {
      data: { platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Brief Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-brief-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns brief', async ({ request }) => {
    const res = await request.post('/api/creative/creative-brief-generator', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        campaignGoal: 'Increase brand awareness among Gen Z',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.brief).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-brief-generator', {
      data: { campaignGoal: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Placement Strategist API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-placement-strategist');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });

  test('POST with valid input returns strategy', async ({ request }) => {
    const res = await request.post('/api/creative/ad-placement-strategist', {
      data: {
        productOrBrand: 'Premium wireless earbuds',
        targetAudience: 'Gen Z fitness enthusiasts in the US',
        dryRun: true,
      },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.strategy).toBeTruthy();
  });

  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-placement-strategist', {
      data: { targetAudience: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad A/B Test Name Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-ab-test-name-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(2);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns test names', async ({ request }) => {
    const res = await request.post('/api/creative/ad-ab-test-name-generator', {
      data: { productOrBrand: 'Premium earbuds', testType: 'hook', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.testNames)).toBeTruthy();
  });
  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-ab-test-name-generator', {
      data: { testType: 'hook', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Hook Revamp Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-hook-revamp-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns revamps', async ({ request }) => {
    const res = await request.post('/api/creative/creative-hook-revamp-generator', {
      data: { originalHook: 'Stop scrolling!', productOrBrand: 'Premium earbuds', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.revamps)).toBeTruthy();
  });
  test('POST with missing originalHook returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-hook-revamp-generator', {
      data: { productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Audience Segment Builder API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-audience-segment-builder');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns segments', async ({ request }) => {
    const res = await request.post('/api/creative/ad-audience-segment-builder', {
      data: { productOrBrand: 'Premium earbuds', primaryAudience: 'Gen Z fitness', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(Array.isArray(data.result.segments)).toBeTruthy();
  });
  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-audience-segment-builder', {
      data: { primaryAudience: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Concept Validator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-concept-validator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns validation', async ({ request }) => {
    const res = await request.post('/api/creative/creative-concept-validator', {
      data: { concept: 'A bold visual-first ad', productOrBrand: 'Premium earbuds', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.validation).toBeTruthy();
  });
  test('POST with missing concept returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-concept-validator', {
      data: { productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Emotion Analyzer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-emotion-analyzer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns analysis', async ({ request }) => {
    const res = await request.post('/api/creative/ad-emotion-analyzer', {
      data: { adContent: 'Discover the power of vitamin C', productOrBrand: 'Skincare brand', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.analysis).toBeTruthy();
  });
  test('POST with missing adContent returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-emotion-analyzer', {
      data: { productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Format Converter API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-format-converter');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns conversion', async ({ request }) => {
    const res = await request.post('/api/creative/creative-format-converter', {
      data: { content: 'Long blog post about skincare', productOrBrand: 'Skincare brand', sourceFormat: 'long-form', targetFormat: 'short-form', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.conversion).toBeTruthy();
  });
  test('POST with missing content returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-format-converter', {
      data: { productOrBrand: 'test', sourceFormat: 'long-form', targetFormat: 'short-form', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Budget Allocator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-budget-allocator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns allocation', async ({ request }) => {
    const res = await request.post('/api/creative/ad-budget-allocator', {
      data: { productOrBrand: 'Premium earbuds', totalBudget: '$10,000', campaignGoal: 'conversions', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.allocation).toBeTruthy();
  });
  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-budget-allocator', {
      data: { totalBudget: '$10,000', campaignGoal: 'conversions', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Trend Adapter API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-trend-adapter');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns adaptation', async ({ request }) => {
    const res = await request.post('/api/creative/creative-trend-adapter', {
      data: { content: 'Check out our new product', productOrBrand: 'Premium earbuds', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.adaptation).toBeTruthy();
  });
  test('POST with missing content returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-trend-adapter', {
      data: { productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Creative Sequencer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-creative-sequencer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns sequence', async ({ request }) => {
    const res = await request.post('/api/creative/ad-creative-sequencer', {
      data: { productOrBrand: 'Premium earbuds', campaignGoal: 'conversions', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.sequence).toBeTruthy();
  });
  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-creative-sequencer', {
      data: { campaignGoal: 'conversions', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Brand Story Architect API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/brand-story-architect');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns story', async ({ request }) => {
    const res = await request.post('/api/creative/brand-story-architect', {
      data: { brandName: 'Aura', productOrService: 'Skincare serum', brandValues: 'Clean, effective, sustainable', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.story).toBeTruthy();
  });
  test('POST with missing brandName returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/brand-story-architect', {
      data: { productOrService: 'Skincare', brandValues: 'Clean', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Localization Adapter API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-localization-adapter');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns localization', async ({ request }) => {
    const res = await request.post('/api/creative/ad-localization-adapter', {
      data: { content: 'Check out our new product', productOrBrand: 'Premium earbuds', sourceMarket: 'us', targetMarket: 'jp', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.localization).toBeTruthy();
  });
  test('POST with missing content returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-localization-adapter', {
      data: { productOrBrand: 'test', sourceMarket: 'us', targetMarket: 'jp', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Performance Forecaster API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-performance-forecaster');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns forecast', async ({ request }) => {
    const res = await request.post('/api/creative/creative-performance-forecaster', {
      data: { creativeContent: 'Amazing new earbuds with noise cancellation', productOrBrand: 'Premium earbuds', platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.forecast).toBeTruthy();
  });
  test('POST with missing creativeContent returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-performance-forecaster', {
      data: { productOrBrand: 'test', platform: 'tiktok', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Sentiment Tuner API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-sentiment-tuner');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns tuning', async ({ request }) => {
    const res = await request.post('/api/creative/ad-sentiment-tuner', {
      data: { content: 'Buy now before its gone', productOrBrand: 'Premium earbuds', targetSentiment: 'empathetic', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.tuning).toBeTruthy();
  });
  test('POST with missing content returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-sentiment-tuner', {
      data: { productOrBrand: 'test', targetSentiment: 'positive', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Hook Matrix Generator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-hook-matrix-generator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns matrix', async ({ request }) => {
    const res = await request.post('/api/creative/creative-hook-matrix-generator', {
      data: { productOrBrand: 'Premium earbuds', audience: 'Gen Z music lovers', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.matrix).toBeTruthy();
  });
  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-hook-matrix-generator', {
      data: { audience: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Creative Rotator API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-creative-rotator');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns rotation', async ({ request }) => {
    const res = await request.post('/api/creative/ad-creative-rotator', {
      data: { baseContent: 'Amazing earbuds with ANC', productOrBrand: 'Premium earbuds', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.rotation).toBeTruthy();
  });
  test('POST with missing baseContent returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-creative-rotator', {
      data: { productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Brand Voice Consistency Checker API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/brand-voice-consistency-checker');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns check', async ({ request }) => {
    const res = await request.post('/api/creative/brand-voice-consistency-checker', {
      data: { content: 'Hey guys check this out!!', brandName: 'Aura', brandVoiceDescription: 'Professional, calm, authoritative', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.check).toBeTruthy();
  });
  test('POST with missing content returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/brand-voice-consistency-checker', {
      data: { brandName: 'test', brandVoiceDescription: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Persona Matcher API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-persona-matcher');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(4);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns matching', async ({ request }) => {
    const res = await request.post('/api/creative/ad-persona-matcher', {
      data: { content: 'Premium earbuds for music lovers', productOrBrand: 'Aura Earbuds', personas: 'Gen Z audiophiles, busy professionals', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.matching).toBeTruthy();
  });
  test('POST with missing content returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-persona-matcher', {
      data: { productOrBrand: 'test', personas: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Concept Expander Pro API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-concept-expander-pro');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns expansion', async ({ request }) => {
    const res = await request.post('/api/creative/creative-concept-expander-pro', {
      data: { concept: 'A bold visual-first ad showing transformation', productOrBrand: 'Aura Skincare', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.expansion).toBeTruthy();
  });
  test('POST with missing concept returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-concept-expander-pro', {
      data: { productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Ad Competitive Intelligence API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/ad-competitive-intelligence');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(5);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns intelligence', async ({ request }) => {
    const res = await request.post('/api/creative/ad-competitive-intelligence', {
      data: { productOrBrand: 'Aura Earbuds', category: 'Audio electronics', competitors: 'Bose, Sony, AirPods', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.intelligence).toBeTruthy();
  });
  test('POST with missing productOrBrand returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/ad-competitive-intelligence', {
      data: { category: 'test', competitors: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});

test.describe('Creative Quality Scorer API', () => {
  test('GET returns credit cost and schema', async ({ request }) => {
    const res = await request.get('/api/creative/creative-quality-scorer');
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.creditCost).toBe(3);
    expect(data.schema).toBeTruthy();
  });
  test('POST with valid input returns scoring', async ({ request }) => {
    const res = await request.post('/api/creative/creative-quality-scorer', {
      data: { content: 'Amazing earbuds with noise cancellation and premium sound', productOrBrand: 'Aura Earbuds', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.result).toBeTruthy();
    expect(data.result.scoring).toBeTruthy();
  });
  test('POST with missing content returns 400', async ({ request }) => {
    const res = await request.post('/api/creative/creative-quality-scorer', {
      data: { productOrBrand: 'test', dryRun: true },
    });
    if (res.status() === 429) { test.skip(true, 'rate limited'); return; }
    expect(res.status()).toBe(400);
  });
});
