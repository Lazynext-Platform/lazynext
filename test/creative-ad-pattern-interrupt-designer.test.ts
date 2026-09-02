import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Pattern Interrupt Designer engine (AI-powered
 * pattern interrupt design for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_PATTERN_INTERRUPT_DESIGNER_CREDIT_COST,
  validateCreativeAdPatternInterruptDesignerInput,
  generatePatternInterrupts,
  VALID_PLATFORMS,
  VALID_INTERRUPT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_CONTEXT_LENGTH,
  type CreativeAdPatternInterruptDesignerInput,
} from '@/lib/creative/creative-ad-pattern-interrupt-designer';

// ── Credit cost ──

test('CREATIVE_AD_PATTERN_INTERRUPT_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_PATTERN_INTERRUPT_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_INTERRUPT_TYPES contains the eight interrupt types', () => {
  assert.ok(VALID_INTERRUPT_TYPES.includes('visual_break'));
  assert.ok(VALID_INTERRUPT_TYPES.includes('audio_shift'));
  assert.ok(VALID_INTERRUPT_TYPES.includes('text_overlay'));
  assert.ok(VALID_INTERRUPT_TYPES.includes('scene_cut'));
  assert.ok(VALID_INTERRUPT_TYPES.includes('color_flash'));
  assert.ok(VALID_INTERRUPT_TYPES.includes('motion_stop'));
  assert.ok(VALID_INTERRUPT_TYPES.includes('silence'));
  assert.ok(VALID_INTERRUPT_TYPES.includes('unexpected_question'));
  assert.equal(VALID_INTERRUPT_TYPES.length, 8);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

test('MAX_CONTEXT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTEXT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdPatternInterruptDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-34 interested in clean beauty',
  context: 'A 15-second TikTok ad opening with a product demo then a testimonial and CTA.',
  platform: 'tiktok',
};

test('validateCreativeAdPatternInterruptDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdPatternInterruptDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects missing context', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    context: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('context_required'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects context over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    context: 'x'.repeat(MAX_CONTEXT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('context_too_long'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdPatternInterruptDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdPatternInterruptDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
    context: 'A 30s YouTube ad with a hook, demo, and CTA.',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPatternInterruptDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPatternInterruptDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
    context: 'A 30s YouTube ad with a hook, demo, and CTA.',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPatternInterruptDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdPatternInterruptDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateCreativeAdPatternInterruptDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generatePatternInterrupts with dryRun: true so no real LLM
// calls are made — deterministic heuristic interrupts are returned.

test('dry-run returns an InterruptDesignerResult with strategy', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.interrupts));
  assert.ok(result.strategy.interrupts.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns interrupts with correct structure', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  for (const intr of result.strategy.interrupts) {
    assert.ok(typeof intr.type === 'string' && intr.type.length > 0);
    assert.ok(VALID_INTERRUPT_TYPES.includes(intr.type as never));
    assert.ok(typeof intr.description === 'string' && intr.description.length > 0);
    assert.ok(typeof intr.attentionScore === 'number');
    assert.ok(intr.attentionScore >= 0 && intr.attentionScore <= 100);
    assert.ok(typeof intr.implementation === 'string' && intr.implementation.length > 0);
    assert.ok(typeof intr.expectedLift === 'string' && intr.expectedLift.length > 0);
    assert.ok(typeof intr.timing === 'string' && intr.timing.length > 0);
  }
});

test('dry-run returns attentionScore in 0-100 range', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  for (const intr of result.strategy.interrupts) {
    assert.ok(intr.attentionScore >= 0 && intr.attentionScore <= 100);
  }
});

test('dry-run returns at least 3 interrupts', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  assert.ok(result.strategy.interrupts.length >= 3);
});

test('dry-run returns recommendations', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePatternInterrupts({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.interrupts.length > 0, `${platform} should produce interrupts`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generatePatternInterrupts({
    productOrBrand: validInput.productOrBrand,
    targetAudience: validInput.targetAudience,
    context: validInput.context,
    dryRun: true,
  });
  assert.ok(result.strategy.interrupts.length > 0);
});

test('dry-run interrupts have varied types', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  const types = new Set(result.strategy.interrupts.map((i) => i.type));
  assert.ok(types.size > 1, 'interrupts should not all be the same type');
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generatePatternInterrupts({ ...validInput, dryRun: true });
  const b = await generatePatternInterrupts({ ...validInput, dryRun: true });
  assert.equal(a.strategy.interrupts.length, b.strategy.interrupts.length);
  assert.equal(a.strategy.interrupts[0].type, b.strategy.interrupts[0].type);
  assert.equal(a.strategy.interrupts[0].attentionScore, b.strategy.interrupts[0].attentionScore);
});

test('generatePatternInterrupts rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePatternInterrupts({ ...validInput, productOrBrand: '' } as CreativeAdPatternInterruptDesignerInput),
    /invalid_creative_ad_pattern_interrupt_designer_input/,
  );
});

test('generatePatternInterrupts rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generatePatternInterrupts({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdPatternInterruptDesignerInput),
    /invalid_creative_ad_pattern_interrupt_designer_input/,
  );
});

test('generatePatternInterrupts rejects missing context in dry-run mode', async () => {
  await assert.rejects(
    () => generatePatternInterrupts({ ...validInput, context: '', dryRun: true } as CreativeAdPatternInterruptDesignerInput),
    /invalid_creative_ad_pattern_interrupt_designer_input/,
  );
});

test('dry-run interrupt descriptions reference the brand or audience', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  const allDescriptions = result.strategy.interrupts.map((i) => i.description).join(' ').toLowerCase();
  assert.ok(
    allDescriptions.includes('brand') || allDescriptions.includes('audience'),
    'descriptions should reference the brand or audience',
  );
});

test('dry-run recommendations are non-empty strings', async () => {
  const result = await generatePatternInterrupts({ ...validInput, dryRun: true });
  for (const rec of result.strategy.recommendations) {
    assert.ok(rec.length > 10, `recommendation too short: "${rec}"`);
  }
});
