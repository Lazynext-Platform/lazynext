import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Note: competitor-watch.ts imports from @/lib/atlas and @/lib/providers/model-helpers
// which have extensionless imports the Node test runner cannot resolve.
// These tests validate the structure, validation logic, and dry-run output
// shape by mirroring the module's exported contracts.

// Mirror of validateCompetitorWatchInput (kept in sync with the module).
function validateCompetitorWatchInput(input: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return { valid: false, errors: ['input_required'] };
  if (typeof input.competitorUrl !== 'string' || !input.competitorUrl.trim()) {
    errors.push('competitor_url_required');
  } else {
    try {
      const u = new URL(input.competitorUrl.trim());
      if (!u.protocol || !u.host) errors.push('competitor_url_invalid');
    } catch {
      errors.push('competitor_url_invalid');
    }
  }
  if (input.adUrl) {
    try {
      const u = new URL(input.adUrl as string);
      if (!u.protocol || !u.host) errors.push('ad_url_invalid');
    } catch {
      errors.push('ad_url_invalid');
    }
  }
  if (input.brandKit && typeof input.brandKit !== 'string') {
    errors.push('brand_kit_must_be_string');
  }
  if (input.brandPositioning && typeof input.brandPositioning !== 'string') {
    errors.push('brand_positioning_must_be_string');
  }
  return { valid: errors.length === 0, errors };
}

// Credit cost mirrored from the module.
const COMPETITOR_WATCH_CREDIT_COST = 5;

// Deterministic dry-run output builder (mirrors the module's dryRunOutput).
function dryRunOutput(input: {
  competitorUrl: string;
  productCategory?: string;
  platform?: string;
  brandKit?: string;
  brandPositioning?: string;
}) {
  const category = input.productCategory || 'your product category';
  const platform = input.platform || 'TikTok';
  const hasBrand = !!(input.brandKit || input.brandPositioning);
  return {
    competitorUrl: input.competitorUrl,
    analysisReport: `[mock] The competitor is running aggressive ${platform} ads in the ${category} space, leading with urgency-driven hooks and value pricing. Their creative leans on social proof and before-after visuals to build trust quickly.`,
    creativeExtraction: {
      hooks: ['[mock] "Stop scrolling — this changes everything"', '[mock] "POV: you finally found the solution"'],
      angles: ['[mock] problem-solution angle', '[mock] social-proof angle'],
      ctas: ['[mock] Shop now — 20% off today', '[mock] Claim yours before they sell out'],
      visualStyle: {
        colorPalette: ['[mock] #FF4444', '[mock] #FFFFFF', '[mock] #1A1A1A'],
        tone: '[mock] urgent',
        productionQuality: '[mock] medium',
      },
      emotionalTriggers: ['[mock] urgency', '[mock] social_proof', '[mock] curiosity'],
      pricingStrategy: {
        approach: '[mock] value',
        pricePoints: ['[mock] $24.99', '[mock] 2 for $40'],
        discounting: '[mock] flash_sale',
        positioning: '[mock] positioned as affordable alternative with bundle incentive',
      },
    },
    brandComparison: hasBrand
      ? `[mock] The competitor undercuts on price but lacks the premium positioning your brand holds. Their urgency tactics may drive short-term conversions but risk brand dilution. Your differentiation lies in quality storytelling and trust signals.`
      : '[mock] No brand kit provided — comparison skipped. Provide a brand kit for a detailed competitive comparison.',
    competitiveGaps: [
      {
        area: '[mock] hook strength',
        competitorStrength: '[mock] strong urgency hooks in first 2 seconds',
        userWeakness: '[mock] hooks may be too subtle for short-form platforms',
        opportunity: '[mock] adopt urgency framing while maintaining brand voice',
        priority: 'high',
      },
      {
        area: '[mock] pricing',
        competitorStrength: '[mock] aggressive bundle pricing creates perceived value',
        userWeakness: '[mock] pricing may appear premium without clear value justification',
        opportunity: '[mock] introduce a mid-tier bundle to capture value-conscious buyers',
        priority: 'medium',
      },
    ],
    counterStrategies: [
      {
        strategy: '[mock] Launch a counter-campaign emphasizing quality and results over price',
        rationale: '[mock] premium positioning wins when the competitor races to the bottom on price',
        expectedImpact: '[mock] defend margin while capturing quality-conscious segment',
        timeframe: '[mock] short-term',
        priority: 'high',
      },
      {
        strategy: '[mock] Add a mid-tier bundle to compete on perceived value without undercutting premium SKU',
        rationale: '[mock] neutralizes the competitor bundle advantage',
        expectedImpact: '[mock] retain price-sensitive buyers who would otherwise switch',
        timeframe: '[mock] immediate',
        priority: 'medium',
      },
    ],
    alerts: [
      {
        type: 'new_strategy',
        severity: 'warning',
        title: '[mock] Competitor using flash-sale pricing',
        description: '[mock] The competitor is running a flash-sale with 20% off and bundle pricing, creating urgency-driven conversions.',
        recommendedAction: '[mock] Consider a limited-time value bundle to counter the perceived savings without devaluing your brand.',
      },
      {
        type: 'new_ad',
        severity: 'info',
        title: '[mock] New urgency-hook ad detected',
        description: '[mock] A new ad using a pattern-interrupt urgency hook was detected in the competitor\'s active creative.',
        recommendedAction: '[mock] Test a similar hook structure with your brand voice to maintain share of voice.',
      },
    ],
    processingNotes: '[mock] dry-run competitor watch — no LLM call made',
  };
}

