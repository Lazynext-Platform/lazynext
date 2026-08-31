import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Story Generator engine (AI-powered ad narrative generation
 * with emotional arcs).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_STORY_GENERATOR_CREDIT_COST,
  validateAdStoryGeneratorInput,
  generateAdStory,
  VALID_PLATFORMS,
  VALID_STORY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_TARGET_AUDIENCE_LENGTH,
  MIN_DURATION,
  MAX_DURATION,
  DEFAULT_DURATION,
  type AdStoryGeneratorInput,
} from '@/lib/creative/ad-story-generator';

// ── Credit cost ──

test('AD_STORY_GENERATOR_CREDIT_COST is 5', () => {
  assert.equal(AD_STORY_GENERATOR_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_STORY_TYPES contains the five story types', () => {
  assert.ok(VALID_STORY_TYPES.includes('transformation'));
  assert.ok(VALID_STORY_TYPES.includes('journey'));
  assert.ok(VALID_STORY_TYPES.includes('conflict'));
  assert.ok(VALID_STORY_TYPES.includes('resolution'));
  assert.ok(VALID_STORY_TYPES.includes('aspiration'));
  assert.equal(VALID_STORY_TYPES.length, 5);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('duration bounds are 15-90 with default 30', () => {
  assert.equal(MIN_DURATION, 15);
  assert.equal(MAX_DURATION, 90);
  assert.equal(DEFAULT_DURATION, 30);
});

// ── Input validation tests ──

const validInput: AdStoryGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  storyType: 'transformation',
  targetAudience: 'women 25-40 interested in clean beauty',
  duration: 30,
};

test('validateAdStoryGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdStoryGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdStoryGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdStoryGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdStoryGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdStoryGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdStoryGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdStoryGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdStoryGeneratorInput rejects missing storyType', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    storyType: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('story_type_required'));
});

test('validateAdStoryGeneratorInput rejects invalid storyType', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    storyType: 'mystery' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('story_type_invalid'));
});

test('validateAdStoryGeneratorInput rejects targetAudience over 1000 chars', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_TARGET_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdStoryGeneratorInput rejects invalid targetAudience type', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    targetAudience: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_invalid'));
});

test('validateAdStoryGeneratorInput rejects duration below 15', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    duration: 10,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('duration_out_of_range'));
});

test('validateAdStoryGeneratorInput rejects duration above 90', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    duration: 100,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('duration_out_of_range'));
});

test('validateAdStoryGeneratorInput rejects invalid duration type', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    duration: 'thirty' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('duration_invalid'));
});

test('validateAdStoryGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdStoryGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdStoryGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
    storyType: 'journey',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateAdStory with dryRun: true so no real LLM calls are
// made — deterministic heuristic stories are returned instead.

test('dry-run returns an AdStoryGeneratorResult with a story', async () => {
  const result = await generateAdStory({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.story);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a story with correct structure', async () => {
  const result = await generateAdStory({ ...validInput, dryRun: true });
  const story = result.story;
  assert.ok(typeof story.title === 'string' && story.title.length > 0);
  assert.ok(typeof story.logline === 'string' && story.logline.length > 0);
  assert.ok(Array.isArray(story.acts));
  assert.ok(story.acts.length >= 3);
  assert.ok(typeof story.emotionalArc === 'string' && story.emotionalArc.length > 0);
  assert.ok(typeof story.keyMessage === 'string' && story.keyMessage.length > 0);
  assert.ok(typeof story.ctaIntegration === 'string' && story.ctaIntegration.length > 0);
});

test('dry-run returns acts with correct structure', async () => {
  const result = await generateAdStory({ ...validInput, dryRun: true });
  for (const act of result.story.acts) {
    assert.ok(typeof act.actNumber === 'number' && act.actNumber >= 1);
    assert.ok(typeof act.title === 'string' && act.title.length > 0);
    assert.ok(typeof act.description === 'string' && act.description.length > 0);
    assert.ok(typeof act.visualNotes === 'string' && act.visualNotes.length > 0);
    assert.ok(typeof act.voiceover === 'string' && act.voiceover.length > 0);
    assert.ok(typeof act.emotionBeat === 'string' && act.emotionBeat.length > 0);
    assert.ok(typeof act.duration === 'number' && act.duration >= 1);
  }
});

test('dry-run act numbers are sequential starting at 1', async () => {
  const result = await generateAdStory({ ...validInput, dryRun: true });
  for (let i = 0; i < result.story.acts.length; i++) {
    assert.equal(result.story.acts[i].actNumber, i + 1);
  }
});

test('dry-run act durations sum approximately to total duration', async () => {
  const result = await generateAdStory({ ...validInput, duration: 60, dryRun: true });
  const total = result.story.acts.reduce((sum, act) => sum + act.duration, 0);
  assert.ok(total >= 50 && total <= 70, `total duration ${total} should be close to 60`);
});

test('dry-run defaults to 30 seconds when duration not provided', async () => {
  const result = await generateAdStory({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    storyType: 'journey',
    dryRun: true,
  });
  const total = result.story.acts.reduce((sum, act) => sum + act.duration, 0);
  assert.ok(total >= 25 && total <= 35, `total duration ${total} should be close to ${DEFAULT_DURATION}`);
});

test('dry-run works for all five story types', async () => {
  for (const storyType of VALID_STORY_TYPES) {
    const result = await generateAdStory({
      productOrBrand: 'A fitness app',
      platform: 'youtube',
      storyType,
      dryRun: true,
    });
    assert.ok(result.story.acts.length >= 3, `${storyType} should have at least 3 acts`);
    assert.ok(result.story.title.length > 0, `${storyType} should have a title`);
  }
});

test('generateAdStory rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdStory({ ...validInput, productOrBrand: '' } as AdStoryGeneratorInput),
    /invalid_ad_story_generator_input/,
  );
});

test('generateAdStory rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdStory({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdStoryGeneratorInput),
    /invalid_ad_story_generator_input/,
  );
});

test('generateAdStory rejects invalid storyType in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdStory({ ...validInput, storyType: 'mystery' as never, dryRun: true } as AdStoryGeneratorInput),
    /invalid_ad_story_generator_input/,
  );
});

test('generateAdStory rejects invalid duration in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdStory({ ...validInput, duration: 200, dryRun: true } as AdStoryGeneratorInput),
    /invalid_ad_story_generator_input/,
  );
});
