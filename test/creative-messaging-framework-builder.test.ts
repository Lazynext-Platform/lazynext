import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Messaging Framework Builder engine (AI-powered
 * messaging framework generation for ad campaigns).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_MESSAGING_FRAMEWORK_BUILDER_CREDIT_COST,
  validateCreativeMessagingFrameworkBuilderInput,
  generateMessagingFramework,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_VALUE_PROP_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeMessagingFrameworkBuilderInput,
} from '@/lib/creative/creative-messaging-framework-builder';

// ── Credit cost ──

test('CREATIVE_MESSAGING_FRAMEWORK_BUILDER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_MESSAGING_FRAMEWORK_BUILDER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_VALUE_PROP_LENGTH is 2000', () => {
  assert.equal(MAX_VALUE_PROP_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeMessagingFrameworkBuilderInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  valueProposition: 'Brightens dull skin in just 7 days with clinically-proven vitamin C.',
  targetAudience: 'Women 25-40 concerned about dull skin and early signs of aging',
  platform: 'tiktok',
};

test('validateCreativeMessagingFrameworkBuilderInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeMessagingFrameworkBuilderInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects missing valueProposition', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    valueProposition: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('value_proposition_required'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects valueProposition over 2000 chars', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    valueProposition: 'x'.repeat(MAX_VALUE_PROP_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('value_proposition_too_long'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeMessagingFrameworkBuilderInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeMessagingFrameworkBuilderInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    productOrBrand: 'A fitness app',
    valueProposition: 'Get fit in 15 minutes a day.',
    targetAudience: 'Busy professionals',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeMessagingFrameworkBuilderInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeMessagingFrameworkBuilderInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeMessagingFrameworkBuilderInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeMessagingFrameworkBuilderInput({
    productOrBrand: '',
    valueProposition: '',
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('value_proposition_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.length >= 3);
});

// ── Dry-run mode tests ──
//
// These tests run generateMessagingFramework with dryRun: true so no real LLM
// calls are made — deterministic heuristic framework content is returned.

test('dry-run returns a FrameworkBuilderResult with framework', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.framework);
  assert.ok(Array.isArray(result.framework.pillars));
  assert.ok(result.framework.pillars.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns pillars with correct structure', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  for (const p of result.framework.pillars) {
    assert.ok(typeof p.pillar === 'string' && p.pillar.length > 0);
    assert.ok(typeof p.description === 'string' && p.description.length > 0);
    assert.ok(typeof p.priority === 'number' && p.priority >= 1 && p.priority <= 10);
    assert.ok(typeof p.keyMessage === 'string' && p.keyMessage.length > 0);
  }
});

test('dry-run returns coreMessages with correct structure', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.framework.coreMessages));
  assert.ok(result.framework.coreMessages.length > 0);
  for (const m of result.framework.coreMessages) {
    assert.ok(typeof m.message === 'string' && m.message.length > 0);
    assert.ok(typeof m.audience === 'string' && m.audience.length > 0);
    assert.ok(typeof m.priority === 'number' && m.priority >= 1 && m.priority <= 10);
    assert.ok(typeof m.channel === 'string' && m.channel.length > 0);
  }
});

test('dry-run returns supportingPoints with correct structure', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.framework.supportingPoints));
  assert.ok(result.framework.supportingPoints.length > 0);
  for (const s of result.framework.supportingPoints) {
    assert.ok(typeof s.point === 'string' && s.point.length > 0);
    assert.ok(typeof s.supportsMessage === 'string' && s.supportsMessage.length > 0);
    assert.ok(typeof s.evidence === 'string' && s.evidence.length > 0);
  }
});

test('dry-run returns proofPoints with correct structure', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.framework.proofPoints));
  assert.ok(result.framework.proofPoints.length > 0);
  for (const p of result.framework.proofPoints) {
    assert.ok(typeof p.claim === 'string' && p.claim.length > 0);
    assert.ok(typeof p.proof === 'string' && p.proof.length > 0);
    assert.ok(typeof p.type === 'string' && p.type.length > 0);
  }
});

