import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Narrative Twist Designer engine (AI-powered
 * narrative twist design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_NARRATIVE_TWIST_DESIGNER_CREDIT_COST,
  validateCreativeAdNarrativeTwistDesignerInput,
  generateTwists,
  VALID_PLATFORMS,
  VALID_TWIST_TYPES,
  VALID_EMOTIONAL_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdNarrativeTwistDesignerInput,
} from '@/lib/creative/creative-ad-narrative-twist-designer';

// ── Credit cost ──

test('CREATIVE_AD_NARRATIVE_TWIST_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_NARRATIVE_TWIST_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_TWIST_TYPES contains the eight twist types', () => {
  assert.ok(VALID_TWIST_TYPES.includes('reversal'));
  assert.ok(VALID_TWIST_TYPES.includes('misdirection'));
  assert.ok(VALID_TWIST_TYPES.includes('reveal'));
  assert.ok(VALID_TWIST_TYPES.includes('perspective_shift'));
  assert.ok(VALID_TWIST_TYPES.includes('time_jump'));
  assert.ok(VALID_TWIST_TYPES.includes('identity_reveal'));
  assert.ok(VALID_TWIST_TYPES.includes('expectation_flip'));
  assert.ok(VALID_TWIST_TYPES.includes('context_shift'));
  assert.equal(VALID_TWIST_TYPES.length, 8);
});

test('VALID_EMOTIONAL_IMPACTS contains the three impacts', () => {
  assert.ok(VALID_EMOTIONAL_IMPACTS.includes('low'));
  assert.ok(VALID_EMOTIONAL_IMPACTS.includes('medium'));
  assert.ok(VALID_EMOTIONAL_IMPACTS.includes('high'));
  assert.equal(VALID_EMOTIONAL_IMPACTS.length, 3);
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

const validInput: CreativeAdNarrativeTwistDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'A woman struggles with dull skin until she discovers our serum and her confidence blooms.',
  targetAudience: 'Women 25-40 interested in skincare and self-care',
  platform: 'tiktok',
};

test('validateCreativeAdNarrativeTwistDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdNarrativeTwistDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A busy professional finds time to work out with our 7-minute routines.',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdNarrativeTwistDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdNarrativeTwistDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A busy professional finds time to work out with our 7-minute routines.',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdNarrativeTwistDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdNarrativeTwistDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

// ── Dry-run mode tests ──
//
// These tests run generateTwists with dryRun: true so no real LLM calls are
// made — deterministic heuristic twist concepts are returned.

test('dry-run returns a TwistDesignerResult with strategy', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.twists));
  assert.ok(result.strategy.twists.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns twists with correct structure', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  for (const tw of result.strategy.twists) {
    assert.ok(typeof tw.type === 'string' && tw.type.length > 0);
    assert.ok(VALID_TWIST_TYPES.includes(tw.type as never));
    assert.ok(typeof tw.setup === 'string' && tw.setup.length > 0);
    assert.ok(typeof tw.twist === 'string' && tw.twist.length > 0);
    assert.ok(typeof tw.payoff === 'string' && tw.payoff.length > 0);
    assert.ok(typeof tw.surpriseScore === 'number' && tw.surpriseScore >= 0 && tw.surpriseScore <= 100);
    assert.ok(typeof tw.implementation === 'string' && tw.implementation.length > 0);
    assert.ok(VALID_EMOTIONAL_IMPACTS.includes(tw.emotionalImpact));
  }
});

test('dry-run returns surpriseScore in 0-100 range', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  for (const tw of result.strategy.twists) {
    assert.ok(tw.surpriseScore >= 0 && tw.surpriseScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateTwists({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.twists.length > 0, `${platform} should produce twists`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateTwists({
    productOrBrand: 'A fitness app',
    content: 'A busy professional finds time to work out with our 7-minute routines.',
    targetAudience: 'Busy professionals 30-50',
    dryRun: true,
  });
  assert.ok(result.strategy.twists.length > 0);
});

test('dry-run returns twists with valid twist types', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  for (const tw of result.strategy.twists) {
    assert.ok(
      VALID_TWIST_TYPES.includes(tw.type as never),
      `${tw.type} should be a valid twist type`,
    );
  }
});

test('dry-run returns twists with valid emotional impacts', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  for (const tw of result.strategy.twists) {
    assert.ok(
      VALID_EMOTIONAL_IMPACTS.includes(tw.emotionalImpact),
      `${tw.emotionalImpact} should be a valid emotional impact`,
    );
  }
});

test('dry-run returns at least one twist', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  assert.ok(result.strategy.twists.length >= 1);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateTwists({ ...validInput, dryRun: true });
  const b = await generateTwists({ ...validInput, dryRun: true });
  assert.equal(a.strategy.twists.length, b.strategy.twists.length);
  assert.equal(a.strategy.twists[0].surpriseScore, b.strategy.twists[0].surpriseScore);
  assert.equal(a.strategy.twists[0].type, b.strategy.twists[0].type);
});

test('generateTwists rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateTwists({ ...validInput, content: '' } as CreativeAdNarrativeTwistDesignerInput),
    /invalid_creative_ad_narrative_twist_designer_input/,
  );
});

test('generateTwists rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateTwists({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdNarrativeTwistDesignerInput),
    /invalid_creative_ad_narrative_twist_designer_input/,
  );
});

test('generateTwists rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateTwists({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdNarrativeTwistDesignerInput),
    /invalid_creative_ad_narrative_twist_designer_input/,
  );
});

test('generateTwists rejects over-length productOrBrand', async () => {
  await assert.rejects(
    () =>
      generateTwists({
        ...validInput,
        productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
        dryRun: true,
      } as CreativeAdNarrativeTwistDesignerInput),
    /invalid_creative_ad_narrative_twist_designer_input/,
  );
});

test('generateTwists rejects over-length content', async () => {
  await assert.rejects(
    () =>
      generateTwists({
        ...validInput,
        content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
        dryRun: true,
      } as CreativeAdNarrativeTwistDesignerInput),
    /invalid_creative_ad_narrative_twist_designer_input/,
  );
});

test('generateTwists rejects over-length targetAudience', async () => {
  await assert.rejects(
    () =>
      generateTwists({
        ...validInput,
        targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
        dryRun: true,
      } as CreativeAdNarrativeTwistDesignerInput),
    /invalid_creative_ad_narrative_twist_designer_input/,
  );
});

test('generateTwists rejects invalid platform', async () => {
  await assert.rejects(
    () =>
      generateTwists({
        ...validInput,
        platform: 'snapchat' as never,
        dryRun: true,
      } as CreativeAdNarrativeTwistDesignerInput),
    /invalid_creative_ad_narrative_twist_designer_input/,
  );
});

test('dry-run returns twists with non-empty implementation guides', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  for (const tw of result.strategy.twists) {
    assert.ok(tw.implementation.length > 10, 'implementation guide should be substantive');
  }
});

test('dry-run returns recommendations as strings', async () => {
  const result = await generateTwists({ ...validInput, dryRun: true });
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});
