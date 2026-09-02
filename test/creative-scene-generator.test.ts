import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Scene Generator engine (AI-powered scene description
 * generation for ad video shoots).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_SCENE_GENERATOR_CREDIT_COST,
  validateCreativeSceneGeneratorInput,
  generateScenes,
  VALID_PLATFORMS,
  VALID_SHOT_TYPES,
  VALID_CAMERA_ANGLES,
  VALID_LIGHTING,
  VALID_LOCATIONS,
  MAX_PRODUCT_LENGTH,
  MAX_CONCEPT_LENGTH,
  MIN_SCENE_COUNT,
  MAX_SCENE_COUNT,
  DEFAULT_SCENE_COUNT,
  type CreativeSceneGeneratorInput,
} from '@/lib/creative/creative-scene-generator';

// ── Credit cost ──

test('CREATIVE_SCENE_GENERATOR_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_SCENE_GENERATOR_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_SHOT_TYPES contains the five shot types', () => {
  assert.ok(VALID_SHOT_TYPES.includes('wide'));
  assert.ok(VALID_SHOT_TYPES.includes('medium'));
  assert.ok(VALID_SHOT_TYPES.includes('close-up'));
  assert.ok(VALID_SHOT_TYPES.includes('overhead'));
  assert.ok(VALID_SHOT_TYPES.includes('panning'));
  assert.equal(VALID_SHOT_TYPES.length, 5);
});

test('VALID_CAMERA_ANGLES contains the four angles', () => {
  assert.ok(VALID_CAMERA_ANGLES.includes('eye-level'));
  assert.ok(VALID_CAMERA_ANGLES.includes('low'));
  assert.ok(VALID_CAMERA_ANGLES.includes('high'));
  assert.ok(VALID_CAMERA_ANGLES.includes('dutch'));
  assert.equal(VALID_CAMERA_ANGLES.length, 4);
});

test('VALID_LIGHTING contains the four lighting types', () => {
  assert.ok(VALID_LIGHTING.includes('natural'));
  assert.ok(VALID_LIGHTING.includes('studio'));
  assert.ok(VALID_LIGHTING.includes('dramatic'));
  assert.ok(VALID_LIGHTING.includes('soft'));
  assert.equal(VALID_LIGHTING.length, 4);
});

test('VALID_LOCATIONS contains the five locations', () => {
  assert.ok(VALID_LOCATIONS.includes('studio'));
  assert.ok(VALID_LOCATIONS.includes('outdoor'));
  assert.ok(VALID_LOCATIONS.includes('home'));
  assert.ok(VALID_LOCATIONS.includes('office'));
  assert.ok(VALID_LOCATIONS.includes('retail'));
  assert.equal(VALID_LOCATIONS.length, 5);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONCEPT_LENGTH is 2000', () => {
  assert.equal(MAX_CONCEPT_LENGTH, 2000);
});

test('sceneCount bounds are 3-8 with default 5', () => {
  assert.equal(MIN_SCENE_COUNT, 3);
  assert.equal(MAX_SCENE_COUNT, 8);
  assert.equal(DEFAULT_SCENE_COUNT, 5);
});

// ── Input validation tests ──

const validInput: CreativeSceneGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  concept: 'A before-and-after transformation showing real results',
  sceneCount: 5,
  location: 'studio',
};

test('validateCreativeSceneGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeSceneGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeSceneGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeSceneGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeSceneGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateCreativeSceneGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeSceneGeneratorInput rejects missing concept', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    concept: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_required'));
});

test('validateCreativeSceneGeneratorInput rejects concept over 2000 chars', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    concept: 'x'.repeat(MAX_CONCEPT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_too_long'));
});

test('validateCreativeSceneGeneratorInput rejects sceneCount below 3', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    sceneCount: 2,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('scene_count_out_of_range'));
});

test('validateCreativeSceneGeneratorInput rejects sceneCount above 8', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    sceneCount: 9,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('scene_count_out_of_range'));
});

