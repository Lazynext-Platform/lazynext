import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Brand Story Architect engine (AI-powered brand story arc
 * generation for advertising).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  BRAND_STORY_ARCHITECT_CREDIT_COST,
  validateBrandStoryArchitectInput,
  generateBrandStory,
  VALID_PLATFORMS,
  VALID_STORY_TYPES,
  MAX_BRAND_NAME_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_BRAND_VALUES_LENGTH,
  type BrandStoryArchitectInput,
} from '@/lib/creative/brand-story-architect';

// ── Credit cost ──

test('BRAND_STORY_ARCHITECT_CREDIT_COST is 5', () => {
  assert.equal(BRAND_STORY_ARCHITECT_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_STORY_TYPES contains the six story types', () => {
  assert.ok(VALID_STORY_TYPES.includes('hero-journey'));
  assert.ok(VALID_STORY_TYPES.includes('before-after'));
  assert.ok(VALID_STORY_TYPES.includes('problem-solution'));
  assert.ok(VALID_STORY_TYPES.includes('transformation'));
  assert.ok(VALID_STORY_TYPES.includes('legacy'));
  assert.ok(VALID_STORY_TYPES.includes('rebellion'));
  assert.equal(VALID_STORY_TYPES.length, 6);
});

test('MAX_BRAND_NAME_LENGTH is 2000', () => {
  assert.equal(MAX_BRAND_NAME_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_BRAND_VALUES_LENGTH is 500', () => {
  assert.equal(MAX_BRAND_VALUES_LENGTH, 500);
});

// ── Input validation tests ──

const validInput: BrandStoryArchitectInput = {
  brandName: 'GlowUp',
  productOrService: 'A skincare app that uses AI to personalize routines',
  brandValues: 'authenticity, empowerment, sustainability',
  storyType: 'hero-journey',
};

test('validateBrandStoryArchitectInput accepts a valid input', () => {
  const { valid, errors } = validateBrandStoryArchitectInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateBrandStoryArchitectInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateBrandStoryArchitectInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateBrandStoryArchitectInput rejects missing brandName', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    brandName: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_name_required'));
});

test('validateBrandStoryArchitectInput rejects brandName over 2000 chars', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    brandName: 'x'.repeat(MAX_BRAND_NAME_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_name_too_long'));
});

test('validateBrandStoryArchitectInput rejects missing productOrService', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    productOrService: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_service_required'));
});

test('validateBrandStoryArchitectInput rejects productOrService over 2000 chars', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    productOrService: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_service_too_long'));
});

test('validateBrandStoryArchitectInput rejects missing brandValues', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    brandValues: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_values_required'));
});

test('validateBrandStoryArchitectInput rejects brandValues over 500 chars', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    brandValues: 'x'.repeat(MAX_BRAND_VALUES_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_values_too_long'));
});

test('validateBrandStoryArchitectInput rejects invalid storyType', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    storyType: 'mystery' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('story_type_invalid'));
});

test('validateBrandStoryArchitectInput rejects invalid platform', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateBrandStoryArchitectInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateBrandStoryArchitectInput accepts input with only required fields', () => {
  const { valid, errors } = validateBrandStoryArchitectInput({
    brandName: 'GlowUp',
    productOrService: 'A skincare app',
    brandValues: 'authenticity',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateBrandStory with dryRun: true so no real LLM calls
// are made — deterministic heuristic story arcs are returned instead.

test('dry-run returns a BrandStoryArchitectResult with a story', async () => {
  const result = await generateBrandStory({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.story);
  assert.ok(result.story.arc);
  assert.ok(Array.isArray(result.story.arc.acts));
  assert.ok(result.story.arc.acts.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns acts with correct structure', async () => {
  const result = await generateBrandStory({ ...validInput, dryRun: true });
  for (const act of result.story.arc.acts) {
    assert.ok(typeof act.name === 'string' && act.name.length > 0);
    assert.ok(typeof act.summary === 'string' && act.summary.length > 0);
    assert.ok(Array.isArray(act.keyBeats));
    assert.ok(typeof act.emotionalTone === 'string' && act.emotionalTone.length > 0);
  }
});

test('dry-run returns story beats with correct structure', async () => {
  const result = await generateBrandStory({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.story.storyBeats));
  assert.ok(result.story.storyBeats.length > 0);
  for (const beat of result.story.storyBeats) {
    assert.ok(typeof beat.beat === 'string' && beat.beat.length > 0);
    assert.ok(typeof beat.description === 'string' && beat.description.length > 0);
    assert.ok(typeof beat.adApplication === 'string' && beat.adApplication.length > 0);
  }
});

test('dry-run returns character roles with correct structure', async () => {
  const result = await generateBrandStory({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.story.arc.characterRoles));
  assert.ok(result.story.arc.characterRoles.length > 0);
  for (const role of result.story.arc.characterRoles) {
    assert.ok(typeof role.role === 'string' && role.role.length > 0);
    assert.ok(typeof role.description === 'string' && role.description.length > 0);
  }
});

test('dry-run returns core message, brand positioning, emotional core, and recommendations', async () => {
  const result = await generateBrandStory({ ...validInput, dryRun: true });
  assert.ok(typeof result.story.coreMessage === 'string' && result.story.coreMessage.length > 0);
  assert.ok(typeof result.story.brandPositioning === 'string' && result.story.brandPositioning.length > 0);
  assert.ok(typeof result.story.emotionalCore === 'string' && result.story.emotionalCore.length > 0);
  assert.ok(Array.isArray(result.story.recommendations));
  assert.ok(result.story.recommendations.length > 0);
});

test('dry-run returns conflict and resolution', async () => {
  const result = await generateBrandStory({ ...validInput, dryRun: true });
  assert.ok(typeof result.story.arc.conflict === 'string' && result.story.arc.conflict.length > 0);
  assert.ok(typeof result.story.arc.resolution === 'string' && result.story.arc.resolution.length > 0);
});

test('dry-run works for all six story types', async () => {
  for (const st of VALID_STORY_TYPES) {
    const result = await generateBrandStory({
      ...validInput,
      storyType: st,
      dryRun: true,
    });
    assert.ok(result.story.arc.acts.length > 0, `${st} should produce acts`);
    assert.ok(result.story.storyBeats.length > 0, `${st} should produce story beats`);
  }
});

test('dry-run works without storyType (defaults to hero-journey)', async () => {
  const result = await generateBrandStory({
    brandName: 'GlowUp',
    productOrService: 'A skincare app',
    brandValues: 'authenticity',
    dryRun: true,
  });
  assert.ok(result.story.arc.acts.length > 0);
  assert.ok(result.story.storyBeats.length > 0);
});

test('generateBrandStory rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateBrandStory({ ...validInput, brandName: '' } as BrandStoryArchitectInput),
    /invalid_brand_story_architect_input/,
  );
});

test('generateBrandStory rejects missing productOrService in dry-run mode', async () => {
  await assert.rejects(
    () => generateBrandStory({ ...validInput, productOrService: '', dryRun: true } as BrandStoryArchitectInput),
    /invalid_brand_story_architect_input/,
  );
});

test('generateBrandStory rejects missing brandValues in dry-run mode', async () => {
  await assert.rejects(
    () => generateBrandStory({ ...validInput, brandValues: '', dryRun: true } as BrandStoryArchitectInput),
    /invalid_brand_story_architect_input/,
  );
});
