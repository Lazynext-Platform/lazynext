import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Audience Resonance Predictor engine (AI-powered
 * prediction of how well ad content resonates with audience segments).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST,
  validateAdAudienceResonancePredictorInput,
  generateAudienceResonance,
  VALID_PLATFORMS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdAudienceResonancePredictorInput,
} from '@/lib/creative/ad-audience-resonance-predictor';

// ── Credit cost ──

test('AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST is 4', () => {
  assert.equal(AD_AUDIENCE_RESONANCE_PREDICTOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdAudienceResonancePredictorInput = {
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  audienceSegments: 'Gen Z, busy parents, fitness enthusiasts',
  platform: 'tiktok',
};

test('validateAdAudienceResonancePredictorInput accepts a valid input', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdAudienceResonancePredictorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdAudienceResonancePredictorInput rejects missing content', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdAudienceResonancePredictorInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdAudienceResonancePredictorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdAudienceResonancePredictorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdAudienceResonancePredictorInput rejects missing audienceSegments', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    audienceSegments: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('audience_segments_required'));
});

test('validateAdAudienceResonancePredictorInput rejects audienceSegments over 2000 chars', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    audienceSegments: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('audience_segments_too_long'));
});

test('validateAdAudienceResonancePredictorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdAudienceResonancePredictorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdAudienceResonancePredictorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
    audienceSegments: 'gym-goers, beginners',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudienceResonancePredictorInput accepts empty platform string', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudienceResonancePredictorInput accepts newline-separated segments', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    audienceSegments: 'Gen Z\nbusy parents\nfitness enthusiasts',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudienceResonancePredictorInput accepts semicolon-separated segments', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    audienceSegments: 'Gen Z; busy parents; fitness enthusiasts',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdAudienceResonancePredictorInput rejects whitespace-only audienceSegments', () => {
  const { valid, errors } = validateAdAudienceResonancePredictorInput({
    ...validInput,
    audienceSegments: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('audience_segments_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateAudienceResonance with dryRun: true so no real LLM
// calls are made — deterministic heuristic resonance scores are returned.

test('dry-run returns an AudienceResonanceResult with resonance', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.resonance);
  assert.ok(Array.isArray(result.resonance.segmentScores));
  assert.ok(result.resonance.segmentScores.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns segmentScores with correct structure', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  for (const s of result.resonance.segmentScores) {
    assert.ok(typeof s.segment === 'string' && s.segment.length > 0);
    assert.ok(typeof s.score === 'number' && s.score >= 0 && s.score <= 100);
    assert.ok(typeof s.fit === 'string' && s.fit.length > 0);
    assert.ok(typeof s.notes === 'string' && s.notes.length > 0);
  }
});

test('dry-run returns one segmentScore per input segment', async () => {
  const segments = 'Gen Z, busy parents, fitness enthusiasts';
  const result = await generateAudienceResonance({ ...validInput, audienceSegments: segments, dryRun: true });
  assert.equal(result.resonance.segmentScores.length, 3);
});

test('dry-run returns emotionalTriggers with correct structure', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.resonance.emotionalTriggers));
  assert.ok(result.resonance.emotionalTriggers.length > 0);
  for (const tr of result.resonance.emotionalTriggers) {
    assert.ok(typeof tr.trigger === 'string' && tr.trigger.length > 0);
    assert.ok(typeof tr.effectiveness === 'number' && tr.effectiveness >= 0 && tr.effectiveness <= 100);
    assert.ok(Array.isArray(tr.segments));
  }
});

test('dry-run returns resonanceFactors with correct structure', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.resonance.resonanceFactors));
  assert.ok(result.resonance.resonanceFactors.length > 0);
  for (const f of result.resonance.resonanceFactors) {
    assert.ok(typeof f.factor === 'string' && f.factor.length > 0);
    assert.ok(typeof f.impact === 'number' && f.impact >= 0 && f.impact <= 100);
    assert.ok(typeof f.description === 'string' && f.description.length > 0);
  }
});

test('dry-run returns audienceFit as a non-empty string', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  assert.ok(typeof result.resonance.audienceFit === 'string');
  assert.ok(result.resonance.audienceFit.length > 0);
});

test('dry-run returns recommendations as a non-empty array', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.resonance.recommendations));
  assert.ok(result.resonance.recommendations.length > 0);
  for (const rec of result.resonance.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateAudienceResonance({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.resonance.segmentScores.length > 0, `${platform} should produce segmentScores`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateAudienceResonance({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.resonance.segmentScores.length > 0);
});

test('dry-run handles single segment input', async () => {
  const result = await generateAudienceResonance({
    ...validInput,
    audienceSegments: 'Gen Z',
    dryRun: true,
  });
  assert.equal(result.resonance.segmentScores.length, 1);
  assert.equal(result.resonance.segmentScores[0].segment, 'Gen Z');
});

test('dry-run handles newline-separated segments', async () => {
  const result = await generateAudienceResonance({
    ...validInput,
    audienceSegments: 'Gen Z\nbusy parents\nfitness enthusiasts',
    dryRun: true,
  });
  assert.equal(result.resonance.segmentScores.length, 3);
});

test('dry-run handles semicolon-separated segments', async () => {
  const result = await generateAudienceResonance({
    ...validInput,
    audienceSegments: 'Gen Z; busy parents; fitness enthusiasts',
    dryRun: true,
  });
  assert.equal(result.resonance.segmentScores.length, 3);
});

test('dry-run segment scores are deterministic for same input', async () => {
  const r1 = await generateAudienceResonance({ ...validInput, dryRun: true });
  const r2 = await generateAudienceResonance({ ...validInput, dryRun: true });
  assert.deepEqual(
    r1.resonance.segmentScores.map((s) => s.score),
    r2.resonance.segmentScores.map((s) => s.score),
  );
});

test('dry-run resonance factors include the six standard factors', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  const factors = result.resonance.resonanceFactors.map((f) => f.factor);
  assert.ok(factors.includes('relevance'));
  assert.ok(factors.includes('emotional_connection'));
  assert.ok(factors.includes('language_tone'));
  assert.ok(factors.includes('value_proposition'));
  assert.ok(factors.includes('cultural_fit'));
  assert.ok(factors.includes('platform_alignment'));
});

test('dry-run audienceFit mentions the strongest and weakest segments', async () => {
  const result = await generateAudienceResonance({ ...validInput, dryRun: true });
  const sorted = [...result.resonance.segmentScores].sort((a, b) => b.score - a.score);
  assert.ok(result.resonance.audienceFit.includes(sorted[0].segment));
  assert.ok(result.resonance.audienceFit.includes(sorted[sorted.length - 1].segment));
});

test('generateAudienceResonance rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAudienceResonance({ ...validInput, content: '' } as AdAudienceResonancePredictorInput),
    /invalid_ad_audience_resonance_predictor_input/,
  );
});

test('generateAudienceResonance rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateAudienceResonance({ ...validInput, productOrBrand: '', dryRun: true } as AdAudienceResonancePredictorInput),
    /invalid_ad_audience_resonance_predictor_input/,
  );
});

test('generateAudienceResonance rejects missing audienceSegments in dry-run mode', async () => {
  await assert.rejects(
    () => generateAudienceResonance({ ...validInput, audienceSegments: '', dryRun: true } as AdAudienceResonancePredictorInput),
    /invalid_ad_audience_resonance_predictor_input/,
  );
});
