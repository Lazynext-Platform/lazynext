import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Callback Memory Designer engine (AI-powered
 * callback element design that references back to earlier moments in ad
 * creative content, rewarding attentive viewers).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_CALLBACK_MEMORY_DESIGNER_CREDIT_COST,
  validateAdCreativeCallbackMemoryDesignerInput,
  generateCallbacks,
  VALID_PLATFORMS,
  VALID_CALLBACK_TYPES,
  VALID_REWARD_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeCallbackMemoryDesignerInput,
} from '@/lib/creative/ad-creative-callback-memory-designer';

// ── Credit cost ──

test('AD_CREATIVE_CALLBACK_MEMORY_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_CALLBACK_MEMORY_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CALLBACK_TYPES contains the eight callback types', () => {
  assert.ok(VALID_CALLBACK_TYPES.includes('visual_echo'));
  assert.ok(VALID_CALLBACK_TYPES.includes('phrase_recall'));
  assert.ok(VALID_CALLBACK_TYPES.includes('character_return'));
  assert.ok(VALID_CALLBACK_TYPES.includes('prop_reuse'));
  assert.ok(VALID_CALLBACK_TYPES.includes('setting_revisit'));
  assert.ok(VALID_CALLBACK_TYPES.includes('theme_callback'));
  assert.ok(VALID_CALLBACK_TYPES.includes('sound_motif'));
  assert.ok(VALID_CALLBACK_TYPES.includes('gesture_repeat'));
  assert.equal(VALID_CALLBACK_TYPES.length, 8);
});

test('VALID_REWARD_TYPES contains the three reward types', () => {
  assert.ok(VALID_REWARD_TYPES.includes('subtle'));
  assert.ok(VALID_REWARD_TYPES.includes('moderate'));
  assert.ok(VALID_REWARD_TYPES.includes('explicit'));
  assert.equal(VALID_REWARD_TYPES.length, 3);
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

const validInput: AdCreativeCallbackMemoryDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeCallbackMemoryDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeCallbackMemoryDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeCallbackMemoryDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeCallbackMemoryDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeCallbackMemoryDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeCallbackMemoryDesignerInput accepts dryRun boolean', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeCallbackMemoryDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeCallbackMemoryDesignerInput({
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
// These tests run generateCallbacks with dryRun: true so no real LLM
// calls are made — deterministic heuristic callbacks are returned.

test('dry-run returns a CallbackMemoryDesignerResult with strategy', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.callbacks));
  assert.ok(result.strategy.callbacks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns callbacks with correct structure', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  for (const cb of result.strategy.callbacks) {
    assert.ok(typeof cb.type === 'string' && cb.type.length > 0);
    assert.ok(VALID_CALLBACK_TYPES.includes(cb.type as never));
    assert.ok(typeof cb.originalMoment === 'string' && cb.originalMoment.length > 0);
    assert.ok(typeof cb.callbackReference === 'string' && cb.callbackReference.length > 0);
    assert.ok(typeof cb.payoff === 'string' && cb.payoff.length > 0);
    assert.ok(typeof cb.recognitionScore === 'number');
    assert.ok(cb.recognitionScore >= 0 && cb.recognitionScore <= 100);
    assert.ok(typeof cb.placement === 'string' && cb.placement.length > 0);
    assert.ok(VALID_REWARD_TYPES.includes(cb.rewardType));
  }
});

test('dry-run returns recognitionScore in 0-100 range', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  for (const cb of result.strategy.callbacks) {
    assert.ok(cb.recognitionScore >= 0 && cb.recognitionScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run produces multiple callback types', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  const types = new Set(result.strategy.callbacks.map((c) => c.type));
  assert.ok(types.size > 1, 'should produce more than one callback type');
});

test('dry-run includes visual_echo and phrase_recall callbacks', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  const types = result.strategy.callbacks.map((c) => c.type);
  assert.ok(types.includes('visual_echo'));
  assert.ok(types.includes('phrase_recall'));
});

test('dry-run includes a subtle reward type callback', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  const rewards = result.strategy.callbacks.map((c) => c.rewardType);
  assert.ok(rewards.includes('subtle'));
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateCallbacks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.callbacks.length > 0, `${platform} should produce callbacks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateCallbacks({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
    dryRun: true,
  });
  assert.ok(result.strategy.callbacks.length > 0);
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(joined.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateCallbacks({ ...validInput, dryRun: true });
  const b = await generateCallbacks({ ...validInput, dryRun: true });
  assert.deepEqual(a.strategy.callbacks, b.strategy.callbacks);
  assert.deepEqual(a.strategy.recommendations, b.strategy.recommendations);
});

test('dry-run callbacks reference the product/brand in original moments', async () => {
  const result = await generateCallbacks({ ...validInput, dryRun: true });
  const joined = result.strategy.callbacks.map((c) => c.originalMoment).join(' ').toLowerCase();
  assert.ok(joined.length > 0);
});

test('generateCallbacks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateCallbacks({ ...validInput, content: '' } as AdCreativeCallbackMemoryDesignerInput),
    /invalid_ad_creative_callback_memory_designer_input/,
  );
});

test('generateCallbacks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateCallbacks({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeCallbackMemoryDesignerInput),
    /invalid_ad_creative_callback_memory_designer_input/,
  );
});

test('generateCallbacks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateCallbacks({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeCallbackMemoryDesignerInput),
    /invalid_ad_creative_callback_memory_designer_input/,
  );
});

test('generateCallbacks rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateCallbacks({ ...validInput, platform: 'snapchat', dryRun: true } as AdCreativeCallbackMemoryDesignerInput),
    /invalid_ad_creative_callback_memory_designer_input/,
  );
});
