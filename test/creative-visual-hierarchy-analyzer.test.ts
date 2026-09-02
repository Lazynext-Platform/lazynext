import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Visual Hierarchy Analyzer engine (AI-powered visual
 * hierarchy analysis of ad creative layouts).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST,
  validateCreativeVisualHierarchyAnalyzerInput,
  generateHierarchyAnalysis,
  VALID_PLATFORMS,
  VALID_CONTENT_TYPES,
  DEFAULT_CONTENT_TYPE,
  MAX_LAYOUT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeVisualHierarchyAnalyzerInput,
} from '@/lib/creative/creative-visual-hierarchy-analyzer';

// ── Credit cost ──

test('CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_VISUAL_HIERARCHY_ANALYZER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CONTENT_TYPES contains the five content types', () => {
  assert.ok(VALID_CONTENT_TYPES.includes('video-script'));
  assert.ok(VALID_CONTENT_TYPES.includes('image-ad'));
  assert.ok(VALID_CONTENT_TYPES.includes('carousel'));
  assert.ok(VALID_CONTENT_TYPES.includes('story'));
  assert.ok(VALID_CONTENT_TYPES.includes('text-ad'));
  assert.equal(VALID_CONTENT_TYPES.length, 5);
});

test('DEFAULT_CONTENT_TYPE is text-ad', () => {
  assert.equal(DEFAULT_CONTENT_TYPE, 'text-ad');
});

test('MAX_LAYOUT_LENGTH is 2000', () => {
  assert.equal(MAX_LAYOUT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeVisualHierarchyAnalyzerInput = {
  layoutDescription:
    'Hero image at top (60% height), bold headline overlaid center, product shot bottom-left, CTA button bottom-right with high contrast.',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  contentType: 'image-ad',
  platform: 'tiktok',
};

test('validateCreativeVisualHierarchyAnalyzerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects missing layoutDescription', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    layoutDescription: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('layout_description_required'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects layoutDescription over 2000 chars', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    layoutDescription: 'x'.repeat(MAX_LAYOUT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('layout_description_too_long'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects whitespace-only layoutDescription', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    layoutDescription: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('layout_description_required'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects invalid contentType', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    contentType: 'banner-ad' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_type_invalid'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeVisualHierarchyAnalyzerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeVisualHierarchyAnalyzerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    layoutDescription: 'A layout with hero image and headline',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeVisualHierarchyAnalyzerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeVisualHierarchyAnalyzerInput accepts empty contentType string', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    contentType: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeVisualHierarchyAnalyzerInput accepts undefined contentType and platform', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    layoutDescription: 'A layout with hero image and headline',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeVisualHierarchyAnalyzerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeVisualHierarchyAnalyzerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateCreativeVisualHierarchyAnalyzerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateHierarchyAnalysis with dryRun: true so no real LLM
// calls are made — deterministic heuristic analysis is returned.

test('dry-run returns a HierarchyAnalyzerResult with analysis', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.analysis);
  assert.ok(typeof result.analysis.overallScore === 'number');
  assert.ok(Array.isArray(result.analysis.elements));
  assert.ok(result.analysis.elements.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns overallScore in 0-100 range', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  assert.ok(result.analysis.overallScore >= 0 && result.analysis.overallScore <= 100);
});

test('dry-run returns elements with correct structure', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  for (const el of result.analysis.elements) {
    assert.ok(typeof el.element === 'string' && el.element.length > 0);
    assert.ok(typeof el.priority === 'number' && el.priority >= 1 && el.priority <= 10);
    assert.ok(typeof el.attentionWeight === 'number' && el.attentionWeight >= 0 && el.attentionWeight <= 100);
    assert.ok(typeof el.role === 'string' && el.role.length > 0);
    assert.ok(typeof el.effectiveness === 'number' && el.effectiveness >= 0 && el.effectiveness <= 100);
  }
});

test('dry-run returns attentionFlow with correct structure', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.attentionFlow));
  assert.ok(result.analysis.attentionFlow.length > 0);
  for (const step of result.analysis.attentionFlow) {
    assert.ok(typeof step.step === 'number' && step.step >= 1);
    assert.ok(typeof step.element === 'string' && step.element.length > 0);
    assert.ok(typeof step.direction === 'string' && step.direction.length > 0);
    assert.ok(typeof step.duration === 'string' && step.duration.length > 0);
  }
});

test('dry-run returns focalPoints with correct structure', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.focalPoints));
  assert.ok(result.analysis.focalPoints.length > 0);
  for (const fp of result.analysis.focalPoints) {
    assert.ok(typeof fp.element === 'string' && fp.element.length > 0);
    assert.ok(typeof fp.strength === 'number' && fp.strength >= 0 && fp.strength <= 100);
    assert.ok(typeof fp.reason === 'string' && fp.reason.length > 0);
  }
});