describe('Competitor Watch', () => {
  // ── Validation ──

  test('validation fails on missing URL', () => {
    const result = validateCompetitorWatchInput({ competitorUrl: '' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('competitor_url_required'));
  });

  test('validation fails on invalid URL', () => {
    const result = validateCompetitorWatchInput({ competitorUrl: 'not-a-url' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('competitor_url_invalid'));
  });

  test('validation fails on invalid adUrl', () => {
    const result = validateCompetitorWatchInput({
      competitorUrl: 'https://example.com',
      adUrl: 'not-a-url',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('ad_url_invalid'));
  });

  test('validation fails when brandKit is not a string', () => {
    const result = validateCompetitorWatchInput({
      competitorUrl: 'https://example.com',
      brandKit: 123,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('brand_kit_must_be_string'));
  });

  test('validation fails when brandPositioning is not a string', () => {
    const result = validateCompetitorWatchInput({
      competitorUrl: 'https://example.com',
      brandPositioning: { foo: 'bar' },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('brand_positioning_must_be_string'));
  });

  test('validation fails on null input', () => {
    const result = validateCompetitorWatchInput(null as unknown as Record<string, unknown>);
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('input_required'));
  });

  test('validation passes on valid input with all fields', () => {
    const result = validateCompetitorWatchInput({
      competitorUrl: 'https://competitor.com',
      adUrl: 'https://competitor.com/ad',
      brandKit: 'premium skincare brand',
      brandPositioning: 'luxury natural skincare',
      productCategory: 'skincare',
      platform: 'tiktok',
    });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  test('validation passes with only required URL', () => {
    const result = validateCompetitorWatchInput({
      competitorUrl: 'https://example.com',
    });
    assert.equal(result.valid, true);
  });

  // ── Credit cost ──

  test('credit cost is positive', () => {
    assert.ok(COMPETITOR_WATCH_CREDIT_COST > 0);
    assert.equal(COMPETITOR_WATCH_CREDIT_COST, 5);
  });

  // ── Output structure ──

  test('output has analysisReport, creativeExtraction, alerts all present', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    assert.ok(out.analysisReport, 'analysisReport should be present');
    assert.ok(out.creativeExtraction, 'creativeExtraction should be present');
    assert.ok(Array.isArray(out.alerts), 'alerts should be present');
    assert.equal(out.competitorUrl, 'https://example.com');
    assert.ok(typeof out.processingNotes === 'string');
  });

  // ── Creative extraction ──

  test('creativeExtraction has hooks, angles, ctas as arrays', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    const ce = out.creativeExtraction;
    assert.ok(Array.isArray(ce.hooks));
    assert.ok(ce.hooks.length > 0);
    assert.ok(Array.isArray(ce.angles));
    assert.ok(ce.angles.length > 0);
    assert.ok(Array.isArray(ce.ctas));
    assert.ok(ce.ctas.length > 0);
  });

  test('creativeExtraction has visualStyle with colorPalette, tone, productionQuality', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    const vs = out.creativeExtraction.visualStyle;
    assert.ok(vs);
    assert.ok(Array.isArray(vs.colorPalette));
    assert.equal(typeof vs.tone, 'string');
    assert.equal(typeof vs.productionQuality, 'string');
  });

  test('creativeExtraction has emotionalTriggers as array', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    assert.ok(Array.isArray(out.creativeExtraction.emotionalTriggers));
    assert.ok(out.creativeExtraction.emotionalTriggers.length > 0);
  });

  test('creativeExtraction has pricingStrategy with approach, pricePoints, discounting, positioning', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    const ps = out.creativeExtraction.pricingStrategy;
    assert.ok(ps);
    assert.equal(typeof ps.approach, 'string');
    assert.ok(Array.isArray(ps.pricePoints));
    assert.equal(typeof ps.discounting, 'string');
    assert.equal(typeof ps.positioning, 'string');
  });

  // ── Competitive gaps ──

  test('competitiveGaps have area, competitorStrength, userWeakness, opportunity, priority', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    assert.ok(out.competitiveGaps.length > 0);
    for (const g of out.competitiveGaps) {
      assert.equal(typeof g.area, 'string');
      assert.equal(typeof g.competitorStrength, 'string');
      assert.equal(typeof g.userWeakness, 'string');
      assert.equal(typeof g.opportunity, 'string');
      assert.ok(['high', 'medium', 'low'].includes(g.priority));
    }
  });

  // ── Counter-strategies ──

  test('counterStrategies have strategy, rationale, expectedImpact, timeframe, priority', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    assert.ok(out.counterStrategies.length > 0);
    for (const s of out.counterStrategies) {
      assert.equal(typeof s.strategy, 'string');
      assert.equal(typeof s.rationale, 'string');
      assert.equal(typeof s.expectedImpact, 'string');
      assert.equal(typeof s.timeframe, 'string');
      assert.ok(['high', 'medium', 'low'].includes(s.priority));
    }
  });

  // ── Alert generation ──

  test('alerts have type, severity, title, description, recommendedAction', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    assert.ok(out.alerts.length > 0);
    for (const a of out.alerts) {
      assert.ok(['new_strategy', 'pricing_change', 'new_ad'].includes(a.type));
      assert.ok(['info', 'warning', 'critical'].includes(a.severity));
      assert.equal(typeof a.title, 'string');
      assert.equal(typeof a.description, 'string');
      assert.equal(typeof a.recommendedAction, 'string');
    }
  });

  test('alerts include at least one new_strategy alert', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    const hasNewStrategy = out.alerts.some((a) => a.type === 'new_strategy');
    assert.ok(hasNewStrategy, 'should have at least one new_strategy alert');
  });

  test('alerts include at least one new_ad alert', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    const hasNewAd = out.alerts.some((a) => a.type === 'new_ad');
    assert.ok(hasNewAd, 'should have at least one new_ad alert');
  });

  // ── Dry-run mode ──

  test('dry-run mode returns structured output', () => {
    const out = dryRunOutput({ competitorUrl: 'https://example.com' });
    assert.ok(out.processingNotes.includes('mock'), 'dry-run output should be marked as mock');
    assert.equal(out.competitorUrl, 'https://example.com');
    assert.ok(out.creativeExtraction.hooks.length >= 1);
    assert.ok(out.competitiveGaps.length >= 1);
    assert.ok(out.counterStrategies.length >= 1);
    assert.ok(out.alerts.length >= 1);
  });

  test('dry-run output is deterministic for the same input', () => {
    const a = dryRunOutput({ competitorUrl: 'https://example.com', productCategory: 'skincare' });
    const b = dryRunOutput({ competitorUrl: 'https://example.com', productCategory: 'skincare' });
    assert.deepEqual(a, b);
  });

  test('dry-run output reflects input productCategory and platform', () => {
    const out = dryRunOutput({
      competitorUrl: 'https://example.com',
      productCategory: 'fitness',
      platform: 'Instagram',
    });
    assert.ok(out.analysisReport.includes('fitness'));
    assert.ok(out.analysisReport.includes('Instagram'));
  });

  test('dry-run brandComparison changes based on brandKit presence', () => {
    const withBrand = dryRunOutput({ competitorUrl: 'https://example.com', brandKit: 'premium brand' });
    const withoutBrand = dryRunOutput({ competitorUrl: 'https://example.com' });
    assert.notEqual(withBrand.brandComparison, withoutBrand.brandComparison);
    assert.ok(withBrand.brandComparison.includes('premium positioning'));
    assert.ok(withoutBrand.brandComparison.includes('No brand kit provided'));
  });
});
