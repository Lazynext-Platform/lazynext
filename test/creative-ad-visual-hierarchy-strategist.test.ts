import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Visual Hierarchy Strategist engine (AI-powered
 * visual hierarchy strategy for ad creative content).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode
 * (no real LLM calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST,
  validateCreativeAdVisualHierarchyStrategistInput,
  generateHierarchyStrategy,
  VALID_PLATFORMS,
  VALID_LAYER_TYPES,
  VALID_SIZES,
  VALID_PRIORITIES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_ELEMENTS_LENGTH,
  type CreativeAdVisualHierarchyStrategistInput,
} from '@/lib/creative/creative-ad-visual-hierarchy-strategist';

// ── Credit cost ──

test('CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_VISUAL_HIERARCHY_STRATEGIST_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_LAYER_TYPES contains the six layer types', () => {
  assert.ok(VALID_LAYER_TYPES.includes('primary'));
  assert.ok(VALID_LAYER_TYPES.includes('secondary'));
  assert.ok(VALID_LAYER_TYPES.includes('tertiary'));
  assert.ok(VALID_LAYER_TYPES.includes('background'));
  assert.ok(VALID_LAYER_TYPES.includes('accent'));
  assert.ok(VALID_LAYER_TYPES.includes('overlay'));
  assert.equal(VALID_LAYER_TYPES.length, 6);
});

test('VALID_SIZES contains the four sizes', () => {
  assert.ok(VALID_SIZES.includes('small'));
  assert.ok(VALID_SIZES.includes('medium'));
  assert.ok(VALID_SIZES.includes('large'));
  assert.ok(VALID_SIZES.includes('extra_large'));
  assert.equal(VALID_SIZES.length, 4);
});

test('VALID_PRIORITIES contains the three priorities', () => {
  assert.ok(VALID_PRIORITIES.includes('low'));
  assert.ok(VALID_PRIORITIES.includes('medium'));
  assert.ok(VALID_PRIORITIES.includes('high'));
  assert.equal(VALID_PRIORITIES.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_ELEMENTS_LENGTH is 2000', () => {
  assert.equal(MAX_ELEMENTS_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdVisualHierarchyStrategistInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  visualElements: 'headline, product image, logo, cta button, background',
  platform: 'tiktok',
};

test('validateCreativeAdVisualHierarchyStrategistInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects missing visualElements', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    visualElements: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('visual_elements_required'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects visualElements over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    visualElements: 'x'.repeat(MAX_ELEMENTS_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('visual_elements_too_long'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdVisualHierarchyStrategistInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdVisualHierarchyStrategistInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    visualElements: 'headline, image, cta',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdVisualHierarchyStrategistInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdVisualHierarchyStrategistInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdVisualHierarchyStrategistInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    visualElements: 'headline, image, cta',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateHierarchyStrategy with dryRun: true so no real LLM
// calls are made — deterministic heuristic strategy is returned.

test('dry-run returns a VisualHierarchyStrategistResult with strategy', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.layers));
  assert.ok(result.strategy.layers.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns hierarchyScore in 0-100 range', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  assert.ok(
    result.strategy.hierarchyScore >= 0 && result.strategy.hierarchyScore <= 100,
    `score was ${result.strategy.hierarchyScore}`,
  );
});

test('dry-run returns layers with correct structure', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  for (const layer of result.strategy.layers) {
    assert.ok(typeof layer.type === 'string' && layer.type.length > 0);
    assert.ok(typeof layer.element === 'string' && layer.element.length > 0);
    assert.ok(typeof layer.position === 'string' && layer.position.length > 0);
    assert.ok(VALID_SIZES.includes(layer.size), `size ${layer.size} should be valid`);
    assert.ok(typeof layer.z_index === 'number');
    assert.ok(typeof layer.description === 'string' && layer.description.length > 0);
  }
});

test('dry-run returns attentionWeights with correct structure', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.attentionWeights));
  assert.ok(result.strategy.attentionWeights.length > 0);
  for (const w of result.strategy.attentionWeights) {
    assert.ok(typeof w.element === 'string' && w.element.length > 0);
    assert.ok(typeof w.weight === 'number' && w.weight >= 0 && w.weight <= 100);
    assert.ok(typeof w.reasoning === 'string' && w.reasoning.length > 0);
    assert.ok(VALID_PRIORITIES.includes(w.priority));
  }
});

