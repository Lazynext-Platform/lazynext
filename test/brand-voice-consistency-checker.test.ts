import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Brand Voice Consistency Checker engine (AI-powered brand
 * voice consistency checking for creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST,
  validateBrandVoiceConsistencyCheckerInput,
  checkBrandVoiceConsistency,
  VALID_PLATFORMS,
  VALID_GRADES,
  VALID_STATUSES,
  VALID_SEVERITIES,
  MAX_CONTENT_LENGTH,
  MAX_BRAND_NAME_LENGTH,
  MAX_VOICE_DESCRIPTION_LENGTH,
  type BrandVoiceConsistencyCheckerInput,
} from '@/lib/creative/brand-voice-consistency-checker';

// ── Credit cost ──

test('BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST is 4', () => {
  assert.equal(BRAND_VOICE_CONSISTENCY_CHECKER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
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

test('VALID_STATUSES contains the three statuses', () => {
  assert.ok(VALID_STATUSES.includes('pass'));
  assert.ok(VALID_STATUSES.includes('warning'));
  assert.ok(VALID_STATUSES.includes('fail'));
  assert.equal(VALID_STATUSES.length, 3);
});

test('VALID_SEVERITIES contains the three severities', () => {
  assert.ok(VALID_SEVERITIES.includes('low'));
  assert.ok(VALID_SEVERITIES.includes('medium'));
  assert.ok(VALID_SEVERITIES.includes('high'));
  assert.equal(VALID_SEVERITIES.length, 3);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_BRAND_NAME_LENGTH is 2000', () => {
  assert.equal(MAX_BRAND_NAME_LENGTH, 2000);
});

test('MAX_VOICE_DESCRIPTION_LENGTH is 1000', () => {
  assert.equal(MAX_VOICE_DESCRIPTION_LENGTH, 1000);
});

// ── Input validation tests ──

const validInput: BrandVoiceConsistencyCheckerInput = {
  content: 'HEY FAM! Check out our AMAZING new product LOL you will LOVE it!!!',
  brandName: 'Lumina Skincare',
  brandVoiceDescription: 'Professional, warm, and science-backed. Uses clear, accessible language.',
};

test('validateBrandVoiceConsistencyCheckerInput accepts a valid input', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateBrandVoiceConsistencyCheckerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects missing content', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects missing brandName', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    brandName: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_name_required'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects brandName over 2000 chars', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    brandName: 'x'.repeat(MAX_BRAND_NAME_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_name_too_long'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects missing brandVoiceDescription', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    brandVoiceDescription: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_voice_description_required'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects brandVoiceDescription over 1000 chars', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    brandVoiceDescription: 'x'.repeat(MAX_VOICE_DESCRIPTION_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_voice_description_too_long'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects invalid platform', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateBrandVoiceConsistencyCheckerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateBrandVoiceConsistencyCheckerInput accepts input with only required fields', () => {
  const { valid, errors } = validateBrandVoiceConsistencyCheckerInput({
    content: 'Our new product is here.',
    brandName: 'Acme',
    brandVoiceDescription: 'Friendly and professional.',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run checkBrandVoiceConsistency with dryRun: true so no real
// LLM calls are made — deterministic heuristic checks are returned instead.

test('dry-run returns a VoiceConsistencyResult with check', async () => {
  const result = await checkBrandVoiceConsistency({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.check);
  assert.equal(result.dryRun, true);
});

test('dry-run returns check with correct structure', async () => {
  const result = await checkBrandVoiceConsistency({ ...validInput, dryRun: true });
  const check = result.check;
  assert.ok(typeof check.overallConsistency === 'number');
  assert.ok(check.overallConsistency >= 0 && check.overallConsistency <= 100);
  assert.ok(typeof check.grade === 'string');
  assert.ok(VALID_GRADES.includes(check.grade));
  assert.ok(Array.isArray(check.voiceDimensions));
  assert.ok(check.voiceDimensions.length > 0);
  assert.ok(Array.isArray(check.violations));
  assert.ok(typeof check.correctedContent === 'string');
  assert.ok(typeof check.brandAlignment === 'number');
  assert.ok(check.brandAlignment >= 1 && check.brandAlignment <= 10);
  assert.ok(typeof check.toneMatch === 'number');
  assert.ok(check.toneMatch >= 1 && check.toneMatch <= 10);
  assert.ok(typeof check.vocabularyAlignment === 'number');
  assert.ok(check.vocabularyAlignment >= 1 && check.vocabularyAlignment <= 10);
  assert.ok(Array.isArray(check.recommendations));
});

test('dry-run returns voiceDimensions with correct structure', async () => {
  const result = await checkBrandVoiceConsistency({ ...validInput, dryRun: true });
  for (const dim of result.check.voiceDimensions) {
    assert.ok(typeof dim.dimension === 'string' && dim.dimension.length > 0);
    assert.ok(typeof dim.score === 'number');
    assert.ok(dim.score >= 0 && dim.score <= 100);
    assert.ok(VALID_STATUSES.includes(dim.status));
  }
});

test('dry-run returns violations with correct structure', async () => {
  const result = await checkBrandVoiceConsistency({ ...validInput, dryRun: true });
  for (const violation of result.check.violations) {
    assert.ok(typeof violation.type === 'string');
    assert.ok(typeof violation.excerpt === 'string');
    assert.ok(typeof violation.suggestion === 'string');
    assert.ok(VALID_SEVERITIES.includes(violation.severity));
  }
});

test('dry-run detects all-caps violations', async () => {
  const result = await checkBrandVoiceConsistency({
    content: 'BUY NOW! AMAZING DEAL! INCREDIBLE OFFER!',
    brandName: 'TestBrand',
    brandVoiceDescription: 'Professional and measured.',
    dryRun: true,
  });
  assert.ok(result.check.violations.length > 0);
  const hasToneViolation = result.check.violations.some((v) => v.type === 'tone');
  assert.ok(hasToneViolation);
});

test('dry-run detects slang violations', async () => {
  const result = await checkBrandVoiceConsistency({
    content: 'yo fam this product is lit lol',
    brandName: 'TestBrand',
    brandVoiceDescription: 'Professional and formal.',
    dryRun: true,
  });
  assert.ok(result.check.violations.length > 0);
  const hasVocabViolation = result.check.violations.some((v) => v.type === 'vocabulary');
  assert.ok(hasVocabViolation);
});

test('dry-run returns correctedContent', async () => {
  const result = await checkBrandVoiceConsistency({ ...validInput, dryRun: true });
  assert.ok(result.check.correctedContent.length > 0);
});

test('dry-run works with optional platform', async () => {
  const result = await checkBrandVoiceConsistency({
    ...validInput,
    platform: 'instagram',
    dryRun: true,
  });
  assert.ok(result.check.overallConsistency >= 0);
});

test('checkBrandVoiceConsistency rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => checkBrandVoiceConsistency({ ...validInput, content: '' } as BrandVoiceConsistencyCheckerInput),
    /invalid_brand_voice_consistency_checker_input/,
  );
});

test('checkBrandVoiceConsistency rejects missing brandVoiceDescription in dry-run mode', async () => {
  await assert.rejects(
    () => checkBrandVoiceConsistency({ ...validInput, brandVoiceDescription: '', dryRun: true } as BrandVoiceConsistencyCheckerInput),
    /invalid_brand_voice_consistency_checker_input/,
  );
});

test('checkBrandVoiceConsistency rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => checkBrandVoiceConsistency({ ...validInput, platform: 'snapchat' as never, dryRun: true } as BrandVoiceConsistencyCheckerInput),
    /invalid_brand_voice_consistency_checker_input/,
  );
});
