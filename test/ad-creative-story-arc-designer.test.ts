import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Story Arc Designer engine (AI-powered story arc
 * design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST,
  validateAdCreativeStoryArcDesignerInput,
  generateStoryArc,
  VALID_PLATFORMS,
  VALID_EMOTIONS,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_MESSAGE_LENGTH,
  type AdCreativeStoryArcDesignerInput,
} from '@/lib/creative/ad-creative-story-arc-designer';

// ── Credit cost ──

test('AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_STORY_ARC_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_EMOTIONS contains the eight emotions', () => {
  assert.ok(VALID_EMOTIONS.includes('joy'));
  assert.ok(VALID_EMOTIONS.includes('surprise'));
  assert.ok(VALID_EMOTIONS.includes('fear'));
  assert.ok(VALID_EMOTIONS.includes('sadness'));
  assert.ok(VALID_EMOTIONS.includes('anger'));
  assert.ok(VALID_EMOTIONS.includes('trust'));
  assert.ok(VALID_EMOTIONS.includes('anticipation'));
  assert.ok(VALID_EMOTIONS.includes('disgust'));
  assert.equal(VALID_EMOTIONS.length, 8);
});

test('VALID_IMPACTS contains the three impacts', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_MESSAGE_LENGTH is 2000', () => {
  assert.equal(MAX_MESSAGE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeStoryArcDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  coreMessage: 'Brighten your skin in just 7 days — risk-free',
  targetEmotion: 'joy',
  platform: 'tiktok',
};

test('validateAdCreativeStoryArcDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeStoryArcDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeStoryArcDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeStoryArcDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeStoryArcDesignerInput rejects missing coreMessage', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    coreMessage: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('core_message_required'));
});

test('validateAdCreativeStoryArcDesignerInput rejects coreMessage over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    coreMessage: 'x'.repeat(MAX_MESSAGE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('core_message_too_long'));
});

test('validateAdCreativeStoryArcDesignerInput rejects invalid targetEmotion', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    targetEmotion: 'boredom' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_emotion_invalid'));
});

test('validateAdCreativeStoryArcDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeStoryArcDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeStoryArcDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    productOrBrand: 'A fitness app',
    coreMessage: 'Get fit in 10 minutes a day',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeStoryArcDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeStoryArcDesignerInput accepts empty targetEmotion string', () => {
  const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
    ...validInput,
    targetEmotion: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeStoryArcDesignerInput accepts all eight emotions', () => {
  for (const emotion of VALID_EMOTIONS) {
    const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
      ...validInput,
      targetEmotion: emotion,
    });
    assert.ok(valid, `${emotion} should be valid: ${errors.join(', ')}`);
  }
});

test('validateAdCreativeStoryArcDesignerInput accepts all four platforms', () => {
  for (const platform of VALID_PLATFORMS) {
    const { valid, errors } = validateAdCreativeStoryArcDesignerInput({
      ...validInput,
      platform,
    });
    assert.ok(valid, `${platform} should be valid: ${errors.join(', ')}`);
  }
});

// ── Dry-run mode tests ──
//
// These tests run generateStoryArc with dryRun: true so no real LLM
// calls are made — deterministic heuristic story arcs are returned.

test('dry-run returns a StoryArcDesignerResult with arc', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.arc);
  assert.ok(Array.isArray(result.arc.acts));
  assert.ok(result.arc.acts.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns acts with correct structure', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  for (const a of result.arc.acts) {
    assert.ok(typeof a.act === 'number' && a.act > 0);
    assert.ok(typeof a.name === 'string' && a.name.length > 0);
    assert.ok(typeof a.description === 'string' && a.description.length > 0);
    assert.ok(typeof a.duration === 'string' && a.duration.length > 0);
    assert.ok(typeof a.purpose === 'string' && a.purpose.length > 0);
  }
});

test('dry-run returns emotionalBeats with correct structure', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.arc.emotionalBeats));
  assert.ok(result.arc.emotionalBeats.length > 0);
  for (const b of result.arc.emotionalBeats) {
    assert.ok(typeof b.beat === 'string' && b.beat.length > 0);
    assert.ok(typeof b.emotion === 'string' && b.emotion.length > 0);
    assert.ok(typeof b.intensity === 'number' && b.intensity >= 0 && b.intensity <= 100);
    assert.ok(typeof b.timing === 'string' && b.timing.length > 0);
    assert.ok(typeof b.description === 'string' && b.description.length > 0);
  }
});

test('dry-run returns a pacingGuide string', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  assert.ok(typeof result.arc.pacingGuide === 'string');
  assert.ok(result.arc.pacingGuide.length > 0);
});

test('dry-run returns keyMoments with correct structure', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.arc.keyMoments));
  assert.ok(result.arc.keyMoments.length > 0);
  for (const km of result.arc.keyMoments) {
    assert.ok(typeof km.moment === 'string' && km.moment.length > 0);
    assert.ok(typeof km.type === 'string' && km.type.length > 0);
    assert.ok(VALID_IMPACTS.includes(km.impact));
    assert.ok(typeof km.description === 'string' && km.description.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.arc.recommendations));
  assert.ok(result.arc.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateStoryArc({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.arc.acts.length > 0, `${platform} should produce acts`);
  }
});

test('dry-run works for all eight emotions', async () => {
  for (const emotion of VALID_EMOTIONS) {
    const result = await generateStoryArc({
      ...validInput,
      targetEmotion: emotion,
      dryRun: true,
    });
    assert.ok(result.arc.acts.length > 0, `${emotion} should produce acts`);
  }
});

test('dry-run works without platform or targetEmotion', async () => {
  const result = await generateStoryArc({
    productOrBrand: 'A fitness app',
    coreMessage: 'Get fit in 10 minutes a day',
    dryRun: true,
  });
  assert.ok(result.arc.acts.length > 0);
  assert.ok(result.arc.emotionalBeats.length > 0);
});

test('dry-run produces at least 3 acts', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  assert.ok(result.arc.acts.length >= 3);
});

test('dry-run act numbers are sequential starting at 1', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  result.arc.acts.forEach((a, i) => {
    assert.equal(a.act, i + 1);
  });
});

test('dry-run emotional beat intensities are in 0-100 range', async () => {
  const result = await generateStoryArc({ ...validInput, dryRun: true });
  for (const b of result.arc.emotionalBeats) {
    assert.ok(b.intensity >= 0 && b.intensity <= 100);
  }
});

test('dry-run is deterministic for identical input', async () => {
  const a = await generateStoryArc({ ...validInput, dryRun: true });
  const b = await generateStoryArc({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('generateStoryArc rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateStoryArc({ ...validInput, productOrBrand: '' } as AdCreativeStoryArcDesignerInput),
    /invalid_ad_creative_story_arc_designer_input/,
  );
});

test('generateStoryArc rejects missing coreMessage in dry-run mode', async () => {
  await assert.rejects(
    () => generateStoryArc({ ...validInput, coreMessage: '', dryRun: true } as AdCreativeStoryArcDesignerInput),
    /invalid_ad_creative_story_arc_designer_input/,
  );
});

test('generateStoryArc rejects invalid targetEmotion in dry-run mode', async () => {
  await assert.rejects(
    () => generateStoryArc({ ...validInput, targetEmotion: 'boredom', dryRun: true } as AdCreativeStoryArcDesignerInput),
    /invalid_ad_creative_story_arc_designer_input/,
  );
});

test('generateStoryArc rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateStoryArc({ ...validInput, platform: 'snapchat', dryRun: true } as AdCreativeStoryArcDesignerInput),
    /invalid_ad_creative_story_arc_designer_input/,
  );
});
