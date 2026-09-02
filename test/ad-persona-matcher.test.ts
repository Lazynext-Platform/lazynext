import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Persona Matcher engine (AI-powered persona matching for
 * ad content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_PERSONA_MATCHER_CREDIT_COST,
  validateAdPersonaMatcherInput,
  generatePersonaMatches,
  VALID_PLATFORMS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_PERSONAS_LENGTH,
  type AdPersonaMatcherInput,
} from '@/lib/creative/ad-persona-matcher';

// ── Credit cost ──

test('AD_PERSONA_MATCHER_CREDIT_COST is 4', () => {
  assert.equal(AD_PERSONA_MATCHER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_PERSONAS_LENGTH is 500', () => {
  assert.equal(MAX_PERSONAS_LENGTH, 500);
});

// ── Input validation tests ──

const validInput: AdPersonaMatcherInput = {
  content: 'Discover the future of skincare with our vitamin C serum.',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  personas: 'beauty enthusiasts 18-25, busy moms 30-45, eco-conscious shoppers',
  platform: 'tiktok',
};

test('validateAdPersonaMatcherInput accepts a valid input', () => {
  const { valid, errors } = validateAdPersonaMatcherInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdPersonaMatcherInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdPersonaMatcherInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdPersonaMatcherInput rejects missing content', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdPersonaMatcherInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdPersonaMatcherInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdPersonaMatcherInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdPersonaMatcherInput rejects missing personas', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    personas: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('personas_required'));
});

test('validateAdPersonaMatcherInput rejects personas over 500 chars', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    personas: 'x'.repeat(MAX_PERSONAS_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('personas_too_long'));
});

test('validateAdPersonaMatcherInput rejects invalid platform', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdPersonaMatcherInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdPersonaMatcherInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    content: 'A great ad for our new product',
    productOrBrand: 'A fitness app',
    personas: 'fitness beginners, gym regulars',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdPersonaMatcherInput accepts empty platform string', () => {
  const { valid, errors } = validateAdPersonaMatcherInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generatePersonaMatches with dryRun: true so no real LLM
// calls are made — deterministic heuristic persona matches are returned.

test('dry-run returns a PersonaMatcherResult with matching', async () => {
  const result = await generatePersonaMatches({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.matching);
  assert.ok(Array.isArray(result.matching.personaMatches));
  assert.ok(result.matching.personaMatches.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns persona matches with correct structure', async () => {
  const result = await generatePersonaMatches({ ...validInput, dryRun: true });
  for (const pm of result.matching.personaMatches) {
    assert.ok(typeof pm.personaName === 'string' && pm.personaName.length > 0);
    assert.ok(typeof pm.matchScore === 'number' && pm.matchScore >= 0 && pm.matchScore <= 100);
    assert.ok(typeof pm.alignmentAnalysis === 'string' && pm.alignmentAnalysis.length > 0);
    assert.ok(Array.isArray(pm.contentAdjustments));
    assert.ok(typeof pm.resonance === 'number' && pm.resonance >= 1 && pm.resonance <= 10);
  }
});

test('dry-run returns one persona match per comma-separated persona', async () => {
  const result = await generatePersonaMatches({
    ...validInput,
    personas: 'beauty enthusiasts, busy moms, eco-conscious shoppers',
    dryRun: true,
  });
  assert.equal(result.matching.personaMatches.length, 3);
});

test('dry-run returns overallAlignment and bestMatchPersona', async () => {
  const result = await generatePersonaMatches({ ...validInput, dryRun: true });
  assert.ok(typeof result.matching.overallAlignment === 'number');
  assert.ok(result.matching.overallAlignment >= 0 && result.matching.overallAlignment <= 100);
  assert.ok(typeof result.matching.bestMatchPersona === 'string' && result.matching.bestMatchPersona.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generatePersonaMatches({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.matching.recommendations));
  assert.ok(result.matching.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generatePersonaMatches({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.matching.personaMatches.length > 0, `${platform} should produce persona matches`);
  }
});

test('generatePersonaMatches rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generatePersonaMatches({ ...validInput, content: '' } as AdPersonaMatcherInput),
    /invalid_ad_persona_matcher_input/,
  );
});

test('generatePersonaMatches rejects missing personas in dry-run mode', async () => {
  await assert.rejects(
    () => generatePersonaMatches({ ...validInput, personas: '', dryRun: true } as AdPersonaMatcherInput),
    /invalid_ad_persona_matcher_input/,
  );
});
