import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Memory Anchor Builder engine (AI-powered memory
 * anchor creation for ad creative content).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode (no
 * real LLM calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_MEMORY_ANCHOR_BUILDER_CREDIT_COST,
  validateAdCreativeMemoryAnchorBuilderInput,
  generateMemoryAnchors,
  VALID_PLATFORMS,
  VALID_ANCHOR_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeMemoryAnchorBuilderInput,
} from '@/lib/creative/ad-creative-memory-anchor-builder';

// ── Credit cost ──

test('AD_CREATIVE_MEMORY_ANCHOR_BUILDER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_MEMORY_ANCHOR_BUILDER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ANCHOR_TYPES contains the eight anchor types', () => {
  assert.ok(VALID_ANCHOR_TYPES.includes('catchphrase'));
  assert.ok(VALID_ANCHOR_TYPES.includes('visual_symbol'));
  assert.ok(VALID_ANCHOR_TYPES.includes('sound_trigger'));
  assert.ok(VALID_ANCHOR_TYPES.includes('gesture'));
  assert.ok(VALID_ANCHOR_TYPES.includes('color_association'));
  assert.ok(VALID_ANCHOR_TYPES.includes('character_mascot'));
  assert.ok(VALID_ANCHOR_TYPES.includes('ritual_sequence'));
  assert.ok(VALID_ANCHOR_TYPES.includes('surprise_moment'));
  assert.equal(VALID_ANCHOR_TYPES.length, 8);
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

const validInput: AdCreativeMemoryAnchorBuilderInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeMemoryAnchorBuilderInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeMemoryAnchorBuilderInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Fitness enthusiasts 18-35',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeMemoryAnchorBuilderInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeMemoryAnchorBuilderInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Fitness enthusiasts 18-35',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeMemoryAnchorBuilderInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeMemoryAnchorBuilderInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

// ── Dry-run mode tests ──
//
// These tests run generateMemoryAnchors with dryRun: true so no real LLM
// calls are made — deterministic heuristic memory anchors are returned.

test('dry-run returns an AnchorBuilderResult with strategy', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.anchors));
  assert.ok(result.strategy.anchors.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns anchors with correct structure', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  for (const a of result.strategy.anchors) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(VALID_ANCHOR_TYPES.includes(a.type as never));
    assert.ok(typeof a.description === 'string' && a.description.length > 0);
    assert.ok(typeof a.mnemonicDevice === 'string' && a.mnemonicDevice.length > 0);
    assert.ok(typeof a.retentionScore === 'number' && a.retentionScore >= 0 && a.retentionScore <= 100);
    assert.ok(typeof a.placement === 'string' && a.placement.length > 0);
    assert.ok(typeof a.recallTrigger === 'string' && a.recallTrigger.length > 0);
    assert.ok(typeof a.emotionalBinding === 'string' && a.emotionalBinding.length > 0);
  }
});

test('dry-run returns retentionScore in 0-100 range', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  for (const a of result.strategy.anchors) {
    assert.ok(a.retentionScore >= 0 && a.retentionScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateMemoryAnchors({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.anchors.length > 0, `${platform} should produce anchors`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateMemoryAnchors({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.strategy.anchors.length > 0);
});

test('dry-run produces deterministic output for same input', async () => {
  const r1 = await generateMemoryAnchors({ ...validInput, dryRun: true });
  const r2 = await generateMemoryAnchors({ ...validInput, dryRun: true });
  assert.deepEqual(r1, r2);
});

test('dry-run anchors include catchphrase type', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  const types = result.strategy.anchors.map((a) => a.type);
  assert.ok(types.includes('catchphrase'));
});

test('dry-run anchors include visual_symbol type', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  const types = result.strategy.anchors.map((a) => a.type);
  assert.ok(types.includes('visual_symbol'));
});

test('dry-run anchors include sound_trigger type', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  const types = result.strategy.anchors.map((a) => a.type);
  assert.ok(types.includes('sound_trigger'));
});

test('dry-run anchors include surprise_moment type', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  const types = result.strategy.anchors.map((a) => a.type);
  assert.ok(types.includes('surprise_moment'));
});

test('dry-run anchors include color_association type', async () => {
  const result = await generateMemoryAnchors({ ...validInput, dryRun: true });
  const types = result.strategy.anchors.map((a) => a.type);
  assert.ok(types.includes('color_association'));
});

test('generateMemoryAnchors rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateMemoryAnchors({ ...validInput, content: '' } as AdCreativeMemoryAnchorBuilderInput),
    /invalid_ad_creative_memory_anchor_builder_input/,
  );
});

test('generateMemoryAnchors rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateMemoryAnchors({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeMemoryAnchorBuilderInput),
    /invalid_ad_creative_memory_anchor_builder_input/,
  );
});

test('generateMemoryAnchors rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateMemoryAnchors({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeMemoryAnchorBuilderInput),
    /invalid_ad_creative_memory_anchor_builder_input/,
  );
});

test('generateMemoryAnchors rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateMemoryAnchors(null as never),
    /invalid_ad_creative_memory_anchor_builder_input/,
  );
});
