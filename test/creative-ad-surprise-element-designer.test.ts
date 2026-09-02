import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Surprise Element Designer engine (AI-powered
 * surprise element design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_SURPRISE_ELEMENT_DESIGNER_CREDIT_COST,
  validateCreativeAdSurpriseElementDesignerInput,
  generateSurpriseElements,
  VALID_PLATFORMS,
  VALID_SURPRISE_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdSurpriseElementDesignerInput,
} from '@/lib/creative/creative-ad-surprise-element-designer';

// ── Credit cost ──

test('CREATIVE_AD_SURPRISE_ELEMENT_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_SURPRISE_ELEMENT_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_SURPRISE_TYPES contains the eight surprise types', () => {
  assert.ok(VALID_SURPRISE_TYPES.includes('unexpected_twist'));
  assert.ok(VALID_SURPRISE_TYPES.includes('hidden_detail'));
  assert.ok(VALID_SURPRISE_TYPES.includes('sudden_reveal'));
  assert.ok(VALID_SURPRISE_TYPES.includes('role_reversal'));
  assert.ok(VALID_SURPRISE_TYPES.includes('genre_shift'));
  assert.ok(VALID_SURPRISE_TYPES.includes('breaking_fourth_wall'));
  assert.ok(VALID_SURPRISE_TYPES.includes('unexpected_character'));
  assert.ok(VALID_SURPRISE_TYPES.includes('surprise_collaboration'));
  assert.equal(VALID_SURPRISE_TYPES.length, 8);
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

const validInput: CreativeAdSurpriseElementDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Gen Z skincare enthusiasts aged 18-24',
  platform: 'tiktok',
};

test('validateCreativeAdSurpriseElementDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdSurpriseElementDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdSurpriseElementDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdSurpriseElementDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals aged 25-40',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdSurpriseElementDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdSurpriseElementDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdSurpriseElementDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals aged 25-40',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateSurpriseElements with dryRun: true so no real LLM
// calls are made — deterministic heuristic surprise elements are returned.

test('dry-run returns a SurpriseElementDesignerResult with strategy', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.elements));
  assert.ok(result.strategy.elements.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns elements with correct structure', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  for (const el of result.strategy.elements) {
    assert.ok(typeof el.type === 'string' && el.type.length > 0);
    assert.ok(typeof el.setup === 'string' && el.setup.length > 0);
    assert.ok(typeof el.reveal === 'string' && el.reveal.length > 0);
    assert.ok(typeof el.delightScore === 'number' && el.delightScore >= 0 && el.delightScore <= 100);
    assert.ok(typeof el.executionGuide === 'string' && el.executionGuide.length > 0);
    assert.ok(typeof el.viewerReaction === 'string' && el.viewerReaction.length > 0);
    assert.ok(typeof el.timing === 'string' && el.timing.length > 0);
  }
});

test('dry-run returns delightScore in 0-100 range', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  for (const el of result.strategy.elements) {
    assert.ok(el.delightScore >= 0 && el.delightScore <= 100, `score ${el.delightScore} out of range`);
  }
});

test('dry-run returns elements with valid surprise types', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  for (const el of result.strategy.elements) {
    assert.ok(
      VALID_SURPRISE_TYPES.includes(el.type as never),
      `type "${el.type}" is not a valid surprise type`,
    );
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateSurpriseElements({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.elements.length > 0, `${platform} should produce elements`);
  }
});

test('dry-run produces multiple surprise elements', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  assert.ok(result.strategy.elements.length >= 3, `expected at least 3 elements, got ${result.strategy.elements.length}`);
});

test('dry-run produces elements covering multiple surprise types', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  const types = new Set(result.strategy.elements.map((e) => e.type));
  assert.ok(types.size >= 3, `expected at least 3 distinct surprise types, got ${types.size}`);
});

test('dry-run includes an unexpected_twist element', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  assert.ok(result.strategy.elements.some((e) => e.type === 'unexpected_twist'));
});

test('dry-run includes a sudden_reveal element', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  assert.ok(result.strategy.elements.some((e) => e.type === 'sudden_reveal'));
});

test('dry-run includes a breaking_fourth_wall element', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  assert.ok(result.strategy.elements.some((e) => e.type === 'breaking_fourth_wall'));
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateSurpriseElements({ ...validInput, dryRun: true });
  const b = await generateSurpriseElements({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run produces different output for different content', async () => {
  const a = await generateSurpriseElements({ ...validInput, dryRun: true });
  const b = await generateSurpriseElements({
    ...validInput,
    content: 'Short ad.',
    dryRun: true,
  });
  assert.notDeepEqual(a.strategy.elements, b.strategy.elements);
});

test('dry-run recommendations reference the platform when provided', async () => {
  const result = await generateSurpriseElements({ ...validInput, platform: 'tiktok', dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.includes('tiktok'), 'recommendations should reference the platform');
});

test('dry-run elements reference the brand', async () => {
  const result = await generateSurpriseElements({ ...validInput, dryRun: true });
  const joined = result.strategy.elements.map((e) => `${e.setup} ${e.reveal} ${e.executionGuide}`).join(' ');
  assert.ok(joined.length > 0);
});

test('dry-run works without a platform', async () => {
  const result = await generateSurpriseElements({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals',
    dryRun: true,
  });
  assert.ok(result.strategy.elements.length > 0);
  assert.equal(result.dryRun, true);
});

test('generateSurpriseElements rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateSurpriseElements({ ...validInput, content: '' } as CreativeAdSurpriseElementDesignerInput),
    /invalid_creative_ad_surprise_element_designer_input/,
  );
});

test('generateSurpriseElements rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateSurpriseElements({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdSurpriseElementDesignerInput),
    /invalid_creative_ad_surprise_element_designer_input/,
  );
});

test('generateSurpriseElements rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateSurpriseElements({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdSurpriseElementDesignerInput),
    /invalid_creative_ad_surprise_element_designer_input/,
  );
});
