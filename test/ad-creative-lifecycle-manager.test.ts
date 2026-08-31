import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Lifecycle Manager engine (AI-powered ad creative
 * lifecycle management from launch to retirement).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST,
  validateAdCreativeLifecycleManagerInput,
  generateLifecycleAnalysis,
  VALID_PLATFORMS,
  VALID_STAGES,
  VALID_HEALTH,
  DEFAULT_STAGE,
  MAX_PRODUCT_LENGTH,
  MAX_CREATIVE_LENGTH,
  type AdCreativeLifecycleManagerInput,
} from '@/lib/creative/ad-creative-lifecycle-manager';

// ── Credit cost ──

test('AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_LIFECYCLE_MANAGER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_STAGES contains the five lifecycle stages', () => {
  assert.ok(VALID_STAGES.includes('launch'));
  assert.ok(VALID_STAGES.includes('growth'));
  assert.ok(VALID_STAGES.includes('maturity'));
  assert.ok(VALID_STAGES.includes('decline'));
  assert.ok(VALID_STAGES.includes('retirement'));
  assert.equal(VALID_STAGES.length, 5);
});

test('VALID_HEALTH contains the three health indicators', () => {
  assert.ok(VALID_HEALTH.includes('healthy'));
  assert.ok(VALID_HEALTH.includes('warning'));
  assert.ok(VALID_HEALTH.includes('critical'));
  assert.equal(VALID_HEALTH.length, 3);
});

test('DEFAULT_STAGE is launch', () => {
  assert.equal(DEFAULT_STAGE, 'launch');
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CREATIVE_LENGTH is 2000', () => {
  assert.equal(MAX_CREATIVE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeLifecycleManagerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  creativeDescription: 'A 15s UGC-style video showing a before/after transformation with a strong hook and clear CTA.',
  currentStage: 'launch',
  platform: 'tiktok',
};

test('validateAdCreativeLifecycleManagerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeLifecycleManagerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeLifecycleManagerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeLifecycleManagerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeLifecycleManagerInput rejects missing creativeDescription', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    creativeDescription: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_description_required'));
});

test('validateAdCreativeLifecycleManagerInput rejects creativeDescription over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    creativeDescription: 'x'.repeat(MAX_CREATIVE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creative_description_too_long'));
});

test('validateAdCreativeLifecycleManagerInput rejects invalid currentStage', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    currentStage: 'viral' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('current_stage_invalid'));
});

test('validateAdCreativeLifecycleManagerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeLifecycleManagerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeLifecycleManagerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    productOrBrand: 'A fitness app',
    creativeDescription: 'A 30s demo video showing the app workout flow.',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeLifecycleManagerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeLifecycleManagerInput accepts empty currentStage string', () => {
  const { valid, errors } = validateAdCreativeLifecycleManagerInput({
    ...validInput,
    currentStage: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateLifecycleAnalysis with dryRun: true so no real LLM
// calls are made — deterministic heuristic lifecycle analysis is returned.

test('dry-run returns a LifecycleResult with lifecycle', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.lifecycle);
  assert.ok(typeof result.lifecycle.currentStage === 'string');
  assert.ok(Array.isArray(result.lifecycle.stageAnalysis));
  assert.ok(result.lifecycle.stageAnalysis.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a valid currentStage', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  assert.ok(VALID_STAGES.includes(result.lifecycle.currentStage));
});

test('dry-run returns stageAnalysis with correct structure', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  for (const phase of result.lifecycle.stageAnalysis) {
    assert.ok(VALID_STAGES.includes(phase.stage));
    assert.ok(VALID_HEALTH.includes(phase.health));
    assert.ok(typeof phase.estimatedDuration === 'number' && phase.estimatedDuration > 0);
    assert.ok(typeof phase.metrics === 'object');
    assert.ok(typeof phase.notes === 'string' && phase.notes.length > 0);
  }
});

test('dry-run returns stageAnalysis covering all five stages', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  const stages = result.lifecycle.stageAnalysis.map((p) => p.stage);
  for (const s of VALID_STAGES) {
    assert.ok(stages.includes(s), `should include stage ${s}`);
  }
});

test('dry-run returns refreshRecommendations with correct structure', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.lifecycle.refreshRecommendations));
  assert.ok(result.lifecycle.refreshRecommendations.length > 0);
  for (const rec of result.lifecycle.refreshRecommendations) {
    assert.ok(typeof rec.type === 'string' && rec.type.length > 0);
    assert.ok(['low', 'medium', 'high'].includes(rec.priority));
    assert.ok(typeof rec.description === 'string' && rec.description.length > 0);
    assert.ok(typeof rec.timing === 'string' && rec.timing.length > 0);
  }
});

