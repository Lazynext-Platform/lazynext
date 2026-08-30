import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Brand Voice Analyzer engine (AI-powered brand voice and tone
 * analysis from sample content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  BRAND_VOICE_ANALYZER_CREDIT_COST,
  validateBrandVoiceAnalyzerInput,
  analyzeBrandVoice,
  VALID_TONES,
  MAX_BRAND_NAME_LENGTH,
  MIN_SAMPLE_LENGTH,
  MAX_SAMPLE_LENGTH,
  type BrandVoiceAnalyzerInput,
} from '@/lib/creative/brand-voice-analyzer';

// ── Credit cost ──

test('BRAND_VOICE_ANALYZER_CREDIT_COST is 4', () => {
  assert.equal(BRAND_VOICE_ANALYZER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_TONES contains the four supported tones', () => {
  assert.ok(VALID_TONES.includes('formal'));
  assert.ok(VALID_TONES.includes('casual'));
  assert.ok(VALID_TONES.includes('playful'));
  assert.ok(VALID_TONES.includes('authoritative'));
});

test('MAX_BRAND_NAME_LENGTH is 200', () => {
  assert.equal(MAX_BRAND_NAME_LENGTH, 200);
});

test('MIN_SAMPLE_LENGTH is 100 and MAX_SAMPLE_LENGTH is 10000', () => {
  assert.equal(MIN_SAMPLE_LENGTH, 100);
  assert.equal(MAX_SAMPLE_LENGTH, 10_000);
});

// ── Input validation tests ──

const validSample = 'x'.repeat(MIN_SAMPLE_LENGTH + 50);
const validInput: BrandVoiceAnalyzerInput = {
  brandName: 'Glow & Co.',
  sampleContent: validSample,
};

test('validateBrandVoiceAnalyzerInput accepts a valid input', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateBrandVoiceAnalyzerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateBrandVoiceAnalyzerInput rejects missing brandName', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput({
    ...validInput,
    brandName: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_name_required'));
});

test('validateBrandVoiceAnalyzerInput rejects brandName over MAX_BRAND_NAME_LENGTH', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput({
    ...validInput,
    brandName: 'x'.repeat(MAX_BRAND_NAME_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_name_too_long'));
});

test('validateBrandVoiceAnalyzerInput rejects missing sampleContent', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput({
    ...validInput,
    sampleContent: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('sample_content_required'));
});

test('validateBrandVoiceAnalyzerInput rejects sampleContent under MIN_SAMPLE_LENGTH', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput({
    ...validInput,
    sampleContent: 'x'.repeat(MIN_SAMPLE_LENGTH - 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('sample_content_too_short'));
});

test('validateBrandVoiceAnalyzerInput rejects sampleContent over MAX_SAMPLE_LENGTH', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput({
    ...validInput,
    sampleContent: 'x'.repeat(MAX_SAMPLE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('sample_content_too_long'));
});

test('validateBrandVoiceAnalyzerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateBrandVoiceAnalyzerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

// ── Dry-run mode tests ──
//
// These tests run analyzeBrandVoice with dryRun: true so no real LLM calls
// are made — deterministic heuristic voice profiles are returned instead.

test('dry-run returns a BrandVoiceAnalyzerResult with a voiceProfile', async () => {
  const result = await analyzeBrandVoice({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.voiceProfile);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a voiceProfile with correct structure', async () => {
  const result = await analyzeBrandVoice({ ...validInput, dryRun: true });
  const vp = result.voiceProfile;
  assert.ok(VALID_TONES.includes(vp.tone));
  assert.ok(Array.isArray(vp.personalityTraits));
  assert.ok(vp.personalityTraits.length > 0);
  assert.ok(typeof vp.vocabularyLevel === 'string' && vp.vocabularyLevel.length > 0);
  assert.ok(typeof vp.sentenceStructure === 'string' && vp.sentenceStructure.length > 0);
  assert.ok(Array.isArray(vp.doList));
  assert.ok(vp.doList.length > 0);
  assert.ok(Array.isArray(vp.dontList));
  assert.ok(vp.dontList.length > 0);
  assert.ok(typeof vp.consistencyScore === 'number');
  assert.ok(vp.consistencyScore >= 0 && vp.consistencyScore <= 100);
  assert.ok(typeof vp.grade === 'string' && vp.grade.length > 0);
});

test('dry-run echoes the brand name', async () => {
  const result = await analyzeBrandVoice({ ...validInput, dryRun: true });
  assert.equal(result.brandName, validInput.brandName);
});

test('dry-run detects formal tone from formal markers', async () => {
  const formalSample =
    'Pursuant to our agreement, we must therefore outline the terms. Furthermore, the aforementioned ' +
    'parties shall henceforth comply with all provisions. This is a formal corporate communication. ' +
    'Thank you for your attention to this matter.'.slice(0, 300);
  const result = await analyzeBrandVoice({
    brandName: 'FormalCorp',
    sampleContent: formalSample.padEnd(MIN_SAMPLE_LENGTH + 10, '.'),
    dryRun: true,
  });
  assert.equal(result.voiceProfile.tone, 'formal');
});

test('dry-run detects playful tone from exclamation markers', async () => {
  const playfulSample =
    'OMG you guys!! This is so exciting!! Yay!! We just launched the best thing ever!! Woohoo!! ' +
    'You are going to love it so much!! Fun! Fun! Fun!'.padEnd(MIN_SAMPLE_LENGTH + 10, '!');
  const result = await analyzeBrandVoice({
    brandName: 'FunBrand',
    sampleContent: playfulSample,
    dryRun: true,
  });
  assert.equal(result.voiceProfile.tone, 'playful');
});

test('dry-run detects authoritative tone from assertive markers', async () => {
  const authoritativeSample =
    'You must always use proven strategies. We guarantee results. We are the leading provider. ' +
    'Never settle for less. Our methods are guaranteed to work. Always choose the best. ' +
    'Proven. Leading. Guaranteed.'.padEnd(MIN_SAMPLE_LENGTH + 10, '.');
  const result = await analyzeBrandVoice({
    brandName: 'AuthorityBrand',
    sampleContent: authoritativeSample,
    dryRun: true,
  });
  assert.equal(result.voiceProfile.tone, 'authoritative');
});

test('dry-run consistencyScore is within 0-100', async () => {
  const result = await analyzeBrandVoice({ ...validInput, dryRun: true });
  assert.ok(result.voiceProfile.consistencyScore >= 0);
  assert.ok(result.voiceProfile.consistencyScore <= 100);
});

test('analyzeBrandVoice rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => analyzeBrandVoice({ ...validInput, brandName: '' } as BrandVoiceAnalyzerInput),
    /invalid_brand_voice_analyzer_input/,
  );
});

test('analyzeBrandVoice rejects short sample content in dry-run mode', async () => {
  await assert.rejects(
    () => analyzeBrandVoice({ ...validInput, sampleContent: 'too short', dryRun: true } as BrandVoiceAnalyzerInput),
    /invalid_brand_voice_analyzer_input/,
  );
});
