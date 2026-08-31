import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Sentiment Journey Mapper engine (AI-powered
 * emotional/sentiment journey mapping for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_SENTIMENT_JOURNEY_MAPPER_CREDIT_COST,
  validateCreativeSentimentJourneyMapperInput,
  generateSentimentJourney,
  VALID_PLATFORMS,
  VALID_SENTIMENTS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeSentimentJourneyMapperInput,
} from '@/lib/creative/creative-sentiment-journey-mapper';

// ── Credit cost ──

test('CREATIVE_SENTIMENT_JOURNEY_MAPPER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_SENTIMENT_JOURNEY_MAPPER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_SENTIMENTS contains the eight sentiment labels', () => {
  assert.ok(VALID_SENTIMENTS.includes('positive'));
  assert.ok(VALID_SENTIMENTS.includes('negative'));
  assert.ok(VALID_SENTIMENTS.includes('neutral'));
  assert.ok(VALID_SENTIMENTS.includes('excited'));
  assert.ok(VALID_SENTIMENTS.includes('curious'));
  assert.ok(VALID_SENTIMENTS.includes('fearful'));
  assert.ok(VALID_SENTIMENTS.includes('hopeful'));
  assert.ok(VALID_SENTIMENTS.includes('surprised'));
  assert.equal(VALID_SENTIMENTS.length, 8);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeSentimentJourneyMapperInput = {
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
};

test('validateCreativeSentimentJourneyMapperInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeSentimentJourneyMapperInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeSentimentJourneyMapperInput rejects missing content', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeSentimentJourneyMapperInput rejects whitespace-only content', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeSentimentJourneyMapperInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeSentimentJourneyMapperInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeSentimentJourneyMapperInput rejects whitespace-only productOrBrand', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeSentimentJourneyMapperInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeSentimentJourneyMapperInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeSentimentJourneyMapperInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeSentimentJourneyMapperInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeSentimentJourneyMapperInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeSentimentJourneyMapperInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeSentimentJourneyMapperInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    content: validInput.content,
    productOrBrand: validInput.productOrBrand,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeSentimentJourneyMapperInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeSentimentJourneyMapperInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeSentimentJourneyMapperInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeSentimentJourneyMapperInput({
    content: '',
    productOrBrand: '',
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('platform_invalid'));
  assert.ok(errors.length >= 3);
});

// ── Dry-run mode tests ──
//
// These tests run generateSentimentJourney with dryRun: true so no real LLM
// calls are made — deterministic heuristic journey is returned.

test('dry-run returns a SentimentJourneyResult with journey', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.journey);
  assert.ok(Array.isArray(result.journey.beats));
  assert.ok(result.journey.beats.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns beats with correct structure', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  for (const beat of result.journey.beats) {
    assert.ok(typeof beat.position === 'number' && beat.position >= 0 && beat.position <= 100);
    assert.ok(VALID_SENTIMENTS.includes(beat.sentiment));
    assert.ok(typeof beat.intensity === 'number' && beat.intensity >= 0 && beat.intensity <= 100);
    assert.ok(typeof beat.description === 'string' && beat.description.length > 0);
  }
});

test('dry-run returns an emotionalArc with correct structure', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  const arc = result.journey.emotionalArc;
  assert.ok(arc);
  assert.ok(typeof arc.type === 'string' && arc.type.length > 0);
  assert.ok(typeof arc.description === 'string' && arc.description.length > 0);
  assert.ok(typeof arc.effectiveness === 'number' && arc.effectiveness >= 0 && arc.effectiveness <= 100);
});

test('dry-run returns transitions with correct structure', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.journey.transitions));
  assert.ok(result.journey.transitions.length > 0);
  for (const tr of result.journey.transitions) {
    assert.ok(typeof tr.fromBeat === 'number');
    assert.ok(typeof tr.toBeat === 'number');
    assert.ok(VALID_SENTIMENTS.includes(tr.fromSentiment));
    assert.ok(VALID_SENTIMENTS.includes(tr.toSentiment));
    assert.ok(typeof tr.transitionQuality === 'string' && tr.transitionQuality.length > 0);
  }
});

test('dry-run returns peakMoments with correct structure', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.journey.peakMoments));
  assert.ok(result.journey.peakMoments.length > 0);
  for (const peak of result.journey.peakMoments) {
    assert.ok(typeof peak.position === 'number' && peak.position >= 0 && peak.position <= 100);
    assert.ok(VALID_SENTIMENTS.includes(peak.sentiment));
    assert.ok(typeof peak.intensity === 'number' && peak.intensity >= 0 && peak.intensity <= 100);
    assert.ok(typeof peak.significance === 'string' && peak.significance.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.journey.recommendations));
  assert.ok(result.journey.recommendations.length > 0);
  for (const rec of result.journey.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run beats are ordered by position ascending', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  for (let i = 1; i < result.journey.beats.length; i++) {
    assert.ok(
      result.journey.beats[i].position >= result.journey.beats[i - 1].position,
      'beats should be ordered by position',
    );
  }
});

test('dry-run transitions reference valid beat indices', async () => {
  const result = await generateSentimentJourney({ ...validInput, dryRun: true });
  const beatCount = result.journey.beats.length;
  for (const tr of result.journey.transitions) {
    assert.ok(tr.fromBeat >= 0 && tr.fromBeat < beatCount);
    assert.ok(tr.toBeat >= 0 && tr.toBeat < beatCount);
    assert.ok(tr.toBeat === tr.fromBeat + 1, 'transitions should be between consecutive beats');
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateSentimentJourney({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.journey.beats.length > 0, `${platform} should produce beats`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateSentimentJourney({
    content: validInput.content,
    productOrBrand: validInput.productOrBrand,
    dryRun: true,
  });
  assert.ok(result.journey.beats.length > 0);
  assert.ok(result.journey.recommendations.length > 0);
});

test('dry-run produces deterministic output for same input', async () => {
  const a = await generateSentimentJourney({ ...validInput, dryRun: true });
  const b = await generateSentimentJourney({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('generateSentimentJourney rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateSentimentJourney({ ...validInput, content: '' } as CreativeSentimentJourneyMapperInput),
    /invalid_creative_sentiment_journey_mapper_input/,
  );
});

test('generateSentimentJourney rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateSentimentJourney({ ...validInput, productOrBrand: '', dryRun: true } as CreativeSentimentJourneyMapperInput),
    /invalid_creative_sentiment_journey_mapper_input/,
  );
});

test('generateSentimentJourney rejects over-length content', async () => {
  await assert.rejects(
    () =>
      generateSentimentJourney({
        ...validInput,
        content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
        dryRun: true,
      } as CreativeSentimentJourneyMapperInput),
    /invalid_creative_sentiment_journey_mapper_input/,
  );
});

test('generateSentimentJourney rejects over-length productOrBrand', async () => {
  await assert.rejects(
    () =>
      generateSentimentJourney({
        ...validInput,
        productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
        dryRun: true,
      } as CreativeSentimentJourneyMapperInput),
    /invalid_creative_sentiment_journey_mapper_input/,
  );
});
