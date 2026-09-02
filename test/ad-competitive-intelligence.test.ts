import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Competitive Intelligence engine (AI-powered competitive
 * landscape analysis for ad creative strategy).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST,
  validateAdCompetitiveIntelligenceInput,
  generateCompetitiveIntelligence,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_COMPETITORS_LENGTH,
  type AdCompetitiveIntelligenceInput,
} from '@/lib/creative/ad-competitive-intelligence';

// ── Credit cost ──

test('AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST is 5', () => {
  assert.equal(AD_COMPETITIVE_INTELLIGENCE_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CATEGORY_LENGTH is 500', () => {
  assert.equal(MAX_CATEGORY_LENGTH, 500);
});

test('MAX_COMPETITORS_LENGTH is 1000', () => {
  assert.equal(MAX_COMPETITORS_LENGTH, 1000);
});

// ── Input validation tests ──

const validInput: AdCompetitiveIntelligenceInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  category: 'skincare',
  competitors: 'Glossier, The Ordinary, CeraVe, Drunk Elephant',
  platform: 'tiktok',
};

test('validateAdCompetitiveIntelligenceInput accepts a valid input', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCompetitiveIntelligenceInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCompetitiveIntelligenceInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCompetitiveIntelligenceInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCompetitiveIntelligenceInput rejects missing category', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    category: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('category_required'));
});

test('validateAdCompetitiveIntelligenceInput rejects category over 500 chars', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    category: 'x'.repeat(MAX_CATEGORY_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('category_too_long'));
});

test('validateAdCompetitiveIntelligenceInput rejects missing competitors', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    competitors: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('competitors_required'));
});

test('validateAdCompetitiveIntelligenceInput rejects competitors over 1000 chars', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    competitors: 'x'.repeat(MAX_COMPETITORS_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('competitors_too_long'));
});

test('validateAdCompetitiveIntelligenceInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCompetitiveIntelligenceInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCompetitiveIntelligenceInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    productOrBrand: 'A fitness app',
    category: 'fitness apps',
    competitors: 'Nike Training, Peloton, Strava',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCompetitiveIntelligenceInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCompetitiveIntelligenceInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateCompetitiveIntelligence with dryRun: true so no
// real LLM calls are made — deterministic heuristic intelligence is returned.

test('dry-run returns a CompetitiveIntelligenceResult with intelligence', async () => {
  const result = await generateCompetitiveIntelligence({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.intelligence);
  assert.ok(Array.isArray(result.intelligence.competitors));
  assert.ok(result.intelligence.competitors.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns competitors with correct structure', async () => {
  const result = await generateCompetitiveIntelligence({ ...validInput, dryRun: true });
  for (const comp of result.intelligence.competitors) {
    assert.ok(typeof comp.name === 'string' && comp.name.length > 0);
    assert.ok(typeof comp.estimatedStrategy === 'string' && comp.estimatedStrategy.length > 0);
    assert.ok(Array.isArray(comp.strengths));
    assert.ok(Array.isArray(comp.weaknesses));
    assert.ok(typeof comp.marketPosition === 'string' && comp.marketPosition.length > 0);
  }
});

test('dry-run returns one competitor per comma-separated name', async () => {
  const result = await generateCompetitiveIntelligence({
    ...validInput,
    competitors: 'Glossier, The Ordinary, CeraVe',
    dryRun: true,
  });
  assert.equal(result.intelligence.competitors.length, 3);
});

test('dry-run returns positioningGaps and differentiationOpportunities', async () => {
  const result = await generateCompetitiveIntelligence({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.intelligence.positioningGaps));
  assert.ok(result.intelligence.positioningGaps.length > 0);
  assert.ok(Array.isArray(result.intelligence.differentiationOpportunities));
  assert.ok(result.intelligence.differentiationOpportunities.length > 0);
});

test('dry-run returns counterStrategies with correct structure', async () => {
  const result = await generateCompetitiveIntelligence({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.intelligence.counterStrategies));
  assert.ok(result.intelligence.counterStrategies.length > 0);
  for (const cs of result.intelligence.counterStrategies) {
    assert.ok(typeof cs.strategy === 'string' && cs.strategy.length > 0);
    assert.ok(typeof cs.targetCompetitor === 'string' && cs.targetCompetitor.length > 0);
    assert.ok(typeof cs.expectedImpact === 'string' && cs.expectedImpact.length > 0);
  }
});

test('dry-run returns marketPositioning and recommendations', async () => {
  const result = await generateCompetitiveIntelligence({ ...validInput, dryRun: true });
  assert.ok(typeof result.intelligence.marketPositioning === 'string' && result.intelligence.marketPositioning.length > 0);
  assert.ok(Array.isArray(result.intelligence.recommendations));
  assert.ok(result.intelligence.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateCompetitiveIntelligence({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.intelligence.competitors.length > 0, `${platform} should produce competitors`);
  }
});

test('generateCompetitiveIntelligence rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateCompetitiveIntelligence({ ...validInput, productOrBrand: '' } as AdCompetitiveIntelligenceInput),
    /invalid_ad_competitive_intelligence_input/,
  );
});

test('generateCompetitiveIntelligence rejects missing competitors in dry-run mode', async () => {
  await assert.rejects(
    () => generateCompetitiveIntelligence({ ...validInput, competitors: '', dryRun: true } as AdCompetitiveIntelligenceInput),
    /invalid_ad_competitive_intelligence_input/,
  );
});
