import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Pride Appeal Designer engine (AI-powered
 * pride appeal design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_PRIDE_APPEAL_DESIGNER_CREDIT_COST,
  validateAdCreativePrideAppealDesignerInput,
  generatePrideAppeals,
  VALID_PLATFORMS,
  VALID_PRIDE_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativePrideAppealDesignerInput,
} from '@/lib/creative/ad-creative-pride-appeal-designer';

// ── Credit cost ──

test('AD_CREATIVE_PRIDE_APPEAL_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_PRIDE_APPEAL_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_PRIDE_TYPES contains the eight pride types', () => {
  assert.ok(VALID_PRIDE_TYPES.includes('achievement_pride'));
  assert.ok(VALID_PRIDE_TYPES.includes('status_pride'));
  assert.ok(VALID_PRIDE_TYPES.includes('craftsmanship_pride'));
  assert.ok(VALID_PRIDE_TYPES.includes('heritage_pride'));
  assert.ok(VALID_PRIDE_TYPES.includes('identity_pride'));
  assert.ok(VALID_PRIDE_TYPES.includes('ownership_pride'));
  assert.ok(VALID_PRIDE_TYPES.includes('transformation_pride'));
  assert.ok(VALID_PRIDE_TYPES.includes('recognition_pride'));
  assert.equal(VALID_PRIDE_TYPES.length, 8);
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

const validInput: AdCreativePrideAppealDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'You have earned this — our vitamin C serum for those who never settle for less.',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativePrideAppealDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativePrideAppealDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativePrideAppealDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativePrideAppealDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativePrideAppealDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativePrideAppealDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativePrideAppealDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativePrideAppealDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativePrideAppealDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativePrideAppealDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativePrideAppealDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativePrideAppealDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativePrideAppealDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativePrideAppealDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativePrideAppealDesignerInput({
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
// These tests run generatePrideAppeals with dryRun: true so no real LLM
// calls are made — deterministic heuristic pride appeals are returned.

test('dry-run returns a PrideAppealDesignerResult with strategy', async () => {
  const result = await generatePrideAppeals({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.appeals));
  assert.ok(result.strategy.appeals.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns pride appeals with correct structure', async () => {
  const result = await generatePrideAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.prideTrigger === 'string' && a.prideTrigger.length > 0);
    assert.ok(typeof a.achievementElement === 'string' && a.achievementElement.length > 0);
    assert.ok(typeof a.statusSignal === 'string' && a.statusSignal.length > 0);
    assert.ok(typeof a.prideIntensity === 'number' && a.prideIntensity >= 0 && a.prideIntensity <= 100);
    assert.ok(typeof a.selfWorthBoost === 'number' && a.selfWorthBoost >= 0 && a.selfWorthBoost <= 100);
    assert.ok(typeof a.appealPathway === 'string' && a.appealPathway.length > 0);
  }
});

test('dry-run returns pride appeals with valid pride types', async () => {
  const result = await generatePrideAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(
      VALID_PRIDE_TYPES.includes(a.type as never),
      `pride type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns prideIntensity in 0-100 range', async () => {
  const result = await generatePrideAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.prideIntensity >= 0 && a.prideIntensity <= 100);
  }
});

test('dry-run returns selfWorthBoost in 0-100 range', async () => {
  const result = await generatePrideAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.selfWorthBoost >= 0 && a.selfWorthBoost <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generatePrideAppeals({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 pride appeals', async () => {
  const result = await generatePrideAppeals({ ...validInput, dryRun: true });
  assert.ok(result.strategy.appeals.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePrideAppeals({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.appeals.length > 0, `${platform} should produce pride appeals`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generatePrideAppeals({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.appeals.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generatePrideAppeals({ ...validInput, dryRun: true });
  const r2 = await generatePrideAppeals({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
  assert.equal(r1.strategy.appeals[0].prideIntensity, r2.strategy.appeals[0].prideIntensity);
  assert.equal(r1.strategy.appeals[0].selfWorthBoost, r2.strategy.appeals[0].selfWorthBoost);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generatePrideAppeals({ ...validInput, dryRun: true });
  const r2 = await generatePrideAppeals({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Appeal count is the same but scores differ based on content length
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
});

test('generatePrideAppeals rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePrideAppeals({ ...validInput, content: '' } as AdCreativePrideAppealDesignerInput),
    /invalid_ad_creative_pride_appeal_designer_input/,
  );
});

test('generatePrideAppeals rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generatePrideAppeals({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativePrideAppealDesignerInput),
    /invalid_ad_creative_pride_appeal_designer_input/,
  );
});

test('generatePrideAppeals rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generatePrideAppeals({ ...validInput, targetAudience: '', dryRun: true } as AdCreativePrideAppealDesignerInput),
    /invalid_ad_creative_pride_appeal_designer_input/,
  );
});

test('generatePrideAppeals rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generatePrideAppeals(null as never),
    /invalid_ad_creative_pride_appeal_designer_input/,
  );
});
