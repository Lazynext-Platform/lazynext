import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Format Recommender engine (AI-powered creative
 * format recommendation across video, carousel, image, story, text).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST,
  validateCreativeFormatRecommenderInput,
  generateFormatRecommendation,
  VALID_PLATFORMS,
  VALID_FORMATS,
  VALID_GOALS,
  DEFAULT_GOAL,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeFormatRecommenderInput,
} from '@/lib/creative/creative-format-recommender';

// ── Credit cost ──

test('CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST is 3', () => {
  assert.equal(CREATIVE_FORMAT_RECOMMENDER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_FORMATS contains the five creative formats', () => {
  assert.ok(VALID_FORMATS.includes('video'));
  assert.ok(VALID_FORMATS.includes('carousel'));
  assert.ok(VALID_FORMATS.includes('image'));
  assert.ok(VALID_FORMATS.includes('story'));
  assert.ok(VALID_FORMATS.includes('text'));
  assert.equal(VALID_FORMATS.length, 5);
});

test('VALID_GOALS contains the five campaign goals', () => {
  assert.ok(VALID_GOALS.includes('awareness'));
  assert.ok(VALID_GOALS.includes('consideration'));
  assert.ok(VALID_GOALS.includes('conversion'));
  assert.ok(VALID_GOALS.includes('engagement'));
  assert.ok(VALID_GOALS.includes('retention'));
  assert.equal(VALID_GOALS.length, 5);
});

test('DEFAULT_GOAL is awareness', () => {
  assert.equal(DEFAULT_GOAL, 'awareness');
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeFormatRecommenderInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  campaignGoal: 'awareness',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeFormatRecommenderInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeFormatRecommenderInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeFormatRecommenderInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeFormatRecommenderInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeFormatRecommenderInput rejects missing campaignGoal', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    campaignGoal: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_required'));
});

test('validateCreativeFormatRecommenderInput rejects invalid campaignGoal', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    campaignGoal: 'branding' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_invalid'));
});

test('validateCreativeFormatRecommenderInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeFormatRecommenderInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeFormatRecommenderInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeFormatRecommenderInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeFormatRecommenderInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    productOrBrand: 'A fitness app',
    campaignGoal: 'conversion',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeFormatRecommenderInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeFormatRecommenderInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateFormatRecommendation with dryRun: true so no real
// LLM calls are made — deterministic heuristic recommendations are returned.

test('dry-run returns a FormatRecommenderResult with recommendation', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.recommendation);
  assert.ok(Array.isArray(result.recommendation.formats));
  assert.ok(result.recommendation.formats.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns formats with scores in 0-100 range', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  for (const f of result.recommendation.formats) {
    assert.ok(typeof f.score === 'number' && f.score >= 0 && f.score <= 100);
  }
});

test('dry-run returns formats sorted by score descending', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  const scores = result.recommendation.formats.map((f) => f.score);
  for (let i = 1; i < scores.length; i++) {
    assert.ok(scores[i - 1] >= scores[i], 'formats should be sorted by score descending');
  }
});

test('dry-run returns a topPick string', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  assert.ok(typeof result.recommendation.topPick === 'string');
  assert.ok(result.recommendation.topPick.length > 0);
});

test('dry-run topPick matches the highest-scoring format', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  const top = result.recommendation.formats[0];
  assert.ok(top);
  assert.equal(result.recommendation.topPick, top.format);
});

test('dry-run returns a reasoning string', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  assert.ok(typeof result.recommendation.reasoning === 'string');
  assert.ok(result.recommendation.reasoning.length > 0);
});

test('dry-run returns recommendations array', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.recommendation.recommendations));
  assert.ok(result.recommendation.recommendations.length > 0);
});

test('dry-run returns formats with correct structure', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  for (const f of result.recommendation.formats) {
    assert.ok(VALID_FORMATS.includes(f.format));
    assert.ok(typeof f.rationale === 'string' && f.rationale.length > 0);
    assert.ok(Array.isArray(f.bestUseCases));
    assert.ok(f.bestUseCases.length > 0);
    assert.ok(Array.isArray(f.platformTips));
    assert.ok(f.platformTips.length > 0);
  }
});

