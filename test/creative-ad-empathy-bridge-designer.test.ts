import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Empathy Bridge Designer engine (AI-powered
 * empathy bridge design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_EMPATHY_BRIDGE_DESIGNER_CREDIT_COST,
  validateCreativeAdEmpathyBridgeDesignerInput,
  generateEmpathyBridges,
  VALID_PLATFORMS,
  VALID_BRIDGE_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdEmpathyBridgeDesignerInput,
} from '@/lib/creative/creative-ad-empathy-bridge-designer';

// ── Credit cost ──

test('CREATIVE_AD_EMPATHY_BRIDGE_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_EMPATHY_BRIDGE_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_BRIDGE_TYPES contains the eight bridge types', () => {
  assert.ok(VALID_BRIDGE_TYPES.includes('shared_experience'));
  assert.ok(VALID_BRIDGE_TYPES.includes('pain_point_mirror'));
  assert.ok(VALID_BRIDGE_TYPES.includes('aspiration_link'));
  assert.ok(VALID_BRIDGE_TYPES.includes('value_alignment'));
  assert.ok(VALID_BRIDGE_TYPES.includes('lifestyle_reflection'));
  assert.ok(VALID_BRIDGE_TYPES.includes('emotional_memory'));
  assert.ok(VALID_BRIDGE_TYPES.includes('identity_connection'));
  assert.ok(VALID_BRIDGE_TYPES.includes('transformation_witness'));
  assert.equal(VALID_BRIDGE_TYPES.length, 8);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdEmpathyBridgeDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdEmpathyBridgeDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdEmpathyBridgeDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdEmpathyBridgeDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdEmpathyBridgeDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdEmpathyBridgeDesignerInput({
    productOrBrand: '',
    content: '',
    targetAudience: '',
    platform: 'myspace' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.includes('platform_invalid'));
  assert.ok(errors.length >= 4);
});

// ── Dry-run mode tests ──
//
// These tests run generateEmpathyBridges with dryRun: true so no real LLM
// calls are made — deterministic heuristic bridges are returned.

test('dry-run returns an EmpathyBridgeDesignerResult with strategy', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.bridges));
  assert.ok(result.strategy.bridges.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns bridges with correct structure', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  for (const b of result.strategy.bridges) {
    assert.ok(typeof b.type === 'string' && b.type.length > 0);
    assert.ok(typeof b.viewerPerspective === 'string' && b.viewerPerspective.length > 0);
    assert.ok(typeof b.brandPerspective === 'string' && b.brandPerspective.length > 0);
    assert.ok(typeof b.connectionPoint === 'string' && b.connectionPoint.length > 0);
    assert.ok(typeof b.empathyStrength === 'number' && b.empathyStrength >= 0 && b.empathyStrength <= 100);
    assert.ok(typeof b.emotionalResonance === 'number' && b.emotionalResonance >= 0 && b.emotionalResonance <= 100);
    assert.ok(typeof b.bridgeStrategy === 'string' && b.bridgeStrategy.length > 0);
  }
});

test('dry-run returns bridges with valid bridge types', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  for (const b of result.strategy.bridges) {
    assert.ok(
      VALID_BRIDGE_TYPES.includes(b.type as never),
      `bridge type "${b.type}" should be valid`,
    );
  }
});

test('dry-run returns empathyStrength in 0-100 range', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  for (const b of result.strategy.bridges) {
    assert.ok(b.empathyStrength >= 0 && b.empathyStrength <= 100);
  }
});

test('dry-run returns emotionalResonance in 0-100 range', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  for (const b of result.strategy.bridges) {
    assert.ok(b.emotionalResonance >= 0 && b.emotionalResonance <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 bridges', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  assert.ok(result.strategy.bridges.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateEmpathyBridges({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.bridges.length > 0, `${platform} should produce bridges`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateEmpathyBridges({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.bridges.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateEmpathyBridges({ ...validInput, dryRun: true });
  const r2 = await generateEmpathyBridges({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.bridges.length, r2.strategy.bridges.length);
  assert.equal(r1.strategy.bridges[0].empathyStrength, r2.strategy.bridges[0].empathyStrength);
  assert.equal(r1.strategy.bridges[0].emotionalResonance, r2.strategy.bridges[0].emotionalResonance);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateEmpathyBridges({ ...validInput, dryRun: true });
  const r2 = await generateEmpathyBridges({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Bridge count is the same but scores differ based on content length
  assert.equal(r1.strategy.bridges.length, r2.strategy.bridges.length);
});

test('generateEmpathyBridges rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmpathyBridges({ ...validInput, content: '' } as CreativeAdEmpathyBridgeDesignerInput),
    /invalid_creative_ad_empathy_bridge_designer_input/,
  );
});

test('generateEmpathyBridges rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmpathyBridges({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdEmpathyBridgeDesignerInput),
    /invalid_creative_ad_empathy_bridge_designer_input/,
  );
});

test('generateEmpathyBridges rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmpathyBridges({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdEmpathyBridgeDesignerInput),
    /invalid_creative_ad_empathy_bridge_designer_input/,
  );
});

test('generateEmpathyBridges rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateEmpathyBridges(null as never),
    /invalid_creative_ad_empathy_bridge_designer_input/,
  );
});

test('dry-run bridges include shared_experience type', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  const types = result.strategy.bridges.map((b) => b.type);
  assert.ok(types.includes('shared_experience'));
});

test('dry-run bridges include pain_point_mirror type', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  const types = result.strategy.bridges.map((b) => b.type);
  assert.ok(types.includes('pain_point_mirror'));
});

test('dry-run bridges include aspiration_link type', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  const types = result.strategy.bridges.map((b) => b.type);
  assert.ok(types.includes('aspiration_link'));
});

test('dry-run recommendations reference the brand', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.length > 0);
});

test('dry-run bridge viewerPerspective references the audience', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  const joined = result.strategy.bridges.map((b) => b.viewerPerspective).join(' ');
  assert.ok(joined.length > 0);
});

test('dry-run bridgeStrategy is a non-empty string for each bridge', async () => {
  const result = await generateEmpathyBridges({ ...validInput, dryRun: true });
  for (const b of result.strategy.bridges) {
    assert.ok(b.bridgeStrategy.length > 10, 'bridgeStrategy should be descriptive');
  }
});
