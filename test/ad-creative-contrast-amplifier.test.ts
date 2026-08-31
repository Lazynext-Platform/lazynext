import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Contrast Amplifier engine (AI-powered contrast
 * amplification in ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST,
  validateAdCreativeContrastAmplifierInput,
  generateContrastAmplification,
  VALID_PLATFORMS,
  VALID_CONTRAST_TYPES,
  VALID_IMPACTS,
  DEFAULT_CONTRAST_TYPE,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeContrastAmplifierInput,
} from '@/lib/creative/ad-creative-contrast-amplifier';

// ── Credit cost ──

test('AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_CONTRAST_AMPLIFIER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CONTRAST_TYPES contains the six contrast types', () => {
  assert.ok(VALID_CONTRAST_TYPES.includes('before_after'));
  assert.ok(VALID_CONTRAST_TYPES.includes('problem_solution'));
  assert.ok(VALID_CONTRAST_TYPES.includes('with_without'));
  assert.ok(VALID_CONTRAST_TYPES.includes('expectation_reality'));
  assert.ok(VALID_CONTRAST_TYPES.includes('then_now'));
  assert.ok(VALID_CONTRAST_TYPES.includes('ordinary_extraordinary'));
  assert.equal(VALID_CONTRAST_TYPES.length, 6);
});

test('VALID_IMPACTS contains the three impact levels', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
});

test('DEFAULT_CONTRAST_TYPE is before_after', () => {
  assert.equal(DEFAULT_CONTRAST_TYPE, 'before_after');
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeContrastAmplifierInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  contrastType: 'before_after',
  platform: 'tiktok',
};

test('validateAdCreativeContrastAmplifierInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeContrastAmplifierInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeContrastAmplifierInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeContrastAmplifierInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeContrastAmplifierInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeContrastAmplifierInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeContrastAmplifierInput rejects invalid contrastType', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    contrastType: 'up_down' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('contrast_type_invalid'));
});

test('validateAdCreativeContrastAmplifierInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeContrastAmplifierInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeContrastAmplifierInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeContrastAmplifierInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeContrastAmplifierInput accepts empty contrastType string', () => {
  const { valid, errors } = validateAdCreativeContrastAmplifierInput({
    ...validInput,
    contrastType: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateContrastAmplification with dryRun: true so no real
// LLM calls are made — deterministic heuristic contrast amplification is
// returned.

test('dry-run returns a ContrastAmplifierResult with analysis', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.analysis);
  assert.ok(typeof result.analysis.amplifiedContent === 'string');
  assert.ok(typeof result.analysis.contrastScore === 'number');
  assert.ok(Array.isArray(result.analysis.elements));
  assert.ok(result.analysis.elements.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns contrastScore in 0-100 range', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.ok(result.analysis.contrastScore >= 0 && result.analysis.contrastScore <= 100);
});

test('dry-run returns amplifiedContent as a non-empty string', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.ok(result.analysis.amplifiedContent.length > 0);
});

test('dry-run returns elements with correct structure', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  for (const el of result.analysis.elements) {
    assert.ok(typeof el.type === 'string' && el.type.length > 0);
    assert.ok(typeof el.before === 'string');
    assert.ok(typeof el.after === 'string');
    assert.ok(VALID_IMPACTS.includes(el.impact));
    assert.ok(typeof el.description === 'string' && el.description.length > 0);
  }
});

test('dry-run returns pairs with correct structure', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.pairs));
  assert.ok(result.analysis.pairs.length > 0);
  for (const pair of result.analysis.pairs) {
    assert.ok(typeof pair.left === 'string' && pair.left.length > 0);
    assert.ok(typeof pair.right === 'string' && pair.right.length > 0);
    assert.ok(typeof pair.contrastType === 'string' && pair.contrastType.length > 0);
    assert.ok(typeof pair.emotionalImpact === 'string' && pair.emotionalImpact.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.recommendations));
  assert.ok(result.analysis.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateContrastAmplification({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.analysis.elements.length > 0, `${platform} should produce elements`);
  }
});

test('dry-run works for all contrast types', async () => {
  for (const ct of VALID_CONTRAST_TYPES) {
    const result = await generateContrastAmplification({
      ...validInput,
      contrastType: ct,
      dryRun: true,
    });
    assert.ok(result.analysis.elements.length > 0, `${ct} should produce elements`);
  }
});

test('dry-run defaults contrastType to before_after when not specified', async () => {
  const result = await generateContrastAmplification({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    dryRun: true,
  });
  assert.ok(result.analysis.elements[0].type === 'before_after');
});

test('dry-run amplifiedContent references the brand', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  const brand = validInput.productOrBrand.toLowerCase().slice(0, 20).replace(/[^a-z0-9]/g, '');
  assert.ok(
    result.analysis.amplifiedContent.toLowerCase().includes(brand),
    'amplifiedContent should reference the brand slug',
  );
});

test('dry-run elements impact is a valid value', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  for (const el of result.analysis.elements) {
    assert.ok(VALID_IMPACTS.includes(el.impact), `${el.impact} should be valid`);
  }
});

test('dry-run pairs reference the contrast type', async () => {
  const result = await generateContrastAmplification({
    ...validInput,
    contrastType: 'problem_solution',
    dryRun: true,
  });
  for (const pair of result.analysis.pairs) {
    assert.ok(pair.contrastType === 'problem_solution');
  }
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateContrastAmplification({ ...validInput, dryRun: true });
  const b = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.equal(a.analysis.contrastScore, b.analysis.contrastScore);
  assert.equal(a.analysis.amplifiedContent, b.analysis.amplifiedContent);
});

test('generateContrastAmplification rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateContrastAmplification({ ...validInput, content: '' } as AdCreativeContrastAmplifierInput),
    /invalid_ad_creative_contrast_amplifier_input/,
  );
});

test('generateContrastAmplification rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateContrastAmplification({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeContrastAmplifierInput),
    /invalid_ad_creative_contrast_amplifier_input/,
  );
});

test('generateContrastAmplification rejects invalid contrastType in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateContrastAmplification({
        ...validInput,
        contrastType: 'invalid_type',
        dryRun: true,
      } as AdCreativeContrastAmplifierInput),
    /invalid_ad_creative_contrast_amplifier_input/,
  );
});

test('generateContrastAmplification rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateContrastAmplification({
        ...validInput,
        platform: 'myspace',
        dryRun: true,
      } as AdCreativeContrastAmplifierInput),
    /invalid_ad_creative_contrast_amplifier_input/,
  );
});

test('dry-run recommendations are non-empty strings', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  for (const rec of result.analysis.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run returns at least 2 elements', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.ok(result.analysis.elements.length >= 2);
});

test('dry-run returns at least 2 pairs', async () => {
  const result = await generateContrastAmplification({ ...validInput, dryRun: true });
  assert.ok(result.analysis.pairs.length >= 2);
});
