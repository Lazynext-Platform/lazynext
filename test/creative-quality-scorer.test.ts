import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Quality Scorer engine (AI-powered creative content
 * quality scoring across multiple dimensions).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_QUALITY_SCORER_CREDIT_COST,
  validateCreativeQualityScorerInput,
  generateQualityScore,
  VALID_PLATFORMS,
  VALID_CONTENT_TYPES,
  VALID_GRADES,
  VALID_SEVERITIES,
  DEFAULT_CONTENT_TYPE,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeQualityScorerInput,
} from '@/lib/creative/creative-quality-scorer';

// ── Credit cost ──

test('CREATIVE_QUALITY_SCORER_CREDIT_COST is 3', () => {
  assert.equal(CREATIVE_QUALITY_SCORER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_CONTENT_TYPES contains the five content types', () => {
  assert.ok(VALID_CONTENT_TYPES.includes('video-script'));
  assert.ok(VALID_CONTENT_TYPES.includes('image-ad'));
  assert.ok(VALID_CONTENT_TYPES.includes('carousel'));
  assert.ok(VALID_CONTENT_TYPES.includes('story'));
  assert.ok(VALID_CONTENT_TYPES.includes('text-ad'));
  assert.equal(VALID_CONTENT_TYPES.length, 5);
});

test('VALID_GRADES contains the six grades', () => {
  assert.ok(VALID_GRADES.includes('F'));
  assert.ok(VALID_GRADES.includes('D'));
  assert.ok(VALID_GRADES.includes('C'));
  assert.ok(VALID_GRADES.includes('B'));
  assert.ok(VALID_GRADES.includes('A'));
  assert.ok(VALID_GRADES.includes('A+'));
  assert.equal(VALID_GRADES.length, 6);
});

test('VALID_SEVERITIES contains the four severities', () => {
  assert.ok(VALID_SEVERITIES.includes('low'));
  assert.ok(VALID_SEVERITIES.includes('medium'));
  assert.ok(VALID_SEVERITIES.includes('high'));
  assert.ok(VALID_SEVERITIES.includes('critical'));
  assert.equal(VALID_SEVERITIES.length, 4);
});

test('DEFAULT_CONTENT_TYPE is text-ad', () => {
  assert.equal(DEFAULT_CONTENT_TYPE, 'text-ad');
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeQualityScorerInput = {
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  contentType: 'text-ad',
  platform: 'tiktok',
};

test('validateCreativeQualityScorerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeQualityScorerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeQualityScorerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeQualityScorerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeQualityScorerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeQualityScorerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeQualityScorerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeQualityScorerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeQualityScorerInput rejects invalid contentType', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    contentType: 'banner-ad' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_type_invalid'));
});

test('validateCreativeQualityScorerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeQualityScorerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeQualityScorerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeQualityScorerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeQualityScorerInput accepts empty contentType string', () => {
  const { valid, errors } = validateCreativeQualityScorerInput({
    ...validInput,
    contentType: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateQualityScore with dryRun: true so no real LLM
// calls are made — deterministic heuristic quality scores are returned.

test('dry-run returns a QualityScorerResult with scoring', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.scoring);
  assert.ok(typeof result.scoring.overallScore === 'number');
  assert.ok(Array.isArray(result.scoring.dimensions));
  assert.ok(result.scoring.dimensions.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns overallScore in 0-100 range', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  assert.ok(result.scoring.overallScore >= 0 && result.scoring.overallScore <= 100);
});

test('dry-run returns a valid grade', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  assert.ok(VALID_GRADES.includes(result.scoring.grade));
});

test('dry-run returns dimensions with correct structure', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  for (const d of result.scoring.dimensions) {
    assert.ok(typeof d.dimension === 'string' && d.dimension.length > 0);
    assert.ok(typeof d.score === 'number' && d.score >= 0 && d.score <= 100);
    assert.ok(typeof d.status === 'string' && d.status.length > 0);
    assert.ok(typeof d.notes === 'string' && d.notes.length > 0);
  }
});

test('dry-run returns issues with correct structure', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.scoring.issues));
  assert.ok(result.scoring.issues.length > 0);
  for (const issue of result.scoring.issues) {
    assert.ok(typeof issue.type === 'string' && issue.type.length > 0);
    assert.ok(VALID_SEVERITIES.includes(issue.severity));
    assert.ok(typeof issue.description === 'string' && issue.description.length > 0);
    assert.ok(typeof issue.fix === 'string' && issue.fix.length > 0);
  }
});

test('dry-run returns strengths and improvementSuggestions', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.scoring.strengths));
  assert.ok(result.scoring.strengths.length > 0);
  assert.ok(Array.isArray(result.scoring.improvementSuggestions));
  assert.ok(result.scoring.improvementSuggestions.length > 0);
});

test('dry-run returns qualityBreakdown as a record', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  assert.ok(result.scoring.qualityBreakdown);
  assert.ok(typeof result.scoring.qualityBreakdown === 'object');
  assert.ok(Object.keys(result.scoring.qualityBreakdown).length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateQualityScore({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.scoring.recommendations));
  assert.ok(result.scoring.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateQualityScore({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.scoring.dimensions.length > 0, `${platform} should produce dimensions`);
  }
});

test('dry-run works for all content types', async () => {
  for (const ct of VALID_CONTENT_TYPES) {
    const result = await generateQualityScore({
      ...validInput,
      contentType: ct,
      dryRun: true,
    });
    assert.ok(result.scoring.dimensions.length > 0, `${ct} should produce dimensions`);
  }
});

test('generateQualityScore rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateQualityScore({ ...validInput, content: '' } as CreativeQualityScorerInput),
    /invalid_creative_quality_scorer_input/,
  );
});

test('generateQualityScore rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateQualityScore({ ...validInput, productOrBrand: '', dryRun: true } as CreativeQualityScorerInput),
    /invalid_creative_quality_scorer_input/,
  );
});
