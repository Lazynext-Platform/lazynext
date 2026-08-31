import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Sentiment Tuner engine (AI-powered sentiment tuning for ad
 * content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_SENTIMENT_TUNER_CREDIT_COST,
  validateAdSentimentTunerInput,
  tuneSentiment,
  VALID_PLATFORMS,
  VALID_SENTIMENTS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdSentimentTunerInput,
} from '@/lib/creative/ad-sentiment-tuner';

// ── Credit cost ──

test('AD_SENTIMENT_TUNER_CREDIT_COST is 3', () => {
  assert.equal(AD_SENTIMENT_TUNER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_SENTIMENTS contains the six target sentiments', () => {
  assert.ok(VALID_SENTIMENTS.includes('positive'));
  assert.ok(VALID_SENTIMENTS.includes('neutral'));
  assert.ok(VALID_SENTIMENTS.includes('urgent'));
  assert.ok(VALID_SENTIMENTS.includes('playful'));
  assert.ok(VALID_SENTIMENTS.includes('authoritative'));
  assert.ok(VALID_SENTIMENTS.includes('empathetic'));
  assert.equal(VALID_SENTIMENTS.length, 6);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdSentimentTunerInput = {
  content: 'Our new product helps you save time and get more done.',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetSentiment: 'positive',
};

test('validateAdSentimentTunerInput accepts a valid input', () => {
  const { valid, errors } = validateAdSentimentTunerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdSentimentTunerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdSentimentTunerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdSentimentTunerInput rejects missing content', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdSentimentTunerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdSentimentTunerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdSentimentTunerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdSentimentTunerInput rejects missing targetSentiment', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    targetSentiment: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_sentiment_required'));
});

test('validateAdSentimentTunerInput rejects invalid targetSentiment', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    targetSentiment: 'angry' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_sentiment_invalid'));
});

test('validateAdSentimentTunerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdSentimentTunerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdSentimentTunerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdSentimentTunerInput({
    content: 'Buy our product now.',
    productOrBrand: 'A fitness app',
    targetSentiment: 'urgent',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run tuneSentiment with dryRun: true so no real LLM calls
// are made — deterministic heuristic tuning is returned instead.

test('dry-run returns a SentimentTunerResult with tuning', async () => {
  const result = await tuneSentiment({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.tuning);
  assert.equal(result.dryRun, true);
});

test('dry-run returns tuning with correct structure', async () => {
  const result = await tuneSentiment({ ...validInput, dryRun: true });
  const tuning = result.tuning;
  assert.ok(typeof tuning.tunedContent === 'string' && tuning.tunedContent.length > 0);
  assert.ok(typeof tuning.beforeSentiment.score === 'number');
  assert.ok(typeof tuning.beforeSentiment.label === 'string');
  assert.ok(typeof tuning.afterSentiment.score === 'number');
  assert.ok(typeof tuning.afterSentiment.label === 'string');
  assert.ok(typeof tuning.sentimentShift === 'number');
  assert.ok(Array.isArray(tuning.toneAdjustments));
  assert.ok(Array.isArray(tuning.wordChanges));
  assert.ok(typeof tuning.audienceAlignment === 'number');
  assert.ok(tuning.audienceAlignment >= 1 && tuning.audienceAlignment <= 10);
  assert.ok(Array.isArray(tuning.recommendations));
});

test('dry-run returns wordChanges with correct structure', async () => {
  const result = await tuneSentiment({ ...validInput, dryRun: true });
  for (const wc of result.tuning.wordChanges) {
    assert.ok(typeof wc.original === 'string');
    assert.ok(typeof wc.replacement === 'string');
    assert.ok(typeof wc.reason === 'string');
  }
});

test('dry-run works for all six target sentiments', async () => {
  for (const sentiment of VALID_SENTIMENTS) {
    const result = await tuneSentiment({
      ...validInput,
      targetSentiment: sentiment,
      dryRun: true,
    });
    assert.ok(result.tuning.tunedContent.length > 0, `${sentiment} should produce tuned content`);
  }
});

test('dry-run works with optional platform', async () => {
  const result = await tuneSentiment({
    ...validInput,
    platform: 'instagram',
    dryRun: true,
  });
  assert.ok(result.tuning.tunedContent.length > 0);
});

test('tuneSentiment rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => tuneSentiment({ ...validInput, content: '' } as AdSentimentTunerInput),
    /invalid_ad_sentiment_tuner_input/,
  );
});

test('tuneSentiment rejects invalid targetSentiment in dry-run mode', async () => {
  await assert.rejects(
    () => tuneSentiment({ ...validInput, targetSentiment: 'angry' as never, dryRun: true } as AdSentimentTunerInput),
    /invalid_ad_sentiment_tuner_input/,
  );
});

test('tuneSentiment rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => tuneSentiment({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdSentimentTunerInput),
    /invalid_ad_sentiment_tuner_input/,
  );
});