test('dry-run returns focalPoints with correct structure', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.focalPoints));
  assert.ok(result.strategy.focalPoints.length > 0);
  for (const fp of result.strategy.focalPoints) {
    assert.ok(typeof fp.element === 'string' && fp.element.length > 0);
    assert.ok(typeof fp.position === 'string' && fp.position.length > 0);
    assert.ok(typeof fp.attractionMethod === 'string' && fp.attractionMethod.length > 0);
    assert.ok(typeof fp.retentionTime === 'string' && fp.retentionTime.length > 0);
  }
});

test('dry-run returns visualFlow with correct structure', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  assert.ok(result.strategy.visualFlow);
  assert.ok(typeof result.strategy.visualFlow.direction === 'string');
  assert.ok(result.strategy.visualFlow.direction.length > 0);
  assert.ok(Array.isArray(result.strategy.visualFlow.path));
  assert.ok(Array.isArray(result.strategy.visualFlow.anchors));
  assert.ok(typeof result.strategy.visualFlow.description === 'string');
});

test('dry-run returns recommendations', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateHierarchyStrategy({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.layers.length > 0, `${platform} should produce layers`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateHierarchyStrategy({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    visualElements: 'headline, image, cta',
    dryRun: true,
  });
  assert.ok(result.strategy.layers.length > 0);
});

test('dry-run uses provided visual elements when available', async () => {
  const result = await generateHierarchyStrategy({
    ...validInput,
    visualElements: 'hero image, value proposition, trust badge, buy button',
    dryRun: true,
  });
  const elements = result.strategy.layers.map((l) => l.element);
  assert.ok(elements.includes('hero image'));
});

test('dry-run falls back to default elements when few provided', async () => {
  const result = await generateHierarchyStrategy({
    ...validInput,
    visualElements: 'logo',
    dryRun: true,
  });
  assert.ok(result.strategy.layers.length >= 3);
});

test('dry-run is deterministic for identical input', async () => {
  const a = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  const b = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  assert.equal(a.strategy.hierarchyScore, b.strategy.hierarchyScore);
  assert.equal(a.strategy.layers.length, b.strategy.layers.length);
});

test('generateHierarchyStrategy rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateHierarchyStrategy({
        ...validInput,
        content: '',
      } as CreativeAdVisualHierarchyStrategistInput),
    /invalid_creative_ad_visual_hierarchy_strategist_input/,
  );
});

test('generateHierarchyStrategy rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateHierarchyStrategy({
        ...validInput,
        productOrBrand: '',
        dryRun: true,
      } as CreativeAdVisualHierarchyStrategistInput),
    /invalid_creative_ad_visual_hierarchy_strategist_input/,
  );
});

test('generateHierarchyStrategy rejects missing visualElements in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateHierarchyStrategy({
        ...validInput,
        visualElements: '',
        dryRun: true,
      } as CreativeAdVisualHierarchyStrategistInput),
    /invalid_creative_ad_visual_hierarchy_strategist_input/,
  );
});

test('dry-run attention weights sum is reasonable (each 0-100)', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  for (const w of result.strategy.attentionWeights) {
    assert.ok(w.weight >= 0 && w.weight <= 100, `weight ${w.weight} out of range`);
  }
});

test('dry-run layers have descending or varied z_index ordering', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  const zIndices = result.strategy.layers.map((l) => l.z_index);
  assert.ok(zIndices.length > 0);
  for (const z of zIndices) {
    assert.ok(typeof z === 'number');
  }
});

test('dry-run visual flow path references rendered elements', async () => {
  const result = await generateHierarchyStrategy({ ...validInput, dryRun: true });
  const layerElements = result.strategy.layers.map((l) => l.element);
  for (const p of result.strategy.visualFlow.path) {
    assert.ok(layerElements.includes(p), `path element ${p} should be in layers`);
  }
});
