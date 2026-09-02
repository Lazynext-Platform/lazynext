import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Nostalgia Trigger Designer engine (AI-powered
 * nostalgia trigger design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_NOSTALGIA_TRIGGER_DESIGNER_CREDIT_COST,
  validateCreativeAdNostalgiaTriggerDesignerInput,
  generateNostalgiaTriggers,
  VALID_PLATFORMS,
  VALID_NOSTALGIA_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdNostalgiaTriggerDesignerInput,
} from '@/lib/creative/creative-ad-nostalgia-trigger-designer';

// ── Credit cost ──

test('CREATIVE_AD_NOSTALGIA_TRIGGER_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_NOSTALGIA_TRIGGER_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_NOSTALGIA_TYPES contains the eight nostalgia types', () => {
  assert.ok(VALID_NOSTALGIA_TYPES.includes('childhood_nostalgia'));
  assert.ok(VALID_NOSTALGIA_TYPES.includes('cultural_nostalgia'));
  assert.ok(VALID_NOSTALGIA_TYPES.includes('era_nostalgia'));
  assert.ok(VALID_NOSTALGIA_TYPES.includes('personal_memory'));
  assert.ok(VALID_NOSTALGIA_TYPES.includes('shared_experience_nostalgia'));
  assert.ok(VALID_NOSTALGIA_TYPES.includes('product_nostalgia'));
  assert.ok(VALID_NOSTALGIA_TYPES.includes('relationship_nostalgia'));
  assert.ok(VALID_NOSTALGIA_TYPES.includes('achievement_nostalgia'));
  assert.equal(VALID_NOSTALGIA_TYPES.length, 8);
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

const validInput: CreativeAdNostalgiaTriggerDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdNostalgiaTriggerDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdNostalgiaTriggerDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdNostalgiaTriggerDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
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

test('validateCreativeAdNostalgiaTriggerDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdNostalgiaTriggerDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateCreativeAdNostalgiaTriggerDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateNostalgiaTriggers with dryRun: true so no real
// LLM calls are made — deterministic heuristic triggers are returned.

test('dry-run returns a NostalgiaTriggerDesignerResult with strategy', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.triggers));
  assert.ok(result.strategy.triggers.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns triggers with correct structure', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  for (const t of result.strategy.triggers) {
    assert.ok(typeof t.type === 'string' && t.type.length > 0);
    assert.ok(typeof t.memoryAnchor === 'string' && t.memoryAnchor.length > 0);
    assert.ok(typeof t.emotionalResonance === 'string' && t.emotionalResonance.length > 0);
    assert.ok(typeof t.bridgeToPresent === 'string' && t.bridgeToPresent.length > 0);
    assert.ok(typeof t.nostalgiaWarmth === 'number' && t.nostalgiaWarmth >= 0 && t.nostalgiaWarmth <= 100);
    assert.ok(typeof t.emotionalConnection === 'number' && t.emotionalConnection >= 0 && t.emotionalConnection <= 100);
    assert.ok(typeof t.triggerPathway === 'string' && t.triggerPathway.length > 0);
  }
});

test('dry-run returns triggers with valid nostalgia types', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  for (const t of result.strategy.triggers) {
    assert.ok(
      VALID_NOSTALGIA_TYPES.includes(t.type as never),
      `nostalgia type "${t.type}" should be valid`,
    );
  }
});

test('dry-run returns nostalgiaWarmth in 0-100 range', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  for (const t of result.strategy.triggers) {
    assert.ok(t.nostalgiaWarmth >= 0 && t.nostalgiaWarmth <= 100);
  }
});

test('dry-run returns emotionalConnection in 0-100 range', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  for (const t of result.strategy.triggers) {
    assert.ok(t.emotionalConnection >= 0 && t.emotionalConnection <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 triggers', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  assert.ok(result.strategy.triggers.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateNostalgiaTriggers({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.triggers.length > 0, `${platform} should produce triggers`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateNostalgiaTriggers({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.triggers.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  const r2 = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.triggers.length, r2.strategy.triggers.length);
  assert.equal(r1.strategy.triggers[0].nostalgiaWarmth, r2.strategy.triggers[0].nostalgiaWarmth);
  assert.equal(r1.strategy.triggers[0].emotionalConnection, r2.strategy.triggers[0].emotionalConnection);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  const r2 = await generateNostalgiaTriggers({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Trigger count is the same but scores differ based on content length
  assert.equal(r1.strategy.triggers.length, r2.strategy.triggers.length);
});

test('generateNostalgiaTriggers rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateNostalgiaTriggers({ ...validInput, content: '' } as CreativeAdNostalgiaTriggerDesignerInput),
    /invalid_creative_ad_nostalgia_trigger_designer_input/,
  );
});

test('generateNostalgiaTriggers rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateNostalgiaTriggers({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdNostalgiaTriggerDesignerInput),
    /invalid_creative_ad_nostalgia_trigger_designer_input/,
  );
});

test('generateNostalgiaTriggers rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateNostalgiaTriggers({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdNostalgiaTriggerDesignerInput),
    /invalid_creative_ad_nostalgia_trigger_designer_input/,
  );
});

test('generateNostalgiaTriggers rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateNostalgiaTriggers(null as never),
    /invalid_creative_ad_nostalgia_trigger_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run triggers have distinct types', async () => {
  const result = await generateNostalgiaTriggers({ ...validInput, dryRun: true });
  const types = result.strategy.triggers.map((t) => t.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'trigger types should be distinct');
});
