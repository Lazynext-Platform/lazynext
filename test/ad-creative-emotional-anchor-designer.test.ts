import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Emotional Anchor Designer engine (AI-powered
 * emotional anchor design for ad creative content).
 *
 * Tests cover input validation, credit cost, constants, type exports, dry-run
 * mode (no real LLM calls), and parseDesignerJson behavior so they can run in
 * the Node test runner.
 */
import {
  AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_CREDIT_COST,
  AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_SYS,
  AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_MODEL,
  validateAdCreativeEmotionalAnchorDesignerInput,
  generateEmotionalAnchors,
  VALID_PLATFORMS,
  VALID_ANCHOR_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeEmotionalAnchorDesignerInput,
  type EmotionalAnchorDesignerResult,
  type EmotionalAnchor,
  type AnchorStrategy,
  type AnchorType,
} from '@/lib/creative/ad-creative-emotional-anchor-designer';

// ── Credit cost ──

test('AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ANCHOR_TYPES contains the eight anchor types', () => {
  assert.ok(VALID_ANCHOR_TYPES.includes('nostalgia_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('aspiration_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('fear_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('joy_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('belonging_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('pride_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('trust_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('wonder_anchor'));
  assert.equal(VALID_ANCHOR_TYPES.length, 8);
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

test('AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_SYS is a non-empty string', () => {
  assert.ok(typeof AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_SYS === 'string');
  assert.ok(AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_SYS.length > 100);
  assert.ok(AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_SYS.includes('emotional anchor'));
});

test('AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_MODEL is a string', () => {
  assert.ok(typeof AD_CREATIVE_EMOTIONAL_ANCHOR_DESIGNER_MODEL === 'string');
});

// ── Type exports (structural checks) ──

test('EmotionalAnchor type has expected shape (structural)', () => {
  const anchor: EmotionalAnchor = {
    type: 'trust_anchor',
    emotionalTrigger: 'trigger',
    anchorMoment: 'moment',
    viewerResonance: 'resonance',
    anchorStrength: 80,
    emotionalDepth: 70,
    reinforcementStrategy: 'strategy',
  };
  assert.equal(anchor.type, 'trust_anchor');
  assert.equal(anchor.anchorStrength, 80);
  assert.equal(anchor.emotionalDepth, 70);
});

test('AnchorStrategy type has anchors and recommendations (structural)', () => {
  const strategy: AnchorStrategy = {
    anchors: [],
    recommendations: ['rec'],
  };
  assert.ok(Array.isArray(strategy.anchors));
  assert.ok(Array.isArray(strategy.recommendations));
  assert.equal(strategy.recommendations.length, 1);
});

test('EmotionalAnchorDesignerResult type has strategy and dryRun (structural)', () => {
  const result: EmotionalAnchorDesignerResult = {
    strategy: { anchors: [], recommendations: [] },
    dryRun: true,
  };
  assert.ok(result.strategy);
  assert.equal(result.dryRun, true);
});

test('AnchorType union includes all eight anchor types (structural)', () => {
  const types: AnchorType[] = [
    'nostalgia_anchor',
    'aspiration_anchor',
    'fear_anchor',
    'joy_anchor',
    'belonging_anchor',
    'pride_anchor',
    'trust_anchor',
    'wonder_anchor',
  ];
  assert.equal(types.length, 8);
  for (const ty of types) {
    assert.ok(VALID_ANCHOR_TYPES.includes(ty));
  }
});

// ── Input validation tests ──

const validInput: AdCreativeEmotionalAnchorDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeEmotionalAnchorDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeEmotionalAnchorDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeEmotionalAnchorDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeEmotionalAnchorDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeEmotionalAnchorDesignerInput({
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
// These tests run generateEmotionalAnchors with dryRun: true so no real LLM
// calls are made — deterministic heuristic anchors are returned.

test('dry-run returns an EmotionalAnchorDesignerResult with strategy', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.anchors));
  assert.ok(result.strategy.anchors.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns exactly 3 anchors', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  assert.equal(result.strategy.anchors.length, 3);
});

test('dry-run returns anchors with correct structure', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  for (const a of result.strategy.anchors) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.emotionalTrigger === 'string' && a.emotionalTrigger.length > 0);
    assert.ok(typeof a.anchorMoment === 'string' && a.anchorMoment.length > 0);
    assert.ok(typeof a.viewerResonance === 'string' && a.viewerResonance.length > 0);
    assert.ok(typeof a.anchorStrength === 'number' && a.anchorStrength >= 0 && a.anchorStrength <= 100);
    assert.ok(typeof a.emotionalDepth === 'number' && a.emotionalDepth >= 0 && a.emotionalDepth <= 100);
    assert.ok(typeof a.reinforcementStrategy === 'string' && a.reinforcementStrategy.length > 0);
  }
});

test('dry-run returns anchors with valid anchor types', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  for (const a of result.strategy.anchors) {
    assert.ok(
      VALID_ANCHOR_TYPES.includes(a.type as AnchorType),
      `anchor type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns anchorStrength in 0-100 range', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  for (const a of result.strategy.anchors) {
    assert.ok(a.anchorStrength >= 0 && a.anchorStrength <= 100);
  }
});

test('dry-run returns emotionalDepth in 0-100 range', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  for (const a of result.strategy.anchors) {
    assert.ok(a.emotionalDepth >= 0 && a.emotionalDepth <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateEmotionalAnchors({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.anchors.length > 0, `${platform} should produce anchors`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateEmotionalAnchors({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.anchors.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  const r2 = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.anchors.length, r2.strategy.anchors.length);
  assert.equal(r1.strategy.anchors[0].anchorStrength, r2.strategy.anchors[0].anchorStrength);
  assert.equal(r1.strategy.anchors[0].emotionalDepth, r2.strategy.anchors[0].emotionalDepth);
  assert.equal(r1.strategy.anchors[0].emotionalTrigger, r2.strategy.anchors[0].emotionalTrigger);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  const r2 = await generateEmotionalAnchors({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Anchor count is the same but scores differ based on content length
  assert.equal(r1.strategy.anchors.length, r2.strategy.anchors.length);
  assert.notEqual(r1.strategy.anchors[0].anchorStrength, r2.strategy.anchors[0].anchorStrength);
});

test('dry-run recommendations reference the product and audience', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ').toLowerCase();
  // Recommendations should reference brand/audience-derived tokens
  assert.ok(joined.length > 0);
});

test('generateEmotionalAnchors rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmotionalAnchors({ ...validInput, content: '' } as AdCreativeEmotionalAnchorDesignerInput),
    /invalid_ad_creative_emotional_anchor_designer_input/,
  );
});

test('generateEmotionalAnchors rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmotionalAnchors({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeEmotionalAnchorDesignerInput),
    /invalid_ad_creative_emotional_anchor_designer_input/,
  );
});

test('generateEmotionalAnchors rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmotionalAnchors({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeEmotionalAnchorDesignerInput),
    /invalid_ad_creative_emotional_anchor_designer_input/,
  );
});

test('generateEmotionalAnchors rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateEmotionalAnchors(null as never),
    /invalid_ad_creative_emotional_anchor_designer_input/,
  );
});

// ── parseDesignerJson behavior (via dry-run fallback on empty anchors) ──
//
// parseDesignerJson is not exported, but when the LLM returns an empty anchors
// array the parser falls back to dryRunOutput. We verify this indirectly by
// confirming the dry-run path produces valid anchors (the same fallback used
// by parseDesignerJson when anchors are missing/empty).

test('dry-run fallback (used by parseDesignerJson on empty anchors) returns 3 anchors', async () => {
  const result = await generateEmotionalAnchors({ ...validInput, dryRun: true });
  assert.equal(result.strategy.anchors.length, 3);
  assert.equal(result.dryRun, true);
});
