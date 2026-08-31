import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Fear Appeal Designer engine (AI-powered
 * fear appeal design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_FEAR_APPEAL_DESIGNER_CREDIT_COST,
  validateAdCreativeFearAppealDesignerInput,
  generateFearAppeals,
  VALID_PLATFORMS,
  VALID_FEAR_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeFearAppealDesignerInput,
} from '@/lib/creative/ad-creative-fear-appeal-designer';

// ── Credit cost ──

test('AD_CREATIVE_FEAR_APPEAL_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_FEAR_APPEAL_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_FEAR_TYPES contains the eight fear types', () => {
  assert.ok(VALID_FEAR_TYPES.includes('health_fear'));
  assert.ok(VALID_FEAR_TYPES.includes('financial_fear'));
  assert.ok(VALID_FEAR_TYPES.includes('social_fear'));
  assert.ok(VALID_FEAR_TYPES.includes('safety_fear'));
  assert.ok(VALID_FEAR_TYPES.includes('opportunity_fear'));
  assert.ok(VALID_FEAR_TYPES.includes('status_fear'));
  assert.ok(VALID_FEAR_TYPES.includes('regret_fear'));
  assert.ok(VALID_FEAR_TYPES.includes('inaction_fear'));
  assert.equal(VALID_FEAR_TYPES.length, 8);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeFearAppealDesignerInput = {
  productOrBrand: 'DTC insurance brand selling a home protection plan',
  content: 'Don\'t let one unexpected event wipe out everything you\'ve built — protect your home today.',
  targetAudience: 'Homeowners 35-55 concerned about protecting their assets',
  platform: 'tiktok',
};

test('validateAdCreativeFearAppealDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeFearAppealDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeFearAppealDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeFearAppealDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeFearAppealDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeFearAppealDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeFearAppealDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeFearAppealDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeFearAppealDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeFearAppealDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeFearAppealDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeFearAppealDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeFearAppealDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeFearAppealDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeFearAppealDesignerInput({
    productOrBrand: '',
    content: '',
    targetAudience: '',
    platform: 'myspace' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.includes('platform_invalid'));
  assert.ok(errors.length >= 4);
});

// ── Dry-run mode tests ──
//
// These tests run generateFearAppeals with dryRun: true so no real LLM
// calls are made — deterministic heuristic fear appeals are returned.

test('dry-run returns a FearAppealDesignerResult with strategy', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.appeals));
  assert.ok(result.strategy.appeals.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns fear appeals with correct structure', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.fearTrigger === 'string' && a.fearTrigger.length > 0);
    assert.ok(typeof a.consequenceScenario === 'string' && a.consequenceScenario.length > 0);
    assert.ok(typeof a.protectiveAction === 'string' && a.protectiveAction.length > 0);
    assert.ok(typeof a.fearIntensity === 'number' && a.fearIntensity >= 0 && a.fearIntensity <= 100);
    assert.ok(typeof a.actionMotivation === 'number' && a.actionMotivation >= 0 && a.actionMotivation <= 100);
    assert.ok(typeof a.appealPathway === 'string' && a.appealPathway.length > 0);
  }
});

test('dry-run returns fear appeals with valid fear types', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(
      VALID_FEAR_TYPES.includes(a.type as never),
      `fear type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns fearIntensity in 0-100 range', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.fearIntensity >= 0 && a.fearIntensity <= 100);
  }
});

test('dry-run returns actionMotivation in 0-100 range', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.actionMotivation >= 0 && a.actionMotivation <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 fear appeals', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  assert.ok(result.strategy.appeals.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateFearAppeals({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.appeals.length > 0, `${platform} should produce fear appeals`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateFearAppeals({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.appeals.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateFearAppeals({ ...validInput, dryRun: true });
  const r2 = await generateFearAppeals({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
  assert.equal(r1.strategy.appeals[0].fearIntensity, r2.strategy.appeals[0].fearIntensity);
  assert.equal(r1.strategy.appeals[0].actionMotivation, r2.strategy.appeals[0].actionMotivation);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateFearAppeals({ ...validInput, dryRun: true });
  const r2 = await generateFearAppeals({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Appeal count is the same but scores differ based on content length
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
});

test('generateFearAppeals rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateFearAppeals({ ...validInput, content: '' } as AdCreativeFearAppealDesignerInput),
    /invalid_ad_creative_fear_appeal_designer_input/,
  );
});

test('generateFearAppeals rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateFearAppeals({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeFearAppealDesignerInput),
    /invalid_ad_creative_fear_appeal_designer_input/,
  );
});

test('generateFearAppeals rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateFearAppeals({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeFearAppealDesignerInput),
    /invalid_ad_creative_fear_appeal_designer_input/,
  );
});

test('generateFearAppeals rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateFearAppeals(null as never),
    /invalid_ad_creative_fear_appeal_designer_input/,
  );
});

test('dry-run returns exactly 3 appeals (deterministic)', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  assert.equal(result.strategy.appeals.length, 3);
});

test('dry-run appeal types are distinct', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  const types = result.strategy.appeals.map((a) => a.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'all appeal types should be distinct');
});

test('dry-run recommendations reference the brand', async () => {
  const result = await generateFearAppeals({ ...validInput, dryRun: true });
  const brandSlug = validInput.productOrBrand.toLowerCase().slice(0, 20).replace(/[^a-z0-9]/g, '');
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.includes(brandSlug), `recommendations should reference the brand slug "${brandSlug}"`);
});
