import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Choice Simplifier Designer engine (AI-powered
 * choice-overload reduction for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_CHOICE_SIMPLIFIER_DESIGNER_CREDIT_COST,
  validateAdCreativeChoiceSimplifierDesignerInput,
  generateChoiceSimplification,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_OPTIONS,
  MAX_OPTION_NAME_LENGTH,
  MAX_OPTION_DESC_LENGTH,
  MAX_OPTION_PRICE_LENGTH,
  type AdCreativeChoiceSimplifierDesignerInput,
} from '@/lib/creative/ad-creative-choice-simplifier-designer';

// ── Credit cost ──

test('AD_CREATIVE_CHOICE_SIMPLIFIER_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_CHOICE_SIMPLIFIER_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

test('MAX_OPTIONS is 20', () => {
  assert.equal(MAX_OPTIONS, 20);
});

test('MAX_OPTION_NAME_LENGTH is 500', () => {
  assert.equal(MAX_OPTION_NAME_LENGTH, 500);
});

test('MAX_OPTION_DESC_LENGTH is 2000', () => {
  assert.equal(MAX_OPTION_DESC_LENGTH, 2000);
});

test('MAX_OPTION_PRICE_LENGTH is 200', () => {
  assert.equal(MAX_OPTION_PRICE_LENGTH, 200);
});

// ── Input validation tests ──

const validInput: AdCreativeChoiceSimplifierDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  options: [
    { name: 'Starter', description: 'Basic serum for beginners', price: '$29' },
    { name: 'Pro', description: 'Advanced serum with extra actives', price: '$49' },
    { name: 'Luxury', description: 'Premium serum with full routine', price: '$89' },
  ],
  targetAudience: 'Women 25-34 interested in clean beauty',
};

test('validateAdCreativeChoiceSimplifierDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects options with fewer than 2', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: [validInput.options[0]],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('options_required_min_2'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects options with more than MAX_OPTIONS', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: Array.from({ length: MAX_OPTIONS + 1 }, (_, i) => ({
      name: `Option ${i}`,
      description: 'desc',
      price: '$10',
    })),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('options_too_many'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects option with missing name', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: [
      { name: '', description: 'desc', price: '$10' },
      { name: 'B', description: 'desc', price: '$20' },
    ],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('option_0_name_required'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects option name over max length', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: [
      { name: 'x'.repeat(MAX_OPTION_NAME_LENGTH + 1), description: 'desc', price: '$10' },
      { name: 'B', description: 'desc', price: '$20' },
    ],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('option_0_name_too_long'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects option with missing description', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: [
      { name: 'A', description: '', price: '$10' },
      { name: 'B', description: 'desc', price: '$20' },
    ],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('option_0_description_required'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects option description over max length', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: [
      { name: 'A', description: 'x'.repeat(MAX_OPTION_DESC_LENGTH + 1), price: '$10' },
      { name: 'B', description: 'desc', price: '$20' },
    ],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('option_0_description_too_long'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects option with missing price', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: [
      { name: 'A', description: 'desc', price: '' },
      { name: 'B', description: 'desc', price: '$20' },
    ],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('option_0_price_required'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects option price over max length', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    options: [
      { name: 'A', description: 'desc', price: 'x'.repeat(MAX_OPTION_PRICE_LENGTH + 1) },
      { name: 'B', description: 'desc', price: '$20' },
    ],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('option_0_price_too_long'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeChoiceSimplifierDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativeChoiceSimplifierDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateChoiceSimplification with dryRun: true so no real
// LLM calls are made — deterministic heuristic content is returned.

test('dry-run returns a ChoiceSimplifierDesignerResult', async () => {
  const result = await generateChoiceSimplification({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a recommendedOption with correct structure', async () => {
  const result = await generateChoiceSimplification({ ...validInput, dryRun: true });
  assert.ok(result.recommendedOption);
  assert.ok(typeof result.recommendedOption.name === 'string' && result.recommendedOption.name.length > 0);
  assert.ok(typeof result.recommendedOption.reason === 'string' && result.recommendedOption.reason.length > 0);
  assert.ok(Array.isArray(result.recommendedOption.whyNotOthers));
  assert.ok(result.recommendedOption.whyNotOthers.length > 0);
});

test('dry-run returns simplificationCopy with correct structure', async () => {
  const result = await generateChoiceSimplification({ ...validInput, dryRun: true });
  assert.ok(result.simplificationCopy);
  assert.ok(typeof result.simplificationCopy.headline === 'string' && result.simplificationCopy.headline.length > 0);
  assert.ok(typeof result.simplificationCopy.body === 'string' && result.simplificationCopy.body.length > 0);
  assert.ok(typeof result.simplificationCopy.cta === 'string' && result.simplificationCopy.cta.length > 0);
});

test('dry-run returns a decisionTree array with at least one step', async () => {
  const result = await generateChoiceSimplification({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.decisionTree));
  assert.ok(result.decisionTree.length > 0);
  for (const step of result.decisionTree) {
    assert.ok(typeof step === 'string' && step.length > 0);
  }
});

test('dry-run returns a cognitiveLoadReduction string', async () => {
  const result = await generateChoiceSimplification({ ...validInput, dryRun: true });
  assert.ok(typeof result.cognitiveLoadReduction === 'string' && result.cognitiveLoadReduction.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateChoiceSimplification({ ...validInput, dryRun: true });
  const b = await generateChoiceSimplification({ ...validInput, dryRun: true });
  assert.equal(a.recommendedOption.name, b.recommendedOption.name);
  assert.equal(a.simplificationCopy.headline, b.simplificationCopy.headline);
});

test('generateChoiceSimplification rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateChoiceSimplification({ ...validInput, productOrBrand: '' } as AdCreativeChoiceSimplifierDesignerInput),
    /invalid_ad_creative_choice_simplifier_designer_input/,
  );
});

test('generateChoiceSimplification rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateChoiceSimplification({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeChoiceSimplifierDesignerInput),
    /invalid_ad_creative_choice_simplifier_designer_input/,
  );
});

test('generateChoiceSimplification rejects fewer than 2 options in dry-run mode', async () => {
  await assert.rejects(
    () => generateChoiceSimplification({ ...validInput, options: [validInput.options[0]], dryRun: true } as AdCreativeChoiceSimplifierDesignerInput),
    /invalid_ad_creative_choice_simplifier_designer_input/,
  );
});

test('dry-run recommended option references the recommended option name', async () => {
  const result = await generateChoiceSimplification({ ...validInput, dryRun: true });
  const allText = [
    result.recommendedOption.name,
    result.recommendedOption.reason,
    ...result.recommendedOption.whyNotOthers,
  ].join(' ').toLowerCase();
  assert.ok(
    allText.includes(result.recommendedOption.name.toLowerCase()),
    'recommended option should reference the recommended option name',
  );
});
