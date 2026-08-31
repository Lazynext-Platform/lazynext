import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Brief Generator engine (AI-powered creative brief
 * generation from minimal input).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_BRIEF_GENERATOR_CREDIT_COST,
  validateCreativeBriefGeneratorInput,
  generateCreativeBrief,
  VALID_PLATFORMS,
  VALID_BUDGETS,
  MAX_PRODUCT_LENGTH,
  MAX_GOAL_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeBriefGeneratorInput,
} from '@/lib/creative/creative-brief-generator';

// ── Credit cost ──

test('CREATIVE_BRIEF_GENERATOR_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_BRIEF_GENERATOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_BUDGETS contains the three levels', () => {
  assert.ok(VALID_BUDGETS.includes('low'));
  assert.ok(VALID_BUDGETS.includes('medium'));
  assert.ok(VALID_BUDGETS.includes('high'));
  assert.equal(VALID_BUDGETS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_GOAL_LENGTH is 500', () => {
  assert.equal(MAX_GOAL_LENGTH, 500);
});

test('MAX_AUDIENCE_LENGTH is 1000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 1000);
});

// ── Input validation tests ──

const validInput: CreativeBriefGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  campaignGoal: 'launch a new product line and drive pre-orders',
  platform: 'tiktok',
  targetAudience: 'millennial skincare enthusiasts',
  budget: 'medium',
};

test('validateCreativeBriefGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeBriefGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeBriefGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeBriefGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeBriefGeneratorInput rejects missing campaignGoal', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    campaignGoal: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_required'));
});

test('validateCreativeBriefGeneratorInput rejects campaignGoal over 500 chars', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    campaignGoal: 'x'.repeat(MAX_GOAL_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('campaign_goal_too_long'));
});

test('validateCreativeBriefGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeBriefGeneratorInput rejects targetAudience over 1000 chars', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeBriefGeneratorInput rejects invalid budget', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    budget: 'huge' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('budget_invalid'));
});

test('validateCreativeBriefGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeBriefGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeBriefGeneratorInput({
    productOrBrand: 'A new fitness app',
    campaignGoal: 'drive app installs',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateCreativeBrief with dryRun: true so no real LLM
// calls are made — deterministic heuristic briefs are returned.

test('dry-run returns a CreativeBriefGeneratorResult with a brief', async () => {
  const result = await generateCreativeBrief({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.brief);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a brief with correct structure', async () => {
  const result = await generateCreativeBrief({ ...validInput, dryRun: true });
  const brief = result.brief;
  assert.ok(typeof brief.title === 'string' && brief.title.length > 0);
  assert.ok(typeof brief.objective === 'string' && brief.objective.length > 0);
  assert.ok(typeof brief.targetAudience === 'string' && brief.targetAudience.length > 0);
  assert.ok(typeof brief.keyMessage === 'string' && brief.keyMessage.length > 0);
  assert.ok(typeof brief.tone === 'string' && brief.tone.length > 0);
  assert.ok(Array.isArray(brief.deliverables) && brief.deliverables.length > 0);
  assert.ok(typeof brief.timeline === 'string' && brief.timeline.length > 0);
  assert.ok(typeof brief.budgetGuidance === 'string' && brief.budgetGuidance.length > 0);
  assert.ok(Array.isArray(brief.successMetrics) && brief.successMetrics.length > 0);
  assert.ok(typeof brief.creativeDirection === 'string' && brief.creativeDirection.length > 0);
  assert.ok(Array.isArray(brief.platformRecommendations) && brief.platformRecommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateCreativeBrief({
      productOrBrand: 'A fitness app',
      campaignGoal: 'drive app installs',
      platform,
      dryRun: true,
    });
    assert.ok(result.brief.deliverables.length > 0, `${platform} should produce deliverables`);
  }
});

test('dry-run works for all three budget levels', async () => {
  for (const budget of VALID_BUDGETS) {
    const result = await generateCreativeBrief({
      productOrBrand: 'A fitness app',
      campaignGoal: 'drive app installs',
      budget,
      dryRun: true,
    });
    assert.ok(result.brief.budgetGuidance.length > 0, `${budget} budget should produce guidance`);
  }
});

test('dry-run works without optional fields', async () => {
  const result = await generateCreativeBrief({
    productOrBrand: 'A coffee subscription',
    campaignGoal: 'increase brand awareness',
    dryRun: true,
  });
  assert.ok(result.brief.platformRecommendations.length > 0);
});

test('generateCreativeBrief rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateCreativeBrief({ ...validInput, productOrBrand: '' } as CreativeBriefGeneratorInput),
    /invalid_creative_brief_generator_input/,
  );
});

test('generateCreativeBrief rejects missing campaignGoal in dry-run mode', async () => {
  await assert.rejects(
    () => generateCreativeBrief({ ...validInput, campaignGoal: '', dryRun: true } as CreativeBriefGeneratorInput),
    /invalid_creative_brief_generator_input/,
  );
});

test('generateCreativeBrief rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateCreativeBrief({ ...validInput, platform: 'snapchat' as never, dryRun: true } as CreativeBriefGeneratorInput),
    /invalid_creative_brief_generator_input/,
  );
});
