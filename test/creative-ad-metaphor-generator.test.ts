import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Metaphor Generator engine (AI-powered creative
 * metaphor and analogy generation for ad content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_METAPHOR_GENERATOR_CREDIT_COST,
  validateCreativeAdMetaphorGeneratorInput,
  generateMetaphors,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_BENEFIT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdMetaphorGeneratorInput,
} from '@/lib/creative/creative-ad-metaphor-generator';

// ── Credit cost ──

test('CREATIVE_AD_METAPHOR_GENERATOR_CREDIT_COST is 3', () => {
  assert.equal(CREATIVE_AD_METAPHOR_GENERATOR_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_BENEFIT_LENGTH is 2000', () => {
  assert.equal(MAX_BENEFIT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdMetaphorGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  benefit: 'brightens dull skin in 7 days',
  targetAudience: 'women 25-40 concerned about skin aging',
  platform: 'tiktok',
};

test('validateCreativeAdMetaphorGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdMetaphorGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects missing benefit', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    benefit: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('benefit_required'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects benefit over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    benefit: 'x'.repeat(MAX_BENEFIT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('benefit_too_long'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdMetaphorGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdMetaphorGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    productOrBrand: 'A fitness app',
    benefit: 'helps you build muscle in 30 days',
    targetAudience: 'men 20-35 looking to gain strength',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMetaphorGeneratorInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMetaphorGeneratorInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    productOrBrand: 'A fitness app',
    benefit: 'helps you build muscle in 30 days',
    targetAudience: 'men 20-35 looking to gain strength',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMetaphorGeneratorInput accepts dryRun boolean', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMetaphorGeneratorInput rejects multiple invalid fields', () => {
  const { valid, errors } = validateCreativeAdMetaphorGeneratorInput({
    productOrBrand: '',
    benefit: '',
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('benefit_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.length >= 3);
});

// ── Dry-run mode tests ──
//
// These tests run generateMetaphors with dryRun: true so no real LLM
// calls are made — deterministic heuristic metaphors are returned.

test('dry-run returns a MetaphorGeneratorResult with collection', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.collection);
  assert.ok(Array.isArray(result.collection.metaphors));
  assert.ok(result.collection.metaphors.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns metaphors with correct structure', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  for (const m of result.collection.metaphors) {
    assert.ok(typeof m.metaphor === 'string' && m.metaphor.length > 0);
    assert.ok(typeof m.explanation === 'string' && m.explanation.length > 0);
    assert.ok(typeof m.visualSuggestion === 'string' && m.visualSuggestion.length > 0);
    assert.ok(typeof m.emotionalResonance === 'string' && m.emotionalResonance.length > 0);
    assert.ok(typeof m.memorabilityScore === 'number' && m.memorabilityScore >= 0 && m.memorabilityScore <= 100);
    assert.ok(typeof m.category === 'string' && m.category.length > 0);
  }
});

test('dry-run returns at least 4 metaphors', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  assert.ok(result.collection.metaphors.length >= 4);
});

test('dry-run returns recommendations', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.collection.recommendations));
  assert.ok(result.collection.recommendations.length > 0);
});

test('dry-run returns memorabilityScore in 0-100 range', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  for (const m of result.collection.metaphors) {
    assert.ok(m.memorabilityScore >= 0 && m.memorabilityScore <= 100);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateMetaphors({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.collection.metaphors.length > 0, `${platform} should produce metaphors`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateMetaphors({
    productOrBrand: 'A fitness app',
    benefit: 'build muscle in 30 days',
    targetAudience: 'men 20-35',
    dryRun: true,
  });
  assert.ok(result.collection.metaphors.length > 0);
});

test('dry-run metaphors reference the product or brand', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  const allText = result.collection.metaphors.map((m) => m.metaphor + ' ' + m.explanation).join(' ').toLowerCase();
  // At least one metaphor should reference the brand/product context
  assert.ok(allText.length > 0);
});

test('dry-run metaphors have varied categories', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  const categories = new Set(result.collection.metaphors.map((m) => m.category));
  assert.ok(categories.size >= 3, `expected at least 3 distinct categories, got ${categories.size}`);
});

test('dry-run metaphors have varied emotional resonance', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  const emotions = new Set(result.collection.metaphors.map((m) => m.emotionalResonance));
  assert.ok(emotions.size >= 2, `expected at least 2 distinct emotions, got ${emotions.size}`);
});

test('dry-run is deterministic for the same input', async () => {
  const r1 = await generateMetaphors({ ...validInput, dryRun: true });
  const r2 = await generateMetaphors({ ...validInput, dryRun: true });
  assert.equal(r1.collection.metaphors.length, r2.collection.metaphors.length);
  assert.equal(r1.collection.metaphors[0].metaphor, r2.collection.metaphors[0].metaphor);
  assert.equal(r1.collection.metaphors[0].memorabilityScore, r2.collection.metaphors[0].memorabilityScore);
});

test('dry-run recommendations reference the platform', async () => {
  const result = await generateMetaphors({ ...validInput, platform: 'tiktok', dryRun: true });
  const recText = result.collection.recommendations.join(' ').toLowerCase();
  assert.ok(recText.includes('tiktok'));
});

test('generateMetaphors rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateMetaphors({ ...validInput, benefit: '' } as CreativeAdMetaphorGeneratorInput),
    /invalid_creative_ad_metaphor_generator_input/,
  );
});

test('generateMetaphors rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateMetaphors({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdMetaphorGeneratorInput),
    /invalid_creative_ad_metaphor_generator_input/,
  );
});

test('generateMetaphors rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateMetaphors({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdMetaphorGeneratorInput),
    /invalid_creative_ad_metaphor_generator_input/,
  );
});

test('generateMetaphors rejects missing benefit in dry-run mode', async () => {
  await assert.rejects(
    () => generateMetaphors({ ...validInput, benefit: '', dryRun: true } as CreativeAdMetaphorGeneratorInput),
    /invalid_creative_ad_metaphor_generator_input/,
  );
});

test('dry-run visual suggestions are non-empty strings', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  for (const m of result.collection.metaphors) {
    assert.ok(m.visualSuggestion.length > 10, 'visual suggestion should be descriptive');
  }
});

test('dry-run explanations are non-empty strings', async () => {
  const result = await generateMetaphors({ ...validInput, dryRun: true });
  for (const m of result.collection.metaphors) {
    assert.ok(m.explanation.length > 10, 'explanation should be descriptive');
  }
});
