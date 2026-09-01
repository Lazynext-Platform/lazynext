import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Future-Pacing Designer engine (AI-powered
 * future-pacing copy design for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_FUTURE_PACING_DESIGNER_CREDIT_COST,
  validateAdCreativeFuturePacingDesignerInput,
  generateFuturePacing,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_OUTCOME_LENGTH,
  type AdCreativeFuturePacingDesignerInput,
} from '@/lib/creative/ad-creative-future-pacing-designer';

// ── Credit cost ──

test('AD_CREATIVE_FUTURE_PACING_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_FUTURE_PACING_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

test('MAX_OUTCOME_LENGTH is 2000', () => {
  assert.equal(MAX_OUTCOME_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeFuturePacingDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-34 interested in clean beauty',
  desiredOutcome: 'Glowing, even-toned skin in 30 days',
};

test('validateAdCreativeFuturePacingDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeFuturePacingDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeFuturePacingDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeFuturePacingDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeFuturePacingDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeFuturePacingDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeFuturePacingDesignerInput rejects missing desiredOutcome', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    desiredOutcome: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_outcome_required'));
});

test('validateAdCreativeFuturePacingDesignerInput rejects desiredOutcome over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    desiredOutcome: 'x'.repeat(MAX_OUTCOME_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_outcome_too_long'));
});

test('validateAdCreativeFuturePacingDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeFuturePacingDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeFuturePacingDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateAdCreativeFuturePacingDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateFuturePacing with dryRun: true so no real LLM
// calls are made — deterministic heuristic future-pacing content is returned.

test('dry-run returns a FuturePacingDesignerResult', async () => {
  const result = await generateFuturePacing({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.equal(result.dryRun, true);
});

test('dry-run returns futureScenarios array with at least 3 scenarios', async () => {
  const result = await generateFuturePacing({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.futureScenarios));
  assert.ok(result.futureScenarios.length >= 3);
});

test('dry-run returns scenarios with correct structure', async () => {
  const result = await generateFuturePacing({ ...validInput, dryRun: true });
  for (const scenario of result.futureScenarios) {
    assert.ok(typeof scenario.timeframe === 'string' && scenario.timeframe.length > 0);
    assert.ok(typeof scenario.scenario === 'string' && scenario.scenario.length > 0);
    assert.ok(typeof scenario.sensoryDetails === 'string' && scenario.sensoryDetails.length > 0);
    assert.ok(typeof scenario.emotionalPayoff === 'string' && scenario.emotionalPayoff.length > 0);
  }
});

test('dry-run returns adCopy with correct structure', async () => {
  const result = await generateFuturePacing({ ...validInput, dryRun: true });
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.hook === 'string' && result.adCopy.hook.length > 0);
  assert.ok(typeof result.adCopy.body === 'string' && result.adCopy.body.length > 0);
  assert.ok(typeof result.adCopy.cta === 'string' && result.adCopy.cta.length > 0);
});

test('dry-run returns a visualizationPrompt string', async () => {
  const result = await generateFuturePacing({ ...validInput, dryRun: true });
  assert.ok(typeof result.visualizationPrompt === 'string' && result.visualizationPrompt.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateFuturePacing({ ...validInput, dryRun: true });
  const b = await generateFuturePacing({ ...validInput, dryRun: true });
  assert.equal(a.futureScenarios.length, b.futureScenarios.length);
  assert.equal(a.futureScenarios[0].timeframe, b.futureScenarios[0].timeframe);
  assert.equal(a.adCopy.hook, b.adCopy.hook);
});

test('generateFuturePacing rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateFuturePacing({ ...validInput, productOrBrand: '' } as AdCreativeFuturePacingDesignerInput),
    /invalid_ad_creative_future_pacing_designer_input/,
  );
});

test('generateFuturePacing rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateFuturePacing({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeFuturePacingDesignerInput),
    /invalid_ad_creative_future_pacing_designer_input/,
  );
});

test('generateFuturePacing rejects missing desiredOutcome in dry-run mode', async () => {
  await assert.rejects(
    () => generateFuturePacing({ ...validInput, desiredOutcome: '', dryRun: true } as AdCreativeFuturePacingDesignerInput),
    /invalid_ad_creative_future_pacing_designer_input/,
  );
});

test('dry-run scenarios reference the brand or audience', async () => {
  const result = await generateFuturePacing({ ...validInput, dryRun: true });
  const allText = result.futureScenarios.map((s) => s.scenario).join(' ').toLowerCase();
  assert.ok(
    allText.includes('brand') || allText.includes('audience'),
    'scenarios should reference the brand or audience',
  );
});
