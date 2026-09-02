import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Sequencer engine (AI-powered multi-touch creative
 * sequence generation for ad campaigns).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_SEQUENCER_CREDIT_COST,
  validateAdCreativeSequencerInput,
  generateCreativeSequence,
  VALID_PLATFORMS,
  VALID_CAMPAIGN_GOALS,
  MAX_PRODUCT_LENGTH,
  MIN_CREATIVE_COUNT,
  MAX_CREATIVE_COUNT,
  DEFAULT_CREATIVE_COUNT,
  type AdCreativeSequencerInput,
} from '@/lib/creative/ad-creative-sequencer';

// ── Credit cost ──

test('AD_CREATIVE_SEQUENCER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_SEQUENCER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_CAMPAIGN_GOALS contains the five goals', () => {
  assert.ok(VALID_CAMPAIGN_GOALS.includes('awareness'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('engagement'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('conversions'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('traffic'));
  assert.ok(VALID_CAMPAIGN_GOALS.includes('app_installs'));
  assert.equal(VALID_CAMPAIGN_GOALS.length, 5);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('creative count bounds are 2-8 with default 4', () => {
  assert.equal(MIN_CREATIVE_COUNT, 2);
  assert.equal(MAX_CREATIVE_COUNT, 8);
  assert.equal(DEFAULT_CREATIVE_COUNT, 4);
});

// ── Input validation tests ──

const validInput: AdCreativeSequencerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  campaignGoal: 'awareness',
  creativeCount: 4,
};

test('validateAdCreativeSequencerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeSequencerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeSequencerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeSequencerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeSequencerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeSequencerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeSequencerInput rejects missing campaignGoal', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    campaignGoal: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_required'));
});

test('validateAdCreativeSequencerInput rejects invalid campaignGoal', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    campaignGoal: 'branding' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_invalid'));
});

test('validateAdCreativeSequencerInput rejects creativeCount below 2', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    creativeCount: 1,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_count_out_of_range'));
});

test('validateAdCreativeSequencerInput rejects creativeCount above 8', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    creativeCount: 9,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_count_out_of_range'));
});

test('validateAdCreativeSequencerInput rejects invalid creativeCount type', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    creativeCount: 'four' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_count_invalid'));
});

test('validateAdCreativeSequencerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeSequencerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeSequencerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeSequencerInput({
    productOrBrand: 'A new fitness app',
    campaignGoal: 'engagement',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateCreativeSequence with dryRun: true so no real LLM
// calls are made — deterministic heuristic stages are returned instead.

test('dry-run returns a CreativeSequencerResult with a sequence', async () => {
  const result = await generateCreativeSequence({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.sequence);
  assert.ok(Array.isArray(result.sequence.stages));
  assert.ok(result.sequence.stages.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns stages with correct structure', async () => {
  const result = await generateCreativeSequence({ ...validInput, dryRun: true });
  for (const stage of result.sequence.stages) {
    assert.ok(typeof stage.order === 'number');
    assert.ok(typeof stage.name === 'string' && stage.name.length > 0);
    assert.ok(typeof stage.purpose === 'string' && stage.purpose.length > 0);
    assert.ok(typeof stage.creativeBrief === 'string' && stage.creativeBrief.length > 0);
    assert.ok(typeof stage.transitionToNext === 'string');
    assert.ok(typeof stage.durationDays === 'number' && stage.durationDays > 0);
    assert.ok(typeof stage.expectedImpact === 'string' && stage.expectedImpact.length > 0);
  }
});

test('dry-run returns the requested count of stages', async () => {
  const result = await generateCreativeSequence({ ...validInput, creativeCount: 6, dryRun: true });
  assert.equal(result.sequence.stages.length, 6);
});

test('dry-run defaults to 4 stages when creativeCount not provided', async () => {
  const result = await generateCreativeSequence({
    productOrBrand: 'A coffee subscription',
    campaignGoal: 'conversions',
    dryRun: true,
  });
  assert.equal(result.sequence.stages.length, DEFAULT_CREATIVE_COUNT);
});

test('dry-run returns narrative arc, total duration, touchpoint strategy, and recommendations', async () => {
  const result = await generateCreativeSequence({ ...validInput, dryRun: true });
  assert.ok(typeof result.sequence.narrativeArc === 'string' && result.sequence.narrativeArc.length > 0);
  assert.ok(typeof result.sequence.totalDuration === 'number' && result.sequence.totalDuration > 0);
  assert.ok(typeof result.sequence.touchpointStrategy === 'string' && result.sequence.touchpointStrategy.length > 0);
  assert.ok(Array.isArray(result.sequence.recommendations));
  assert.ok(result.sequence.recommendations.length > 0);
});

test('dry-run works for all five campaign goals', async () => {
  for (const goal of VALID_CAMPAIGN_GOALS) {
    const result = await generateCreativeSequence({
      productOrBrand: 'A fitness app',
      campaignGoal: goal,
      dryRun: true,
    });
    assert.ok(result.sequence.stages.length > 0, `${goal} should produce stages`);
  }
});

test('generateCreativeSequence rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateCreativeSequence({ ...validInput, productOrBrand: '' } as AdCreativeSequencerInput),
    /invalid_ad_creative_sequencer_input/,
  );
});

test('generateCreativeSequence rejects invalid campaignGoal in dry-run mode', async () => {
  await assert.rejects(
    () => generateCreativeSequence({ ...validInput, campaignGoal: 'branding' as never, dryRun: true } as AdCreativeSequencerInput),
    /invalid_ad_creative_sequencer_input/,
  );
});

test('generateCreativeSequence rejects invalid creativeCount in dry-run mode', async () => {
  await assert.rejects(
    () => generateCreativeSequence({ ...validInput, creativeCount: 100, dryRun: true } as AdCreativeSequencerInput),
    /invalid_ad_creative_sequencer_input/,
  );
});