test('dry-run returns performancePrediction as a string', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  assert.ok(typeof result.lifecycle.performancePrediction === 'string');
  assert.ok(result.lifecycle.performancePrediction.length > 0);
});

test('dry-run returns retirementSignals as a string array', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.lifecycle.retirementSignals));
  assert.ok(result.lifecycle.retirementSignals.length > 0);
  for (const sig of result.lifecycle.retirementSignals) {
    assert.ok(typeof sig === 'string' && sig.length > 0);
  }
});

test('dry-run returns recommendations as a string array', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.lifecycle.recommendations));
  assert.ok(result.lifecycle.recommendations.length > 0);
  for (const rec of result.lifecycle.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateLifecycleAnalysis({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.lifecycle.stageAnalysis.length > 0, `${platform} should produce stageAnalysis`);
  }
});

test('dry-run works for all lifecycle stages', async () => {
  for (const stage of VALID_STAGES) {
    const result = await generateLifecycleAnalysis({
      ...validInput,
      currentStage: stage,
      dryRun: true,
    });
    assert.ok(result.lifecycle.stageAnalysis.length > 0, `${stage} should produce stageAnalysis`);
    assert.equal(result.lifecycle.currentStage, stage);
  }
});

test('dry-run returns metrics with numeric values', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  for (const phase of result.lifecycle.stageAnalysis) {
    for (const [k, v] of Object.entries(phase.metrics)) {
      assert.ok(typeof k === 'string');
      assert.ok(typeof v === 'number' && Number.isFinite(v));
    }
  }
});

test('dry-run returns estimatedDuration as a positive integer', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  for (const phase of result.lifecycle.stageAnalysis) {
    assert.ok(Number.isInteger(phase.estimatedDuration));
    assert.ok(phase.estimatedDuration >= 1);
  }
});

test('dry-run output is deterministic for the same input', async () => {
  const r1 = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  const r2 = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  assert.deepEqual(r1, r2);
});

test('dry-run reflects currentStage in output', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, currentStage: 'maturity', dryRun: true });
  assert.equal(result.lifecycle.currentStage, 'maturity');
});

test('dry-run defaults currentStage to launch when not specified', async () => {
  const result = await generateLifecycleAnalysis({
    productOrBrand: 'A brand',
    creativeDescription: 'A creative description.',
    dryRun: true,
  });
  assert.equal(result.lifecycle.currentStage, 'launch');
});

test('generateLifecycleAnalysis rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateLifecycleAnalysis({ ...validInput, productOrBrand: '' } as AdCreativeLifecycleManagerInput),
    /invalid_ad_creative_lifecycle_manager_input/,
  );
});

test('generateLifecycleAnalysis rejects missing creativeDescription in dry-run mode', async () => {
  await assert.rejects(
    () => generateLifecycleAnalysis({ ...validInput, creativeDescription: '', dryRun: true } as AdCreativeLifecycleManagerInput),
    /invalid_ad_creative_lifecycle_manager_input/,
  );
});

test('generateLifecycleAnalysis rejects invalid currentStage in dry-run mode', async () => {
  await assert.rejects(
    () => generateLifecycleAnalysis({ ...validInput, currentStage: 'viral', dryRun: true } as AdCreativeLifecycleManagerInput),
    /invalid_ad_creative_lifecycle_manager_input/,
  );
});

test('generateLifecycleAnalysis rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateLifecycleAnalysis({ ...validInput, platform: 'snapchat', dryRun: true } as AdCreativeLifecycleManagerInput),
    /invalid_ad_creative_lifecycle_manager_input/,
  );
});

test('dry-run refreshRecommendations include at least one high-priority item for decline stage', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, currentStage: 'decline', dryRun: true });
  const highPriority = result.lifecycle.refreshRecommendations.filter((r) => r.priority === 'high');
  assert.ok(highPriority.length > 0, 'decline stage should have high-priority refresh recommendations');
});

test('dry-run stageAnalysis health varies across stages', async () => {
  const result = await generateLifecycleAnalysis({ ...validInput, dryRun: true });
  const healths = result.lifecycle.stageAnalysis.map((p) => p.health);
  const uniqueHealths = new Set(healths);
  assert.ok(uniqueHealths.size > 1, 'health should vary across stages');
});