test('validateCreativeSceneGeneratorInput rejects invalid sceneCount type', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    sceneCount: 'five' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('scene_count_invalid'));
});

test('validateCreativeSceneGeneratorInput rejects invalid location', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    location: 'beach' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('location_invalid'));
});

test('validateCreativeSceneGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeSceneGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeSceneGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
    concept: 'A day-in-the-life showing the app in action',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateScenes with dryRun: true so no real LLM calls
// are made — deterministic heuristic scenes are returned instead.

test('dry-run returns a CreativeSceneGeneratorResult with scenes', async () => {
  const result = await generateScenes({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.scenes));
  assert.ok(result.scenes.length > 0);
  assert.equal(result.dryRun, true);
  assert.ok(typeof result.totalDuration === 'number');
  assert.ok(result.totalDuration > 0);
});

test('dry-run returns scenes with correct structure', async () => {
  const result = await generateScenes({ ...validInput, dryRun: true });
  for (const scene of result.scenes) {
    assert.ok(typeof scene.sceneNumber === 'number' && scene.sceneNumber > 0);
    assert.ok(VALID_SHOT_TYPES.includes(scene.shotType));
    assert.ok(VALID_CAMERA_ANGLES.includes(scene.cameraAngle));
    assert.ok(VALID_LIGHTING.includes(scene.lighting));
    assert.ok(typeof scene.setting === 'string' && scene.setting.length > 0);
    assert.ok(Array.isArray(scene.props));
    assert.ok(typeof scene.actorNotes === 'string' && scene.actorNotes.length > 0);
    assert.ok(typeof scene.dialogue === 'string');
    assert.ok(typeof scene.duration === 'number' && scene.duration > 0);
    assert.ok(typeof scene.mood === 'string' && scene.mood.length > 0);
  }
});

test('dry-run returns the requested count of scenes', async () => {
  const result = await generateScenes({ ...validInput, sceneCount: 8, dryRun: true });
  assert.equal(result.scenes.length, 8);
});

test('dry-run defaults to 5 scenes when sceneCount not provided', async () => {
  const result = await generateScenes({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    concept: 'A morning routine transformation',
    dryRun: true,
  });
  assert.equal(result.scenes.length, DEFAULT_SCENE_COUNT);
});

test('dry-run totalDuration equals sum of scene durations', async () => {
  const result = await generateScenes({ ...validInput, dryRun: true });
  const sum = result.scenes.reduce((acc, s) => acc + s.duration, 0);
  assert.equal(result.totalDuration, sum);
});

test('dry-run scenes are numbered sequentially starting at 1', async () => {
  const result = await generateScenes({ ...validInput, sceneCount: 6, dryRun: true });
  result.scenes.forEach((scene, i) => {
    assert.equal(scene.sceneNumber, i + 1);
  });
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateScenes({
      productOrBrand: 'A fitness app',
      platform,
      concept: 'A workout transformation story',
      dryRun: true,
    });
    assert.ok(result.scenes.length > 0, `${platform} should produce scenes`);
  }
});

test('dry-run works for all five locations', async () => {
  for (const location of VALID_LOCATIONS) {
    const result = await generateScenes({
      productOrBrand: 'A fitness app',
      platform: 'youtube',
      concept: 'A product demo',
      location,
      dryRun: true,
    });
    assert.ok(result.scenes.length > 0, `${location} should produce scenes`);
  }
});

test('generateScenes rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateScenes({ ...validInput, productOrBrand: '' } as CreativeSceneGeneratorInput),
    /invalid_creative_scene_generator_input/,
  );
});

test('generateScenes rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateScenes({ ...validInput, platform: 'snapchat' as never, dryRun: true } as CreativeSceneGeneratorInput),
    /invalid_creative_scene_generator_input/,
  );
});

test('generateScenes rejects invalid sceneCount in dry-run mode', async () => {
  await assert.rejects(
    () => generateScenes({ ...validInput, sceneCount: 10, dryRun: true } as CreativeSceneGeneratorInput),
    /invalid_creative_scene_generator_input/,
  );
});
