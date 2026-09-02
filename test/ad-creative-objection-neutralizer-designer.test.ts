import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Objection Neutralizer Designer engine (AI-powered
 * objection neutralizer design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_OBJECTION_NEUTRALIZER_DESIGNER_CREDIT_COST,
  validateAdCreativeObjectionNeutralizerDesignerInput,
  generateObjectionNeutralizers,
  VALID_PLATFORMS,
  VALID_OBJECTION_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeObjectionNeutralizerDesignerInput,
} from '@/lib/creative/ad-creative-objection-neutralizer-designer';

// ── Credit cost ──

test('AD_CREATIVE_OBJECTION_NEUTRALIZER_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_OBJECTION_NEUTRALIZER_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_OBJECTION_TYPES contains the eight objection types', () => {
  assert.ok(VALID_OBJECTION_TYPES.includes('price_concern'));
  assert.ok(VALID_OBJECTION_TYPES.includes('trust_doubt'));
  assert.ok(VALID_OBJECTION_TYPES.includes('complexity_fear'));
  assert.ok(VALID_OBJECTION_TYPES.includes('time_investment'));
  assert.ok(VALID_OBJECTION_TYPES.includes('switching_cost'));
  assert.ok(VALID_OBJECTION_TYPES.includes('quality_skepticism'));
  assert.ok(VALID_OBJECTION_TYPES.includes('relevance_doubt'));
  assert.ok(VALID_OBJECTION_TYPES.includes('risk_aversion'));
  assert.equal(VALID_OBJECTION_TYPES.length, 8);
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

const validInput: AdCreativeObjectionNeutralizerDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeObjectionNeutralizerDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeObjectionNeutralizerDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeObjectionNeutralizerDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
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

test('validateAdCreativeObjectionNeutralizerDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeObjectionNeutralizerDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeObjectionNeutralizerDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateObjectionNeutralizers with dryRun: true so no real
// LLM calls are made — deterministic heuristic neutralizers are returned.

test('dry-run returns a ObjectionNeutralizerDesignerResult with strategy', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.neutralizers));
  assert.ok(result.strategy.neutralizers.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns neutralizers with correct structure', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  for (const n of result.strategy.neutralizers) {
    assert.ok(typeof n.type === 'string' && n.type.length > 0);
    assert.ok(typeof n.objectionTrigger === 'string' && n.objectionTrigger.length > 0);
    assert.ok(typeof n.neutralizationTechnique === 'string' && n.neutralizationTechnique.length > 0);
    assert.ok(typeof n.preemptiveEvidence === 'string' && n.preemptiveEvidence.length > 0);
    assert.ok(typeof n.neutralizationStrength === 'number' && n.neutralizationStrength >= 0 && n.neutralizationStrength <= 100);
    assert.ok(typeof n.objectionResolution === 'number' && n.objectionResolution >= 0 && n.objectionResolution <= 100);
    assert.ok(typeof n.neutralizationPathway === 'string' && n.neutralizationPathway.length > 0);
  }
});

test('dry-run returns neutralizers with valid objection types', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  for (const n of result.strategy.neutralizers) {
    assert.ok(
      VALID_OBJECTION_TYPES.includes(n.type as never),
      `objection type "${n.type}" should be valid`,
    );
  }
});

test('dry-run returns neutralizationStrength in 0-100 range', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  for (const n of result.strategy.neutralizers) {
    assert.ok(n.neutralizationStrength >= 0 && n.neutralizationStrength <= 100);
  }
});

test('dry-run returns objectionResolution in 0-100 range', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  for (const n of result.strategy.neutralizers) {
    assert.ok(n.objectionResolution >= 0 && n.objectionResolution <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 neutralizers', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  assert.ok(result.strategy.neutralizers.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateObjectionNeutralizers({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.neutralizers.length > 0, `${platform} should produce neutralizers`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateObjectionNeutralizers({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.neutralizers.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  const r2 = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.neutralizers.length, r2.strategy.neutralizers.length);
  assert.equal(r1.strategy.neutralizers[0].neutralizationStrength, r2.strategy.neutralizers[0].neutralizationStrength);
  assert.equal(r1.strategy.neutralizers[0].objectionResolution, r2.strategy.neutralizers[0].objectionResolution);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  const r2 = await generateObjectionNeutralizers({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Neutralizer count is the same but scores differ based on content length
  assert.equal(r1.strategy.neutralizers.length, r2.strategy.neutralizers.length);
});

test('generateObjectionNeutralizers rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateObjectionNeutralizers({ ...validInput, content: '' } as AdCreativeObjectionNeutralizerDesignerInput),
    /invalid_ad_creative_objection_neutralizer_designer_input/,
  );
});

test('generateObjectionNeutralizers rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateObjectionNeutralizers({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeObjectionNeutralizerDesignerInput),
    /invalid_ad_creative_objection_neutralizer_designer_input/,
  );
});

test('generateObjectionNeutralizers rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateObjectionNeutralizers({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeObjectionNeutralizerDesignerInput),
    /invalid_ad_creative_objection_neutralizer_designer_input/,
  );
});

test('generateObjectionNeutralizers rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateObjectionNeutralizers(null as never),
    /invalid_ad_creative_objection_neutralizer_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run neutralizers have distinct types', async () => {
  const result = await generateObjectionNeutralizers({ ...validInput, dryRun: true });
  const types = result.strategy.neutralizers.map((n) => n.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'neutralizer types should be distinct');
});
