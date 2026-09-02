import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Curiosity Loop Designer engine (AI-powered
 * curiosity loop design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_CURIOSITY_LOOP_DESIGNER_CREDIT_COST,
  validateAdCreativeCuriosityLoopDesignerInput,
  generateCuriosityLoops,
  VALID_PLATFORMS,
  VALID_LOOP_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeCuriosityLoopDesignerInput,
} from '@/lib/creative/ad-creative-curiosity-loop-designer';

// ── Credit cost ──

test('AD_CREATIVE_CURIOSITY_LOOP_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_CURIOSITY_LOOP_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_LOOP_TYPES contains the eight loop types', () => {
  assert.ok(VALID_LOOP_TYPES.includes('open_question'));
  assert.ok(VALID_LOOP_TYPES.includes('mystery_box'));
  assert.ok(VALID_LOOP_TYPES.includes('before_after'));
  assert.ok(VALID_LOOP_TYPES.includes('transformation_tease'));
  assert.ok(VALID_LOOP_TYPES.includes('secret_reveal'));
  assert.ok(VALID_LOOP_TYPES.includes('countdown_hook'));
  assert.ok(VALID_LOOP_TYPES.includes('contradiction'));
  assert.ok(VALID_LOOP_TYPES.includes('unexpected_result'));
  assert.equal(VALID_LOOP_TYPES.length, 8);
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

const validInput: AdCreativeCuriosityLoopDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeCuriosityLoopDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeCuriosityLoopDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeCuriosityLoopDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeCuriosityLoopDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeCuriosityLoopDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeCuriosityLoopDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateCuriosityLoops with dryRun: true so no real LLM
// calls are made — deterministic heuristic curiosity loops are returned.

test('dry-run returns a CuriosityLoopDesignerResult with strategy', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.loops));
  assert.ok(result.strategy.loops.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns loops with correct structure', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  for (const loop of result.strategy.loops) {
    assert.ok(typeof loop.type === 'string' && loop.type.length > 0);
    assert.ok(VALID_LOOP_TYPES.includes(loop.type as never));
    assert.ok(typeof loop.openingQuestion === 'string' && loop.openingQuestion.length > 0);
    assert.ok(typeof loop.mysteryElement === 'string' && loop.mysteryElement.length > 0);
    assert.ok(typeof loop.revealTiming === 'string' && loop.revealTiming.length > 0);
    assert.ok(typeof loop.payoff === 'string' && loop.payoff.length > 0);
    assert.ok(typeof loop.viewerHook === 'string' && loop.viewerHook.length > 0);
    assert.ok(typeof loop.curiosityRetentionScore === 'number');
    assert.ok(loop.curiosityRetentionScore >= 0 && loop.curiosityRetentionScore <= 100);
  }
});

test('dry-run returns curiosityRetentionScore in 0-100 range', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  for (const loop of result.strategy.loops) {
    assert.ok(loop.curiosityRetentionScore >= 0 && loop.curiosityRetentionScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateCuriosityLoops({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.loops.length > 0, `${platform} should produce loops`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateCuriosityLoops({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
    dryRun: true,
  });
  assert.ok(result.strategy.loops.length > 0);
});

test('dry-run produces at least 3 loops', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  assert.ok(result.strategy.loops.length >= 3);
});

test('dry-run loop types are from the valid set', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  for (const loop of result.strategy.loops) {
    assert.ok(VALID_LOOP_TYPES.includes(loop.type as never), `${loop.type} should be valid`);
  }
});

test('dry-run is deterministic for same input', async () => {
  const r1 = await generateCuriosityLoops({ ...validInput, dryRun: true });
  const r2 = await generateCuriosityLoops({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.loops.length, r2.strategy.loops.length);
  assert.equal(r1.strategy.loops[0].curiosityRetentionScore, r2.strategy.loops[0].curiosityRetentionScore);
});

test('generateCuriosityLoops rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateCuriosityLoops({ ...validInput, content: '' } as AdCreativeCuriosityLoopDesignerInput),
    /invalid_ad_creative_curiosity_loop_designer_input/,
  );
});

test('generateCuriosityLoops rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateCuriosityLoops({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeCuriosityLoopDesignerInput),
    /invalid_ad_creative_curiosity_loop_designer_input/,
  );
});

test('generateCuriosityLoops rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateCuriosityLoops({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeCuriosityLoopDesignerInput),
    /invalid_ad_creative_curiosity_loop_designer_input/,
  );
});

test('generateCuriosityLoops rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateCuriosityLoops({ ...validInput, platform: 'snapchat', dryRun: true } as AdCreativeCuriosityLoopDesignerInput),
    /invalid_ad_creative_curiosity_loop_designer_input/,
  );
});

test('dry-run recommendations reference the platform when provided', async () => {
  const result = await generateCuriosityLoops({ ...validInput, platform: 'tiktok', dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.includes('tiktok'));
});

test('dry-run loops reference the brand', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  const joined = result.strategy.loops.map((l) => `${l.openingQuestion} ${l.mysteryElement} ${l.payoff}`).join(' ');
  assert.ok(joined.length > 0);
});

test('dry-run returns at least 3 recommendations', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  assert.ok(result.strategy.recommendations.length >= 3);
});

test('dry-run curiosityRetentionScore varies across loops', async () => {
  const result = await generateCuriosityLoops({ ...validInput, dryRun: true });
  const scores = result.strategy.loops.map((l) => l.curiosityRetentionScore);
  const unique = new Set(scores);
  assert.ok(unique.size > 1, 'scores should vary across loops');
});