test('dry-run returns balance with correct structure', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  assert.ok(result.analysis.balance);
  assert.ok(typeof result.analysis.balance.score === 'number' && result.analysis.balance.score >= 0 && result.analysis.balance.score <= 100);
  assert.ok(typeof result.analysis.balance.symmetry === 'string' && result.analysis.balance.symmetry.length > 0);
  assert.ok(typeof result.analysis.balance.weight === 'string' && result.analysis.balance.weight.length > 0);
  assert.ok(typeof result.analysis.balance.notes === 'string' && result.analysis.balance.notes.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.recommendations));
  assert.ok(result.analysis.recommendations.length > 0);
  for (const rec of result.analysis.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateHierarchyAnalysis({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.analysis.elements.length > 0, `${platform} should produce elements`);
  }
});

test('dry-run works for all content types', async () => {
  for (const ct of VALID_CONTENT_TYPES) {
    const result = await generateHierarchyAnalysis({
      ...validInput,
      contentType: ct,
      dryRun: true,
    });
    assert.ok(result.analysis.elements.length > 0, `${ct} should produce elements`);
  }
});

test('dry-run produces deterministic output for same input', async () => {
  const a = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  const b = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  assert.equal(a.analysis.overallScore, b.analysis.overallScore);
  assert.equal(a.analysis.elements.length, b.analysis.elements.length);
  assert.equal(a.analysis.balance.score, b.analysis.balance.score);
});

test('dry-run element priorities are sequential starting at 1', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  for (let i = 0; i < result.analysis.elements.length; i++) {
    assert.equal(result.analysis.elements[i].priority, i + 1);
  }
});

test('dry-run attention flow steps are sequential starting at 1', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  for (let i = 0; i < result.analysis.attentionFlow.length; i++) {
    assert.equal(result.analysis.attentionFlow[i].step, i + 1);
  }
});

test('dry-run focal point strengths decrease', async () => {
  const result = await generateHierarchyAnalysis({ ...validInput, dryRun: true });
  for (let i = 1; i < result.analysis.focalPoints.length; i++) {
    assert.ok(
      result.analysis.focalPoints[i].strength <= result.analysis.focalPoints[i - 1].strength,
      'focal point strengths should be non-increasing',
    );
  }
});

test('generateHierarchyAnalysis rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateHierarchyAnalysis({ ...validInput, layoutDescription: '' } as CreativeVisualHierarchyAnalyzerInput),
    /invalid_creative_visual_hierarchy_analyzer_input/,
  );
});

test('generateHierarchyAnalysis rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateHierarchyAnalysis({ ...validInput, productOrBrand: '', dryRun: true } as CreativeVisualHierarchyAnalyzerInput),
    /invalid_creative_visual_hierarchy_analyzer_input/,
  );
});

test('generateHierarchyAnalysis rejects over-length layoutDescription', async () => {
  await assert.rejects(
    () =>
      generateHierarchyAnalysis({
        ...validInput,
        layoutDescription: 'x'.repeat(MAX_LAYOUT_LENGTH + 1),
        dryRun: true,
      } as CreativeVisualHierarchyAnalyzerInput),
    /invalid_creative_visual_hierarchy_analyzer_input/,
  );
});

test('generateHierarchyAnalysis rejects invalid contentType', async () => {
  await assert.rejects(
    () =>
      generateHierarchyAnalysis({
        ...validInput,
        contentType: 'invalid-type' as never,
        dryRun: true,
      } as CreativeVisualHierarchyAnalyzerInput),
    /invalid_creative_visual_hierarchy_analyzer_input/,
  );
});

test('generateHierarchyAnalysis rejects invalid platform', async () => {
  await assert.rejects(
    () =>
      generateHierarchyAnalysis({
        ...validInput,
        platform: 'myspace' as never,
        dryRun: true,
      } as CreativeVisualHierarchyAnalyzerInput),
    /invalid_creative_visual_hierarchy_analyzer_input/,
  );
});
