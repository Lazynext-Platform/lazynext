import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Audience Pain Point Mapper engine (AI-powered mapping of
 * audience pain points to creative angles).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_AUDIENCE_PAIN_POINT_MAPPER_CREDIT_COST,
  validateAdAudiencePainPointMapperInput,
  generatePainPointMapping,
  VALID_PLATFORMS,
  VALID_SEVERITIES,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdAudiencePainPointMapperInput,
} from '@/lib/creative/ad-audience-pain-point-mapper';

// ── Credit cost ──

test('AD_AUDIENCE_PAIN_POINT_MAPPER_CREDIT_COST is 4', () => {
  assert.equal(AD_AUDIENCE_PAIN_POINT_MAPPER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_SEVERITIES contains the four severities', () => {
  assert.ok(VALID_SEVERITIES.includes('low'));
  assert.ok(VALID_SEVERITIES.includes('medium'));
  assert.ok(VALID_SEVERITIES.includes('high'));
  assert.ok(VALID_SEVERITIES.includes('critical'));
  assert.equal(VALID_SEVERITIES.length, 4);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdAudiencePainPointMapperInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Busy professional women aged 25-40 concerned about skin aging',
  platform: 'tiktok',
};

test('validateAdAudiencePainPointMapperInput accepts a valid input', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdAudiencePainPointMapperInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdAudiencePainPointMapperInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdAudiencePainPointMapperInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdAudiencePainPointMapperInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdAudiencePainPointMapperInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdAudiencePainPointMapperInput rejects invalid platform', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdAudiencePainPointMapperInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdAudiencePainPointMapperInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Beginners looking to lose weight',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudiencePainPointMapperInput accepts empty platform string', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudiencePainPointMapperInput accepts undefined platform', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Beginners looking to lose weight',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudiencePainPointMapperInput rejects non-string platform', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdAudiencePainPointMapperInput rejects whitespace-only productOrBrand', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdAudiencePainPointMapperInput rejects whitespace-only targetAudience', () => {
  const { valid, errors } = validateAdAudiencePainPointMapperInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generatePainPointMapping with dryRun: true so no real LLM
// calls are made — deterministic heuristic pain point mapping is returned.

test('dry-run returns a PainPointMapperResult with mapping', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.mapping);
  assert.ok(Array.isArray(result.mapping.painPoints));
  assert.ok(result.mapping.painPoints.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns painPoints with correct structure', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  for (const pp of result.mapping.painPoints) {
    assert.ok(typeof pp.pain === 'string' && pp.pain.length > 0);
    assert.ok(VALID_SEVERITIES.includes(pp.severity));
    assert.ok(typeof pp.frequency === 'number' && pp.frequency >= 0 && pp.frequency <= 100);
    assert.ok(typeof pp.emotionalImpact === 'number' && pp.emotionalImpact >= 0 && pp.emotionalImpact <= 100);
    assert.ok(typeof pp.description === 'string' && pp.description.length > 0);
  }
});

test('dry-run returns creativeAngles with correct structure', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.mapping.creativeAngles));
  assert.ok(result.mapping.creativeAngles.length > 0);
  for (const ca of result.mapping.creativeAngles) {
    assert.ok(typeof ca.angle === 'string' && ca.angle.length > 0);
    assert.ok(typeof ca.addressesPain === 'string');
    assert.ok(typeof ca.effectiveness === 'number' && ca.effectiveness >= 0 && ca.effectiveness <= 100);
    assert.ok(typeof ca.approach === 'string' && ca.approach.length > 0);
  }
});

test('dry-run returns messagingRecommendations with correct structure', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.mapping.messagingRecommendations));
  assert.ok(result.mapping.messagingRecommendations.length > 0);
  for (const mr of result.mapping.messagingRecommendations) {
    assert.ok(typeof mr.pain === 'string');
    assert.ok(typeof mr.message === 'string' && mr.message.length > 0);
    assert.ok(typeof mr.tone === 'string' && mr.tone.length > 0);
    assert.ok(typeof mr.channel === 'string' && mr.channel.length > 0);
  }
});

test('dry-run returns a prioritization string', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(typeof result.mapping.prioritization === 'string');
  assert.ok(result.mapping.prioritization.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.mapping.recommendations));
  assert.ok(result.mapping.recommendations.length > 0);
  for (const rec of result.mapping.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePainPointMapping({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.mapping.painPoints.length > 0, `${platform} should produce pain points`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generatePainPointMapping({
    productOrBrand: 'A fitness app',
    targetAudience: 'Beginners looking to lose weight',
    dryRun: true,
  });
  assert.ok(result.mapping.painPoints.length > 0);
  assert.ok(result.mapping.creativeAngles.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const r1 = await generatePainPointMapping({ ...validInput, dryRun: true });
  const r2 = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.deepEqual(r1, r2);
});

test('dry-run pain points include at least one critical or high severity', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  const hasHigh = result.mapping.painPoints.some(
    (pp) => pp.severity === 'critical' || pp.severity === 'high',
  );
  assert.ok(hasHigh, 'should include at least one critical or high severity pain point');
});

test('dry-run creative angles address the generated pain points', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  const painNames = result.mapping.painPoints.map((pp) => pp.pain);
  for (const ca of result.mapping.creativeAngles) {
    assert.ok(
      painNames.includes(ca.addressesPain),
      `angle "${ca.angle}" should address a known pain point`,
    );
  }
});

test('dry-run messaging recommendations reference the generated pain points', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  const painNames = result.mapping.painPoints.map((pp) => pp.pain);
  for (const mr of result.mapping.messagingRecommendations) {
    assert.ok(
      painNames.includes(mr.pain),
      `message for "${mr.pain}" should reference a known pain point`,
    );
  }
});

test('generatePainPointMapping rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePainPointMapping({ ...validInput, productOrBrand: '' } as AdAudiencePainPointMapperInput),
    /invalid_ad_audience_pain_point_mapper_input/,
  );
});

test('generatePainPointMapping rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generatePainPointMapping({ ...validInput, targetAudience: '', dryRun: true } as AdAudiencePainPointMapperInput),
    /invalid_ad_audience_pain_point_mapper_input/,
  );
});

test('generatePainPointMapping rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generatePainPointMapping({ ...validInput, platform: 'snapchat', dryRun: true } as AdAudiencePainPointMapperInput),
    /invalid_ad_audience_pain_point_mapper_input/,
  );
});

test('dry-run returns frequency values in 0-100 range for all pain points', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  for (const pp of result.mapping.painPoints) {
    assert.ok(pp.frequency >= 0 && pp.frequency <= 100);
  }
});

test('dry-run returns emotionalImpact values in 0-100 range for all pain points', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  for (const pp of result.mapping.painPoints) {
    assert.ok(pp.emotionalImpact >= 0 && pp.emotionalImpact <= 100);
  }
});

test('dry-run returns effectiveness values in 0-100 range for all creative angles', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  for (const ca of result.mapping.creativeAngles) {
    assert.ok(ca.effectiveness >= 0 && ca.effectiveness <= 100);
  }
});

test('dry-run produces at least 3 pain points', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(result.mapping.painPoints.length >= 3);
});

test('dry-run produces at least 3 creative angles', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(result.mapping.creativeAngles.length >= 3);
});

test('dry-run produces at least 3 messaging recommendations', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(result.mapping.messagingRecommendations.length >= 3);
});

test('dry-run produces at least 3 recommendations', async () => {
  const result = await generatePainPointMapping({ ...validInput, dryRun: true });
  assert.ok(result.mapping.recommendations.length >= 3);
});