test('dry-run returns toneGuidelines with correct structure', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.framework.toneGuidelines));
  assert.ok(result.framework.toneGuidelines.length > 0);
  for (const g of result.framework.toneGuidelines) {
    assert.ok(typeof g.attribute === 'string' && g.attribute.length > 0);
    assert.ok(typeof g.description === 'string' && g.description.length > 0);
    assert.ok(typeof g.do === 'string' && g.do.length > 0);
    assert.ok(typeof g.dont === 'string' && g.dont.length > 0);
  }
});

test('dry-run returns a non-empty elevatorPitch string', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.ok(typeof result.framework.elevatorPitch === 'string');
  assert.ok(result.framework.elevatorPitch.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.framework.recommendations));
  assert.ok(result.framework.recommendations.length > 0);
  for (const rec of result.framework.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateMessagingFramework({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.framework.pillars.length > 0, `${platform} should produce pillars`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateMessagingFramework({
    productOrBrand: 'A SaaS tool',
    valueProposition: 'Saves teams 10 hours a week.',
    targetAudience: 'Operations managers',
    dryRun: true,
  });
  assert.ok(result.framework.pillars.length > 0);
  assert.ok(result.framework.coreMessages.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateMessagingFramework({ ...validInput, dryRun: true });
  const b = await generateMessagingFramework({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('generateMessagingFramework rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateMessagingFramework({ ...validInput, productOrBrand: '' } as CreativeMessagingFrameworkBuilderInput),
    /invalid_creative_messaging_framework_builder_input/,
  );
});

test('generateMessagingFramework rejects missing valueProposition in dry-run mode', async () => {
  await assert.rejects(
    () => generateMessagingFramework({ ...validInput, valueProposition: '', dryRun: true } as CreativeMessagingFrameworkBuilderInput),
    /invalid_creative_messaging_framework_builder_input/,
  );
});

test('generateMessagingFramework rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateMessagingFramework({ ...validInput, targetAudience: '', dryRun: true } as CreativeMessagingFrameworkBuilderInput),
    /invalid_creative_messaging_framework_builder_input/,
  );
});

test('generateMessagingFramework rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateMessagingFramework({ ...validInput, platform: 'snapchat', dryRun: true } as CreativeMessagingFrameworkBuilderInput),
    /invalid_creative_messaging_framework_builder_input/,
  );
});

test('generateMessagingFramework rejects invalid dryRun type', async () => {
  await assert.rejects(
    () => generateMessagingFramework({ ...validInput, dryRun: 'yes' as never } as CreativeMessagingFrameworkBuilderInput),
    /invalid_creative_messaging_framework_builder_input/,
  );
});

test('dry-run pillars have priorities in 1-10 range', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  for (const p of result.framework.pillars) {
    assert.ok(p.priority >= 1 && p.priority <= 10, `priority ${p.priority} out of range`);
  }
});

test('dry-run coreMessages have priorities in 1-10 range', async () => {
  const result = await generateMessagingFramework({ ...validInput, dryRun: true });
  for (const m of result.framework.coreMessages) {
    assert.ok(m.priority >= 1 && m.priority <= 10, `priority ${m.priority} out of range`);
  }
});

test('dry-run shapes content around the provided brand', async () => {
  const result = await generateMessagingFramework({
    productOrBrand: 'AcmeCorp',
    valueProposition: 'Saves time.',
    targetAudience: 'Busy founders',
    dryRun: true,
  });
  const allText = JSON.stringify(result.framework).toLowerCase();
  assert.ok(allText.includes('acmecorp'), 'framework should reference the brand');
});

test('dry-run shapes content around the provided audience', async () => {
  const result = await generateMessagingFramework({
    productOrBrand: 'AcmeCorp',
    valueProposition: 'Saves time.',
    targetAudience: 'Busy founders',
    dryRun: true,
  });
  const allText = JSON.stringify(result.framework).toLowerCase();
  assert.ok(allText.includes('founders'), 'framework should reference the audience');
});
