import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Value Ladder Designer engine (AI-powered
 * value ladder design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_VALUE_LADDER_DESIGNER_CREDIT_COST,
  validateCreativeAdValueLadderDesignerInput,
  generateValueLadders,
  VALID_PLATFORMS,
  VALID_STEP_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdValueLadderDesignerInput,
} from '@/lib/creative/creative-ad-value-ladder-designer';

// ── Credit cost ──

test('CREATIVE_AD_VALUE_LADDER_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_VALUE_LADDER_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_STEP_TYPES contains the eight step types', () => {
  assert.ok(VALID_STEP_TYPES.includes('awareness_step'));
  assert.ok(VALID_STEP_TYPES.includes('interest_step'));
  assert.ok(VALID_STEP_TYPES.includes('trial_step'));
  assert.ok(VALID_STEP_TYPES.includes('commitment_step'));
  assert.ok(VALID_STEP_TYPES.includes('adoption_step'));
  assert.ok(VALID_STEP_TYPES.includes('expansion_step'));
  assert.ok(VALID_STEP_TYPES.includes('advocacy_step'));
  assert.ok(VALID_STEP_TYPES.includes('loyalty_step'));
  assert.equal(VALID_STEP_TYPES.length, 8);
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

const validInput: CreativeAdValueLadderDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdValueLadderDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdValueLadderDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdValueLadderDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdValueLadderDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdValueLadderDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdValueLadderDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdValueLadderDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdValueLadderDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdValueLadderDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdValueLadderDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdValueLadderDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdValueLadderDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdValueLadderDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdValueLadderDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdValueLadderDesignerInput({
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
// These tests run generateValueLadders with dryRun: true so no real LLM
// calls are made — deterministic heuristic steps are returned.

test('dry-run returns a ValueLadderDesignerResult with strategy', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.steps));
  assert.ok(result.strategy.steps.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns steps with correct structure', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  for (const s of result.strategy.steps) {
    assert.ok(typeof s.type === 'string' && s.type.length > 0);
    assert.ok(typeof s.valueProposition === 'string' && s.valueProposition.length > 0);
    assert.ok(typeof s.commitmentLevel === 'string' && s.commitmentLevel.length > 0);
    assert.ok(typeof s.nextStepTrigger === 'string' && s.nextStepTrigger.length > 0);
    assert.ok(typeof s.perceivedValue === 'number' && s.perceivedValue >= 0 && s.perceivedValue <= 100);
    assert.ok(typeof s.commitmentFriction === 'number' && s.commitmentFriction >= 0 && s.commitmentFriction <= 100);
    assert.ok(typeof s.ladderProgression === 'string' && s.ladderProgression.length > 0);
  }
});

test('dry-run returns steps with valid step types', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  for (const s of result.strategy.steps) {
    assert.ok(
      VALID_STEP_TYPES.includes(s.type as never),
      `step type "${s.type}" should be valid`,
    );
  }
});

test('dry-run returns perceivedValue in 0-100 range', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  for (const s of result.strategy.steps) {
    assert.ok(s.perceivedValue >= 0 && s.perceivedValue <= 100);
  }
});

test('dry-run returns commitmentFriction in 0-100 range', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  for (const s of result.strategy.steps) {
    assert.ok(s.commitmentFriction >= 0 && s.commitmentFriction <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 4 steps', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  assert.ok(result.strategy.steps.length >= 4);
});

test('dry-run returns exactly 4 deterministic ladder steps', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  assert.equal(result.strategy.steps.length, 4);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateValueLadders({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.steps.length > 0, `${platform} should produce steps`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateValueLadders({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.steps.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateValueLadders({ ...validInput, dryRun: true });
  const r2 = await generateValueLadders({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.steps.length, r2.strategy.steps.length);
  assert.equal(r1.strategy.steps[0].perceivedValue, r2.strategy.steps[0].perceivedValue);
  assert.equal(r1.strategy.steps[0].commitmentFriction, r2.strategy.steps[0].commitmentFriction);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateValueLadders({ ...validInput, dryRun: true });
  const r2 = await generateValueLadders({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Step count is the same but scores differ based on content length
  assert.equal(r1.strategy.steps.length, r2.strategy.steps.length);
});

test('dry-run step types progress through the ladder', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  const types = result.strategy.steps.map((s) => s.type);
  assert.equal(types[0], 'awareness_step');
  assert.equal(types[1], 'interest_step');
  assert.equal(types[2], 'trial_step');
  assert.equal(types[3], 'commitment_step');
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateValueLadders({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(joined.length > 0);
});

test('generateValueLadders rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateValueLadders({ ...validInput, content: '' } as CreativeAdValueLadderDesignerInput),
    /invalid_creative_ad_value_ladder_designer_input/,
  );
});

test('generateValueLadders rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateValueLadders({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdValueLadderDesignerInput),
    /invalid_creative_ad_value_ladder_designer_input/,
  );
});

test('generateValueLadders rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateValueLadders({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdValueLadderDesignerInput),
    /invalid_creative_ad_value_ladder_designer_input/,
  );
});

test('generateValueLadders rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateValueLadders(null as never),
    /invalid_creative_ad_value_ladder_designer_input/,
  );
});
