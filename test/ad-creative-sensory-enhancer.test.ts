import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Sensory Enhancer engine (AI-powered sensory
 * language enhancement for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_SENSORY_ENHANCER_CREDIT_COST,
  validateAdCreativeSensoryEnhancerInput,
  generateSensoryEnhancement,
  VALID_PLATFORMS,
  VALID_SENSES,
  VALID_IMPACTS,
  DEFAULT_SENSE,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdCreativeSensoryEnhancerInput,
} from '@/lib/creative/ad-creative-sensory-enhancer';

// ── Credit cost ──

test('AD_CREATIVE_SENSORY_ENHANCER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_SENSORY_ENHANCER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_SENSES contains the five senses', () => {
  assert.ok(VALID_SENSES.includes('visual'));
  assert.ok(VALID_SENSES.includes('auditory'));
  assert.ok(VALID_SENSES.includes('tactile'));
  assert.ok(VALID_SENSES.includes('olfactory'));
  assert.ok(VALID_SENSES.includes('gustatory'));
  assert.equal(VALID_SENSES.length, 5);
});

test('VALID_IMPACTS contains the three impacts', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
});

test('DEFAULT_SENSE is visual', () => {
  assert.equal(DEFAULT_SENSE, 'visual');
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeSensoryEnhancerInput = {
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetSense: 'visual',
  platform: 'tiktok',
};

test('validateAdCreativeSensoryEnhancerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeSensoryEnhancerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeSensoryEnhancerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeSensoryEnhancerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeSensoryEnhancerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeSensoryEnhancerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeSensoryEnhancerInput rejects invalid targetSense', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    targetSense: 'sixth-sense' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_sense_invalid'));
});

test('validateAdCreativeSensoryEnhancerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeSensoryEnhancerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeSensoryEnhancerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSensoryEnhancerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSensoryEnhancerInput accepts empty targetSense string', () => {
  const { valid, errors } = validateAdCreativeSensoryEnhancerInput({
    ...validInput,
    targetSense: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateSensoryEnhancement with dryRun: true so no real LLM
// calls are made — deterministic heuristic sensory enhancements are returned.

test('dry-run returns a SensoryEnhancerResult with analysis', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.analysis);
  assert.ok(typeof result.analysis.enhancedContent === 'string');
  assert.ok(result.analysis.enhancedContent.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns sensoryScore in 0-100 range', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  assert.ok(result.analysis.sensoryScore >= 0 && result.analysis.sensoryScore <= 100);
});

test('dry-run returns additions with correct structure', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.additions));
  assert.ok(result.analysis.additions.length > 0);
  for (const add of result.analysis.additions) {
    assert.ok(typeof add.sense === 'string' && add.sense.length > 0);
    assert.ok(typeof add.text === 'string' && add.text.length > 0);
    assert.ok(typeof add.position === 'string' && add.position.length > 0);
    assert.ok(VALID_IMPACTS.includes(add.impact));
  }
});

test('dry-run returns enhancements with correct structure', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.enhancements));
  assert.ok(result.analysis.enhancements.length > 0);
  for (const enh of result.analysis.enhancements) {
    assert.ok(typeof enh.sense === 'string' && enh.sense.length > 0);
    assert.ok(typeof enh.before === 'string');
    assert.ok(typeof enh.after === 'string');
    assert.ok(typeof enh.improvement === 'string' && enh.improvement.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.recommendations));
  assert.ok(result.analysis.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateSensoryEnhancement({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.analysis.additions.length > 0, `${platform} should produce additions`);
  }
});

test('dry-run works for all five senses', async () => {
  for (const sense of VALID_SENSES) {
    const result = await generateSensoryEnhancement({
      ...validInput,
      targetSense: sense,
      dryRun: true,
    });
    assert.ok(result.analysis.additions.length > 0, `${sense} should produce additions`);
    assert.ok(result.analysis.enhancedContent.length > 0, `${sense} should produce enhanced content`);
  }
});

test('dry-run enhanced content includes the original content', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  assert.ok(result.analysis.enhancedContent.includes(validInput.content.trim()));
});

test('dry-run additions reference the target sense', async () => {
  const result = await generateSensoryEnhancement({
    ...validInput,
    targetSense: 'auditory',
    dryRun: true,
  });
  for (const add of result.analysis.additions) {
    assert.equal(add.sense, 'auditory');
  }
});

test('dry-run sensoryScore is deterministic for same input', async () => {
  const r1 = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  const r2 = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  assert.equal(r1.analysis.sensoryScore, r2.analysis.sensoryScore);
});

test('generateSensoryEnhancement rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateSensoryEnhancement({ ...validInput, content: '' } as AdCreativeSensoryEnhancerInput),
    /invalid_ad_creative_sensory_enhancer_input/,
  );
});

test('generateSensoryEnhancement rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateSensoryEnhancement({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeSensoryEnhancerInput),
    /invalid_ad_creative_sensory_enhancer_input/,
  );
});

test('generateSensoryEnhancement rejects invalid targetSense in dry-run mode', async () => {
  await assert.rejects(
    () => generateSensoryEnhancement({ ...validInput, targetSense: 'unknown' as never, dryRun: true }),
    /invalid_ad_creative_sensory_enhancer_input/,
  );
});

test('dry-run recommendations mention the target sense', async () => {
  const result = await generateSensoryEnhancement({
    ...validInput,
    targetSense: 'gustatory',
    dryRun: true,
  });
  const joined = result.analysis.recommendations.join(' ').toLowerCase();
  assert.ok(joined.includes('gustatory'));
});

test('dry-run enhanced content is non-empty for short content', async () => {
  const result = await generateSensoryEnhancement({
    ...validInput,
    content: 'Buy now.',
    dryRun: true,
  });
  assert.ok(result.analysis.enhancedContent.length > 0);
});

test('dry-run enhancements include before and after text', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  for (const enh of result.analysis.enhancements) {
    assert.ok(enh.before.length >= 0);
    assert.ok(enh.after.length > 0);
  }
});

test('dry-run additions include position labels', async () => {
  const result = await generateSensoryEnhancement({ ...validInput, dryRun: true });
  const positions = result.analysis.additions.map((a) => a.position);
  assert.ok(positions.includes('opening'));
  assert.ok(positions.includes('middle'));
  assert.ok(positions.includes('cta'));
});