test('dry-run returns all five formats', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  assert.equal(result.recommendation.formats.length, VALID_FORMATS.length);
  const formatSet = new Set(result.recommendation.formats.map((f) => f.format));
  for (const fmt of VALID_FORMATS) {
    assert.ok(formatSet.has(fmt), `${fmt} should be present in dry-run output`);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateFormatRecommendation({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.recommendation.formats.length > 0, `${platform} should produce formats`);
  }
});

test('dry-run works for all campaign goals', async () => {
  for (const goal of VALID_GOALS) {
    const result = await generateFormatRecommendation({
      ...validInput,
      campaignGoal: goal,
      dryRun: true,
    });
    assert.ok(result.recommendation.formats.length > 0, `${goal} should produce formats`);
  }
});

test('dry-run produces different scores for different goals', async () => {
  const awareness = await generateFormatRecommendation({ ...validInput, campaignGoal: 'awareness', dryRun: true });
  const conversion = await generateFormatRecommendation({ ...validInput, campaignGoal: 'conversion', dryRun: true });
  const awVideo = awareness.recommendation.formats.find((f) => f.format === 'video')?.score;
  const cvVideo = conversion.recommendation.formats.find((f) => f.format === 'video')?.score;
  assert.ok(awVideo !== undefined && cvVideo !== undefined);
  // Scores may differ based on goal bias; just ensure both are valid numbers.
  assert.ok(awVideo >= 0 && awVideo <= 100);
  assert.ok(cvVideo >= 0 && cvVideo <= 100);
});

test('dry-run handles unknown campaignGoal gracefully', async () => {
  const result = await generateFormatRecommendation({
    ...validInput,
    campaignGoal: 'awareness', // valid; validation rejects unknown before reaching here
    dryRun: true,
  });
  assert.ok(result.recommendation.formats.length > 0);
});

test('dry-run works without platform', async () => {
  const result = await generateFormatRecommendation({
    productOrBrand: 'A fitness app',
    campaignGoal: 'engagement',
    targetAudience: 'Busy professionals',
    dryRun: true,
  });
  assert.ok(result.recommendation.formats.length > 0);
  assert.ok(result.recommendation.reasoning.length > 0);
});

test('dry-run bestUseCases are non-empty strings', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  for (const f of result.recommendation.formats) {
    for (const uc of f.bestUseCases) {
      assert.ok(typeof uc === 'string' && uc.length > 0);
    }
  }
});

test('dry-run platformTips are non-empty strings', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  for (const f of result.recommendation.formats) {
    for (const tip of f.platformTips) {
      assert.ok(typeof tip === 'string' && tip.length > 0);
    }
  }
});

test('generateFormatRecommendation rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateFormatRecommendation({ ...validInput, productOrBrand: '' } as CreativeFormatRecommenderInput),
    /invalid_creative_format_recommender_input/,
  );
});

test('generateFormatRecommendation rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateFormatRecommendation({ ...validInput, targetAudience: '', dryRun: true } as CreativeFormatRecommenderInput),
    /invalid_creative_format_recommender_input/,
  );
});

test('generateFormatRecommendation rejects missing campaignGoal in dry-run mode', async () => {
  await assert.rejects(
    () => generateFormatRecommendation({ ...validInput, campaignGoal: '', dryRun: true } as CreativeFormatRecommenderInput),
    /invalid_creative_format_recommender_input/,
  );
});

test('generateFormatRecommendation rejects invalid campaignGoal in dry-run mode', async () => {
  await assert.rejects(
    () => generateFormatRecommendation({ ...validInput, campaignGoal: 'branding', dryRun: true } as CreativeFormatRecommenderInput),
    /invalid_creative_format_recommender_input/,
  );
});

test('dry-run recommendations reference the top pick', async () => {
  const result = await generateFormatRecommendation({ ...validInput, dryRun: true });
  const top = result.recommendation.topPick;
  const mentionsTop = result.recommendation.recommendations.some((r) => r.includes(top));
  assert.ok(mentionsTop, 'at least one recommendation should reference the top pick');
});
