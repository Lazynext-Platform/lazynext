import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Stakes Escalation Designer engine (AI-powered
 * escalating stakes design for ad creative content).
 *
 * Tests cover credit cost, constants, input validation, and dry-run mode (no
 * real LLM calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_STAKES_ESCALATION_DESIGNER_CREDIT_COST,
  validateCreativeAdStakesEscalationDesignerInput,
  generateStakesEscalation,
  VALID_PLATFORMS,
  VALID_ESCALATION_STAGES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdStakesEscalationDesignerInput,
} from '@/lib/creative/creative-ad-stakes-escalation-designer';

// ── Credit cost ──

test('CREATIVE_AD_STAKES_ESCALATION_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_STAKES_ESCALATION_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ESCALATION_STAGES contains the six escalation stages', () => {
  assert.ok(VALID_ESCALATION_STAGES.includes('initial_setup'));
  assert.ok(VALID_ESCALATION_STAGES.includes('rising_tension'));
  assert.ok(VALID_ESCALATION_STAGES.includes('complication'));
  assert.ok(VALID_ESCALATION_STAGES.includes('peak_stakes'));
  assert.ok(VALID_ESCALATION_STAGES.includes('consequence_reveal'));
  assert.ok(VALID_ESCALATION_STAGES.includes('transformation'));
  assert.equal(VALID_ESCALATION_STAGES.length, 6);
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

const validInput: CreativeAdStakesEscalationDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdStakesEscalationDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdStakesEscalationDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    platform: 42 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdStakesEscalationDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdStakesEscalationDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 25-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdStakesEscalationDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 25-45',
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdStakesEscalationDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdStakesEscalationDesignerInput accepts dryRun true', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdStakesEscalationDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdStakesEscalationDesignerInput({
    productOrBrand: '',
    content: '',
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.length >= 3);
});

// ── Dry-run mode tests ──
//
// These tests run generateStakesEscalation with dryRun: true so no real LLM
// calls are made — deterministic heuristic stakes escalation is returned.

test('dry-run returns a StakesEscalationDesignerResult with a strategy', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.equal(result.dryRun, true);
});

test('dry-run returns stakes with correct structure', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.stakes));
  assert.ok(result.strategy.stakes.length > 0);
  for (const s of result.strategy.stakes) {
    assert.ok(typeof s.stage === 'string' && s.stage.length > 0);
    assert.ok(typeof s.description === 'string' && s.description.length > 0);
    assert.ok(typeof s.consequence === 'string' && s.consequence.length > 0);
    assert.ok(typeof s.tensionLevel === 'number');
    assert.ok(s.tensionLevel >= 0 && s.tensionLevel <= 100);
    assert.ok(typeof s.emotionalWeight === 'number');
    assert.ok(s.emotionalWeight >= 0 && s.emotionalWeight <= 100);
    assert.ok(typeof s.viewerInvestment === 'number');
    assert.ok(s.viewerInvestment >= 0 && s.viewerInvestment <= 100);
    assert.ok(typeof s.timing === 'string' && s.timing.length > 0);
  }
});

test('dry-run returns stakes stages drawn from VALID_ESCALATION_STAGES', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  for (const s of result.strategy.stakes) {
    assert.ok(
      VALID_ESCALATION_STAGES.includes(s.stage as never),
      `unexpected stage: ${s.stage}`,
    );
  }
});

test('dry-run returns all six escalation stages', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  assert.equal(result.strategy.stakes.length, 6);
  const stages = result.strategy.stakes.map((s) => s.stage);
  for (const stage of VALID_ESCALATION_STAGES) {
    assert.ok(stages.includes(stage), `missing stage: ${stage}`);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateStakesEscalation({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.stakes.length > 0, `${platform} should produce stakes`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateStakesEscalation({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.strategy.stakes.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run produces deterministic output for the same input', async () => {
  const a = await generateStakesEscalation({ ...validInput, dryRun: true });
  const b = await generateStakesEscalation({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run tension levels peak at the peak_stakes stage', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  const stakes = result.strategy.stakes;
  const peak = stakes.find((s) => s.stage === 'peak_stakes');
  const initial = stakes.find((s) => s.stage === 'initial_setup');
  assert.ok(peak);
  assert.ok(initial);
  assert.ok(
    peak.tensionLevel >= initial.tensionLevel,
    `peak tension (${peak.tensionLevel}) should be >= initial tension (${initial.tensionLevel})`,
  );
});

test('dry-run emotional weight is in 0-100 range for all stakes', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  for (const s of result.strategy.stakes) {
    assert.ok(s.emotionalWeight >= 0 && s.emotionalWeight <= 100);
  }
});

test('dry-run viewer investment is in 0-100 range for all stakes', async () => {
  const result = await generateStakesEscalation({ ...validInput, dryRun: true });
  for (const s of result.strategy.stakes) {
    assert.ok(s.viewerInvestment >= 0 && s.viewerInvestment <= 100);
  }
});

test('generateStakesEscalation rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateStakesEscalation({ ...validInput, content: '' } as CreativeAdStakesEscalationDesignerInput),
    /invalid_creative_ad_stakes_escalation_designer_input/,
  );
});

test('generateStakesEscalation rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateStakesEscalation({
        ...validInput,
        productOrBrand: '',
        dryRun: true,
      } as CreativeAdStakesEscalationDesignerInput),
    /invalid_creative_ad_stakes_escalation_designer_input/,
  );
});

test('generateStakesEscalation rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateStakesEscalation({
        ...validInput,
        targetAudience: '',
        dryRun: true,
      } as CreativeAdStakesEscalationDesignerInput),
    /invalid_creative_ad_stakes_escalation_designer_input/,
  );
});
