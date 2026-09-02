import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Climax Architect engine (AI-powered climax
 * architecture for ad creative content).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode
 * (no real LLM calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST,
  CREATIVE_AD_CLIMAX_ARCHITECT_SYS,
  CREATIVE_AD_CLIMAX_ARCHITECT_MODEL,
  validateCreativeAdClimaxArchitectInput,
  generateClimaxArchitecture,
  VALID_PLATFORMS,
  VALID_CLIMAX_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdClimaxArchitectInput,
} from '@/lib/creative/creative-ad-climax-architect';

// ── Credit cost ──

test('CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_CLIMAX_ARCHITECT_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CLIMAX_TYPES contains the eight climax types', () => {
  assert.ok(VALID_CLIMAX_TYPES.includes('emotional_peak'));
  assert.ok(VALID_CLIMAX_TYPES.includes('action_crescendo'));
  assert.ok(VALID_CLIMAX_TYPES.includes('reveal_climax'));
  assert.ok(VALID_CLIMAX_TYPES.includes('transformation_peak'));
  assert.ok(VALID_CLIMAX_TYPES.includes('conflict_resolution'));
  assert.ok(VALID_CLIMAX_TYPES.includes('triumph_moment'));
  assert.ok(VALID_CLIMAX_TYPES.includes('catharsis_peak'));
  assert.ok(VALID_CLIMAX_TYPES.includes('wonder_moment'));
  assert.equal(VALID_CLIMAX_TYPES.length, 8);
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

test('CREATIVE_AD_CLIMAX_ARCHITECT_SYS is a non-empty prompt string', () => {
  assert.ok(typeof CREATIVE_AD_CLIMAX_ARCHITECT_SYS === 'string');
  assert.ok(CREATIVE_AD_CLIMAX_ARCHITECT_SYS.length > 100);
  assert.ok(CREATIVE_AD_CLIMAX_ARCHITECT_SYS.includes('climax'));
});

test('CREATIVE_AD_CLIMAX_ARCHITECT_MODEL is a non-empty string', () => {
  assert.ok(typeof CREATIVE_AD_CLIMAX_ARCHITECT_MODEL === 'string');
  assert.ok(CREATIVE_AD_CLIMAX_ARCHITECT_MODEL.length > 0);
});

// ── Input validation tests ──

const validInput: CreativeAdClimaxArchitectInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'women 25-40 interested in skincare and self-care',
  platform: 'tiktok',
};

test('validateCreativeAdClimaxArchitectInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdClimaxArchitectInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdClimaxArchitectInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdClimaxArchitectInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdClimaxArchitectInput rejects whitespace-only productOrBrand', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdClimaxArchitectInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdClimaxArchitectInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdClimaxArchitectInput rejects whitespace-only content', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdClimaxArchitectInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdClimaxArchitectInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdClimaxArchitectInput rejects whitespace-only targetAudience', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdClimaxArchitectInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdClimaxArchitectInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdClimaxArchitectInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdClimaxArchitectInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdClimaxArchitectInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdClimaxArchitectInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'busy professionals',
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdClimaxArchitectInput accepts dryRun boolean', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdClimaxArchitectInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdClimaxArchitectInput({
    productOrBrand: '',
    content: '',
    targetAudience: '',
    platform: 'snapchat',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.includes('platform_invalid'));
  assert.ok(errors.length >= 4);
});

// ── Dry-run mode tests ──
//
// These tests run generateClimaxArchitecture with dryRun: true so no real LLM
// calls are made — deterministic heuristic climax architecture is returned.

test('dry-run returns a ClimaxArchitectResult with architecture', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.architecture);
  assert.equal(result.dryRun, true);
});

test('dry-run returns climaxScore in 0-100 range', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  assert.ok(
    result.architecture.climaxScore >= 0 && result.architecture.climaxScore <= 100,
    `climaxScore out of range: ${result.architecture.climaxScore}`,
  );
});

test('dry-run returns a valid climax type', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  assert.ok(VALID_CLIMAX_TYPES.includes(result.architecture.structure.type as never));
});

test('dry-run returns structure with correct shape', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  const s = result.architecture.structure;
  assert.ok(typeof s.type === 'string' && s.type.length > 0);
  assert.ok(typeof s.timing === 'string' && s.timing.length > 0);
  assert.ok(typeof s.duration === 'string' && s.duration.length > 0);
  assert.ok(typeof s.intensity === 'number' && s.intensity >= 0 && s.intensity <= 100);
  assert.ok(typeof s.description === 'string' && s.description.length > 0);
});

test('dry-run returns buildup steps with correct structure', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.architecture.buildup.steps));
  assert.ok(result.architecture.buildup.steps.length > 0);
  for (const step of result.architecture.buildup.steps) {
    assert.ok(typeof step.step === 'string' && step.step.length > 0);
    assert.ok(typeof step.action === 'string' && step.action.length > 0);
    assert.ok(typeof step.tensionLevel === 'number' && step.tensionLevel >= 0 && step.tensionLevel <= 100);
  }
});

test('dry-run returns peak moment with correct structure', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  const p = result.architecture.peak;
  assert.ok(typeof p.description === 'string' && p.description.length > 0);
  assert.ok(typeof p.emotionalIntensity === 'number' && p.emotionalIntensity >= 0 && p.emotionalIntensity <= 100);
  assert.ok(typeof p.visualElement === 'string' && p.visualElement.length > 0);
  assert.ok(typeof p.audioElement === 'string' && p.audioElement.length > 0);
  assert.ok(typeof p.viewerImpact === 'string' && p.viewerImpact.length > 0);
});

test('dry-run returns resolution with correct structure', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  const r = result.architecture.resolution;
  assert.ok(typeof r.type === 'string' && r.type.length > 0);
  assert.ok(typeof r.description === 'string' && r.description.length > 0);
  assert.ok(typeof r.emotionalLanding === 'string' && r.emotionalLanding.length > 0);
  assert.ok(typeof r.callToAction === 'string' && r.callToAction.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.architecture.recommendations));
  assert.ok(result.architecture.recommendations.length > 0);
  for (const rec of result.architecture.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateClimaxArchitecture({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.architecture.buildup.steps.length > 0, `${platform} should produce buildup steps`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateClimaxArchitecture({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'busy professionals',
    dryRun: true,
  });
  assert.ok(result.architecture.buildup.steps.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run is deterministic for identical input', async () => {
  const a = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  const b = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  assert.equal(a.architecture.climaxScore, b.architecture.climaxScore);
  assert.equal(a.architecture.structure.type, b.architecture.structure.type);
  assert.equal(a.architecture.buildup.steps.length, b.architecture.buildup.steps.length);
});

test('dry-run escalation produces non-decreasing tension across steps', async () => {
  const result = await generateClimaxArchitecture({ ...validInput, dryRun: true });
  const tensions = result.architecture.buildup.steps.map((s) => s.tensionLevel);
  for (let i = 1; i < tensions.length; i++) {
    assert.ok(tensions[i] >= tensions[i - 1], `tension should not decrease at step ${i}`);
  }
});

test('generateClimaxArchitecture rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateClimaxArchitecture({ ...validInput, content: '' } as CreativeAdClimaxArchitectInput),
    /invalid_creative_ad_climax_architect_input/,
  );
});

test('generateClimaxArchitecture rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateClimaxArchitecture({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdClimaxArchitectInput),
    /invalid_creative_ad_climax_architect_input/,
  );
});

test('generateClimaxArchitecture rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateClimaxArchitecture({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdClimaxArchitectInput),
    /invalid_creative_ad_climax_architect_input/,
  );
});
