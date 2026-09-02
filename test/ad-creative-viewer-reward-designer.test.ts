import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Viewer Reward Designer engine (AI-powered viewer
 * reward system design for ad creative content).
 *
 * Tests cover credit cost, constants, input validation, and dry-run mode (no
 * real LLM calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_VIEWER_REWARD_DESIGNER_CREDIT_COST,
  validateAdCreativeViewerRewardDesignerInput,
  generateViewerRewards,
  VALID_PLATFORMS,
  VALID_REWARD_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeViewerRewardDesignerInput,
} from '@/lib/creative/ad-creative-viewer-reward-designer';

// ── Credit cost ──

test('AD_CREATIVE_VIEWER_REWARD_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_VIEWER_REWARD_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_REWARD_TYPES contains the eight reward types', () => {
  assert.ok(VALID_REWARD_TYPES.includes('easter_egg'));
  assert.ok(VALID_REWARD_TYPES.includes('hidden_detail'));
  assert.ok(VALID_REWARD_TYPES.includes('callback_payoff'));
  assert.ok(VALID_REWARD_TYPES.includes('pattern_completion'));
  assert.ok(VALID_REWARD_TYPES.includes('mystery_reveal'));
  assert.ok(VALID_REWARD_TYPES.includes('emotional_payoff'));
  assert.ok(VALID_REWARD_TYPES.includes('insight_moment'));
  assert.ok(VALID_REWARD_TYPES.includes('humor_reward'));
  assert.equal(VALID_REWARD_TYPES.length, 8);
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

const validInput: AdCreativeViewerRewardDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeViewerRewardDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeViewerRewardDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    platform: 42 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeViewerRewardDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeViewerRewardDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 25-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeViewerRewardDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 25-45',
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeViewerRewardDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeViewerRewardDesignerInput accepts dryRun true', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeViewerRewardDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeViewerRewardDesignerInput({
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
// These tests run generateViewerRewards with dryRun: true so no real LLM
// calls are made — deterministic heuristic reward design is returned.

test('dry-run returns a ViewerRewardDesignerResult with a design', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.design);
  assert.equal(result.dryRun, true);
});

test('dry-run returns rewardScore in 0-100 range', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.ok(
    result.design.rewardScore >= 0 && result.design.rewardScore <= 100,
    `rewardScore out of range: ${result.design.rewardScore}`,
  );
});

test('dry-run returns rewards with correct structure', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.rewards));
  assert.ok(result.design.rewards.length > 0);
  for (const r of result.design.rewards) {
    assert.ok(typeof r.type === 'string' && r.type.length > 0);
    assert.ok(typeof r.description === 'string' && r.description.length > 0);
    assert.ok(typeof r.viewerAction === 'string' && r.viewerAction.length > 0);
    assert.ok(typeof r.payoff === 'string' && r.payoff.length > 0);
    assert.ok(typeof r.satisfactionLevel === 'number');
    assert.ok(r.satisfactionLevel >= 0 && r.satisfactionLevel <= 100);
    assert.ok(typeof r.timing === 'string' && r.timing.length > 0);
  }
});

test('dry-run returns discoveries with correct structure', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.discoveries));
  assert.ok(result.design.discoveries.length > 0);
  for (const d of result.design.discoveries) {
    assert.ok(typeof d.what === 'string' && d.what.length > 0);
    assert.ok(typeof d.when === 'string' && d.when.length > 0);
    assert.ok(typeof d.howRevealed === 'string' && d.howRevealed.length > 0);
    assert.ok(typeof d.discoveryJoy === 'number');
    assert.ok(d.discoveryJoy >= 0 && d.discoveryJoy <= 100);
  }
});

test('dry-run returns triggers with correct structure', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.triggers));
  assert.ok(result.design.triggers.length > 0);
  for (const t of result.design.triggers) {
    assert.ok(typeof t.trigger === 'string' && t.trigger.length > 0);
    assert.ok(typeof t.emotion === 'string' && t.emotion.length > 0);
    assert.ok(typeof t.intensity === 'number');
    assert.ok(t.intensity >= 0 && t.intensity <= 100);
    assert.ok(typeof t.viewerResponse === 'string' && t.viewerResponse.length > 0);
  }
});

test('dry-run returns rewatchIncentives with correct structure', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.rewatchIncentives));
  assert.ok(result.design.rewatchIncentives.length > 0);
  for (const r of result.design.rewatchIncentives) {
    assert.ok(typeof r.incentive === 'string' && r.incentive.length > 0);
    assert.ok(typeof r.method === 'string' && r.method.length > 0);
    assert.ok(typeof r.rewatchValue === 'number');
    assert.ok(r.rewatchValue >= 0 && r.rewatchValue <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.recommendations));
  assert.ok(result.design.recommendations.length > 0);
  for (const rec of result.design.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateViewerRewards({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.design.rewards.length > 0, `${platform} should produce rewards`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateViewerRewards({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.design.rewards.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run rewardScore is the average of the four sub-scores', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  const d = result.design;
  const avgRewards = d.rewards.reduce((s, r) => s + r.satisfactionLevel, 0) / d.rewards.length;
  const avgDiscoveries = d.discoveries.reduce((s, x) => s + x.discoveryJoy, 0) / d.discoveries.length;
  const avgTriggers = d.triggers.reduce((s, t) => s + t.intensity, 0) / d.triggers.length;
  const avgRewatch =
    d.rewatchIncentives.reduce((s, r) => s + r.rewatchValue, 0) / d.rewatchIncentives.length;
  const expected = Math.round((avgRewards + avgDiscoveries + avgTriggers + avgRewatch) / 4);
  assert.equal(d.rewardScore, expected);
});

test('dry-run produces deterministic output for the same input', async () => {
  const a = await generateViewerRewards({ ...validInput, dryRun: true });
  const b = await generateViewerRewards({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run reward types are drawn from VALID_REWARD_TYPES', async () => {
  const result = await generateViewerRewards({ ...validInput, dryRun: true });
  for (const r of result.design.rewards) {
    assert.ok(VALID_REWARD_TYPES.includes(r.type as never), `unexpected type: ${r.type}`);
  }
});

test('generateViewerRewards rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateViewerRewards({ ...validInput, content: '' } as AdCreativeViewerRewardDesignerInput),
    /invalid_ad_creative_viewer_reward_designer_input/,
  );
});

test('generateViewerRewards rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateViewerRewards({
        ...validInput,
        productOrBrand: '',
        dryRun: true,
      } as AdCreativeViewerRewardDesignerInput),
    /invalid_ad_creative_viewer_reward_designer_input/,
  );
});

test('generateViewerRewards rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateViewerRewards({
        ...validInput,
        targetAudience: '',
        dryRun: true,
      } as AdCreativeViewerRewardDesignerInput),
    /invalid_ad_creative_viewer_reward_designer_input/,
  );
});
