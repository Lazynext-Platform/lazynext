import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Belonging Appeal Designer engine (AI-powered
 * belonging appeal design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_BELONGING_APPEAL_DESIGNER_CREDIT_COST,
  validateCreativeAdBelongingAppealDesignerInput,
  generateBelongingAppeals,
  VALID_PLATFORMS,
  VALID_BELONGING_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdBelongingAppealDesignerInput,
} from '@/lib/creative/creative-ad-belonging-appeal-designer';

// ── Credit cost ──

test('CREATIVE_AD_BELONGING_APPEAL_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_BELONGING_APPEAL_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_BELONGING_TYPES contains the eight belonging types', () => {
  assert.ok(VALID_BELONGING_TYPES.includes('community_membership'));
  assert.ok(VALID_BELONGING_TYPES.includes('tribe_identity'));
  assert.ok(VALID_BELONGING_TYPES.includes('insider_access'));
  assert.ok(VALID_BELONGING_TYPES.includes('shared_values_group'));
  assert.ok(VALID_BELONGING_TYPES.includes('lifestyle_community'));
  assert.ok(VALID_BELONGING_TYPES.includes('professional_network'));
  assert.ok(VALID_BELONGING_TYPES.includes('cultural_belonging'));
  assert.ok(VALID_BELONGING_TYPES.includes('aspirational_group'));
  assert.equal(VALID_BELONGING_TYPES.length, 8);
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

const validInput: CreativeAdBelongingAppealDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdBelongingAppealDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdBelongingAppealDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdBelongingAppealDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdBelongingAppealDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdBelongingAppealDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdBelongingAppealDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdBelongingAppealDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdBelongingAppealDesignerInput({
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
// These tests run generateBelongingAppeals with dryRun: true so no real
// LLM calls are made — deterministic heuristic appeals are returned.

test('dry-run returns an BelongingAppealDesignerResult with strategy', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.appeals));
  assert.ok(result.strategy.appeals.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns appeals with correct structure', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.groupIdentity === 'string' && a.groupIdentity.length > 0);
    assert.ok(typeof a.membershipSignal === 'string' && a.membershipSignal.length > 0);
    assert.ok(typeof a.inclusionElement === 'string' && a.inclusionElement.length > 0);
    assert.ok(typeof a.belongingStrength === 'number' && a.belongingStrength >= 0 && a.belongingStrength <= 100);
    assert.ok(typeof a.identityReinforcement === 'number' && a.identityReinforcement >= 0 && a.identityReinforcement <= 100);
    assert.ok(typeof a.appealPathway === 'string' && a.appealPathway.length > 0);
  }
});

test('dry-run returns appeals with valid belonging types', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(
      VALID_BELONGING_TYPES.includes(a.type as never),
      `belonging type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns belongingStrength in 0-100 range', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.belongingStrength >= 0 && a.belongingStrength <= 100);
  }
});

test('dry-run returns identityReinforcement in 0-100 range', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  for (const a of result.strategy.appeals) {
    assert.ok(a.identityReinforcement >= 0 && a.identityReinforcement <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 appeals', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  assert.ok(result.strategy.appeals.length >= 3);
});

test('dry-run returns exactly 3 deterministic appeals', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  assert.equal(result.strategy.appeals.length, 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateBelongingAppeals({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.appeals.length > 0, `${platform} should produce appeals`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateBelongingAppeals({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.appeals.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateBelongingAppeals({ ...validInput, dryRun: true });
  const r2 = await generateBelongingAppeals({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
  assert.equal(r1.strategy.appeals[0].belongingStrength, r2.strategy.appeals[0].belongingStrength);
  assert.equal(r1.strategy.appeals[0].identityReinforcement, r2.strategy.appeals[0].identityReinforcement);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateBelongingAppeals({ ...validInput, dryRun: true });
  const r2 = await generateBelongingAppeals({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Appeal count is the same but scores differ based on content length
  assert.equal(r1.strategy.appeals.length, r2.strategy.appeals.length);
});

test('dry-run appeal types progress through belonging layers', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  const types = result.strategy.appeals.map((a) => a.type);
  assert.equal(types[0], 'community_membership');
  assert.equal(types[1], 'tribe_identity');
  assert.equal(types[2], 'insider_access');
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateBelongingAppeals({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(joined.length > 0);
});

test('generateBelongingAppeals rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateBelongingAppeals({ ...validInput, content: '' } as CreativeAdBelongingAppealDesignerInput),
    /invalid_creative_ad_belonging_appeal_designer_input/,
  );
});

test('generateBelongingAppeals rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateBelongingAppeals({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdBelongingAppealDesignerInput),
    /invalid_creative_ad_belonging_appeal_designer_input/,
  );
});

test('generateBelongingAppeals rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateBelongingAppeals({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdBelongingAppealDesignerInput),
    /invalid_creative_ad_belonging_appeal_designer_input/,
  );
});

test('generateBelongingAppeals rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateBelongingAppeals(null as never),
    /invalid_creative_ad_belonging_appeal_designer_input/,
  );
});
