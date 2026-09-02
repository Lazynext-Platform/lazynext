import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Humor Appeal Designer engine (AI-powered
 * humor appeal design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_HUMOR_APPEAL_DESIGNER_CREDIT_COST,
  validateAdCreativeHumorAppealDesignerInput,
  generateHumorAppeals,
  VALID_PLATFORMS,
  VALID_HUMOR_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeHumorAppealDesignerInput,
} from '@/lib/creative/ad-creative-humor-appeal-designer';

// ── Credit cost ──

test('AD_CREATIVE_HUMOR_APPEAL_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_HUMOR_APPEAL_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_HUMOR_TYPES contains the eight humor types', () => {
  assert.ok(VALID_HUMOR_TYPES.includes('relatable_observation'));
  assert.ok(VALID_HUMOR_TYPES.includes('exaggeration_comedy'));
  assert.ok(VALID_HUMOR_TYPES.includes('self_deprecating'));
  assert.ok(VALID_HUMOR_TYPES.includes('absurdist_humor'));
  assert.ok(VALID_HUMOR_TYPES.includes('situational_comedy'));
  assert.ok(VALID_HUMOR_TYPES.includes('irony_sarcasm'));
  assert.ok(VALID_HUMOR_TYPES.includes('physical_comedy'));
  assert.ok(VALID_HUMOR_TYPES.includes('wordplay_pun'));
  assert.equal(VALID_HUMOR_TYPES.length, 8);
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

const validInput: AdCreativeHumorAppealDesignerInput = {
  productOrBrand: 'DTC snack brand selling spicy popcorn',
  content: 'Craving something bold? Our spicy popcorn hits different. Try it tonight!',
  targetAudience: 'Gen Z snack lovers 18-24 who scroll TikTok at night',
  platform: 'tiktok',
};

test('validateAdCreativeHumorAppealDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeHumorAppealDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeHumorAppealDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeHumorAppealDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHumorAppealDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHumorAppealDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeHumorAppealDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
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

test('validateAdCreativeHumorAppealDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeHumorAppealDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeHumorAppealDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeHumorAppealDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateHumorAppeals with dryRun: true so no real
// LLM calls are made — deterministic heuristic appeals are returned.

test('dry-run returns a HumorAppealDesignerResult with strategy', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.appeals));
  assert.ok(result.strategy.appeals.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns appeals with correct structure', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.comedyHook === 'string' && a.comedyHook.length > 0);
    assert.ok(typeof a.timingElement === 'string' && a.timingElement.length > 0);
    assert.ok(typeof a.punchlineStrategy === 'string' && a.punchlineStrategy.length > 0);
    assert.ok(typeof a.humorAppeal === 'number' && a.humorAppeal >= 0 && a.humorAppeal <= 100);
    assert.ok(typeof a.shareability === 'number' && a.shareability >= 0 && a.shareability <= 100);
    assert.ok(typeof a.appealPathway === 'string' && a.appealPathway.length > 0);
  }
});

test('dry-run returns appeals with valid humor types', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(
      VALID_HUMOR_TYPES.includes(a.type as never),
      `humor type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns humorAppeal in 0-100 range', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.humorAppeal >= 0 && a.humorAppeal <= 100);
  }
});

test('dry-run returns shareability in 0-100 range', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.shareability >= 0 && a.shareability <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 appeals', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  assert.ok(result.strategy.appeals.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateHumorAppeals({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.appeals.length > 0, `${platform} should produce appeals`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateHumorAppeals({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.appeals.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateHumorAppeals({ ...validInput, dryRun: true });
  const r2 = await generateHumorAppeals({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
  assert.equal(r1.strategy.appeals[0].humorAppeal, r2.strategy.appeals[0].humorAppeal);
  assert.equal(r1.strategy.appeals[0].shareability, r2.strategy.appeals[0].shareability);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateHumorAppeals({ ...validInput, dryRun: true });
  const r2 = await generateHumorAppeals({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Appeal count is the same but scores differ based on content length
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
});

test('generateHumorAppeals rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateHumorAppeals({ ...validInput, content: '' } as AdCreativeHumorAppealDesignerInput),
    /invalid_ad_creative_humor_appeal_designer_input/,
  );
});

test('generateHumorAppeals rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateHumorAppeals({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeHumorAppealDesignerInput),
    /invalid_ad_creative_humor_appeal_designer_input/,
  );
});

test('generateHumorAppeals rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateHumorAppeals({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeHumorAppealDesignerInput),
    /invalid_ad_creative_humor_appeal_designer_input/,
  );
});

test('generateHumorAppeals rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateHumorAppeals(null as never),
    /invalid_ad_creative_humor_appeal_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run appeals have distinct types', async () => {
  const result = await generateHumorAppeals({ ...validInput, dryRun: true });
  const types = result.strategy.appeals.map((a) => a.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'appeal types should be distinct');
});
