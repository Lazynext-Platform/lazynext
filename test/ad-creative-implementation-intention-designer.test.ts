import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Implementation-Intention Designer engine
 * (AI-powered if-then action plan design for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_IMPLEMENTATION_INTENTION_DESIGNER_CREDIT_COST,
  validateAdCreativeImplementationIntentionDesignerInput,
  generateImplementationIntentions,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_ACTION_LENGTH,
  MAX_CONTEXT_LENGTH,
  type AdCreativeImplementationIntentionDesignerInput,
} from '@/lib/creative/ad-creative-implementation-intention-designer';

// ── Credit cost ──

test('AD_CREATIVE_IMPLEMENTATION_INTENTION_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_IMPLEMENTATION_INTENTION_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

test('MAX_ACTION_LENGTH is 2000', () => {
  assert.equal(MAX_ACTION_LENGTH, 2000);
});

test('MAX_CONTEXT_LENGTH is 4000', () => {
  assert.equal(MAX_CONTEXT_LENGTH, 4000);
});

// ── Input validation tests ──

const validInput: AdCreativeImplementationIntentionDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-34 interested in clean beauty',
  desiredAction: 'Purchase the vitamin C serum starter kit',
  context: 'A 30-second TikTok ad with a hook, demo, and CTA.',
};

test('validateAdCreativeImplementationIntentionDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects missing desiredAction', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    desiredAction: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_action_required'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects desiredAction over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    desiredAction: 'x'.repeat(MAX_ACTION_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_action_too_long'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects missing context', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    context: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('context_required'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects context over 4000 chars', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    context: 'x'.repeat(MAX_CONTEXT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('context_too_long'));
});

test('validateAdCreativeImplementationIntentionDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeImplementationIntentionDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeImplementationIntentionDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateAdCreativeImplementationIntentionDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateImplementationIntentions with dryRun: true so no
// real LLM calls are made — deterministic heuristic if-then plans are returned.

test('dry-run returns an ImplementationIntentionDesignerResult', async () => {
  const result = await generateImplementationIntentions({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.equal(result.dryRun, true);
});

test('dry-run returns ifThenPlans array with at least 3 plans', async () => {
  const result = await generateImplementationIntentions({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.ifThenPlans));
  assert.ok(result.ifThenPlans.length >= 3);
});

test('dry-run returns ifThenPlans with correct structure', async () => {
  const result = await generateImplementationIntentions({ ...validInput, dryRun: true });
  for (const plan of result.ifThenPlans) {
    assert.ok(typeof plan.trigger === 'string' && plan.trigger.length > 0);
    assert.ok(typeof plan.action === 'string' && plan.action.length > 0);
    assert.ok(typeof plan.timing === 'string' && plan.timing.length > 0);
    assert.ok(typeof plan.frictionRemoval === 'string' && plan.frictionRemoval.length > 0);
  }
});

test('dry-run returns a bestPlan string', async () => {
  const result = await generateImplementationIntentions({ ...validInput, dryRun: true });
  assert.ok(typeof result.bestPlan === 'string' && result.bestPlan.length > 0);
});

test('dry-run returns adCopy with correct structure', async () => {
  const result = await generateImplementationIntentions({ ...validInput, dryRun: true });
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.hook === 'string' && result.adCopy.hook.length > 0);
  assert.ok(typeof result.adCopy.body === 'string' && result.adCopy.body.length > 0);
  assert.ok(typeof result.adCopy.cta === 'string' && result.adCopy.cta.length > 0);
});

test('dry-run returns a commitmentDevice string', async () => {
  const result = await generateImplementationIntentions({ ...validInput, dryRun: true });
  assert.ok(typeof result.commitmentDevice === 'string' && result.commitmentDevice.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateImplementationIntentions({ ...validInput, dryRun: true });
  const b = await generateImplementationIntentions({ ...validInput, dryRun: true });
  assert.equal(a.ifThenPlans.length, b.ifThenPlans.length);
  assert.equal(a.ifThenPlans[0].trigger, b.ifThenPlans[0].trigger);
  assert.equal(a.bestPlan, b.bestPlan);
});

test('generateImplementationIntentions rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateImplementationIntentions({ ...validInput, productOrBrand: '' } as AdCreativeImplementationIntentionDesignerInput),
    /invalid_ad_creative_implementation_intention_designer_input/,
  );
});

test('generateImplementationIntentions rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateImplementationIntentions({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeImplementationIntentionDesignerInput),
    /invalid_ad_creative_implementation_intention_designer_input/,
  );
});

test('generateImplementationIntentions rejects missing desiredAction in dry-run mode', async () => {
  await assert.rejects(
    () => generateImplementationIntentions({ ...validInput, desiredAction: '', dryRun: true } as AdCreativeImplementationIntentionDesignerInput),
    /invalid_ad_creative_implementation_intention_designer_input/,
  );
});

test('generateImplementationIntentions rejects missing context in dry-run mode', async () => {
  await assert.rejects(
    () => generateImplementationIntentions({ ...validInput, context: '', dryRun: true } as AdCreativeImplementationIntentionDesignerInput),
    /invalid_ad_creative_implementation_intention_designer_input/,
  );
});

test('dry-run plans reference the brand or audience', async () => {
  const result = await generateImplementationIntentions({ ...validInput, dryRun: true });
  const allText = result.ifThenPlans.map((p) => p.trigger).join(' ').toLowerCase();
  assert.ok(
    allText.includes('brand') || allText.includes('audience'),
    'plans should reference the brand or audience',
  );
});
