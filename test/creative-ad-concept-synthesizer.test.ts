import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Concept Synthesizer engine (AI-powered synthesis
 * of multiple ad concepts into a unified creative direction).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode (no
 * real LLM calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST,
  validateCreativeAdConceptSynthesizerInput,
  generateConceptSynthesis,
  VALID_PLATFORMS,
  MAX_CONCEPT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MAX_CONCEPTS,
  type CreativeAdConceptSynthesizerInput,
} from '@/lib/creative/creative-ad-concept-synthesizer';

// ── Credit cost ──

test('CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_CONCEPT_SYNTHESIZER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('MAX_CONCEPT_LENGTH is 2000', () => {
  assert.equal(MAX_CONCEPT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONCEPTS is 10', () => {
  assert.equal(MAX_CONCEPTS, 10);
});

// ── Input validation tests ──

const validInput: CreativeAdConceptSynthesizerInput = {
  concepts: [
    'A fast-paced UGC hook showing the product solving a real problem',
    'A cinematic brand story focused on aspiration and transformation',
    'A humorous skit poking fun at the competitor shortcomings',
  ],
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
};

test('validateCreativeAdConceptSynthesizerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdConceptSynthesizerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdConceptSynthesizerInput rejects missing concepts', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    concepts: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concepts_required'));
});

test('validateCreativeAdConceptSynthesizerInput rejects empty concepts array', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    concepts: [],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concepts_required'));
});

test('validateCreativeAdConceptSynthesizerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdConceptSynthesizerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdConceptSynthesizerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdConceptSynthesizerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdConceptSynthesizerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    concepts: 'A great ad concept for our new product',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdConceptSynthesizerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdConceptSynthesizerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    concepts: validInput.concepts,
    productOrBrand: validInput.productOrBrand,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdConceptSynthesizerInput accepts newline-separated string concepts', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    concepts: 'Concept one\nConcept two\nConcept three',
    productOrBrand: 'A fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdConceptSynthesizerInput rejects concepts over 2000 chars (array)', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    concepts: ['x'.repeat(MAX_CONCEPT_LENGTH + 1)],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_too_long'));
});

test('validateCreativeAdConceptSynthesizerInput rejects concepts over 2000 chars (string)', () => {
  const { valid, errors } = validateCreativeAdConceptSynthesizerInput({
    ...validInput,
    concepts: 'x'.repeat(MAX_CONCEPT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('concept_too_long'));
});

// ── Dry-run mode tests ──
//
// These tests run generateConceptSynthesis with dryRun: true so no real LLM
// calls are made — deterministic heuristic synthesis is returned.

test('dry-run returns a SynthesizerResult with synthesis', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.synthesis);
  assert.equal(result.dryRun, true);
});

test('dry-run returns a unifiedTheme string', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.ok(typeof result.synthesis.unifiedTheme === 'string');
  assert.ok(result.synthesis.unifiedTheme.length > 0);
});

test('dry-run returns mergedElements array with correct structure', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.synthesis.mergedElements));
  assert.ok(result.synthesis.mergedElements.length > 0);
  for (const el of result.synthesis.mergedElements) {
    assert.ok(typeof el.element === 'string' && el.element.length > 0);
    assert.ok(Array.isArray(el.sourceConcepts));
    assert.ok(typeof el.role === 'string' && el.role.length > 0);
    assert.ok(typeof el.priority === 'number');
    assert.ok(el.priority >= 1 && el.priority <= 10);
  }
});

test('dry-run returns creativeDirection with correct structure', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  const cd = result.synthesis.creativeDirection;
  assert.ok(cd);
  assert.ok(typeof cd.style === 'string' && cd.style.length > 0);
  assert.ok(typeof cd.tone === 'string' && cd.tone.length > 0);
  assert.ok(typeof cd.visualApproach === 'string' && cd.visualApproach.length > 0);
  assert.ok(typeof cd.narrativeArc === 'string' && cd.narrativeArc.length > 0);
});

test('dry-run returns differentiation string', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.ok(typeof result.synthesis.differentiation === 'string');
  assert.ok(result.synthesis.differentiation.length > 0);
});

test('dry-run returns executionGuidelines array', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.synthesis.executionGuidelines));
  assert.ok(result.synthesis.executionGuidelines.length > 0);
  for (const g of result.synthesis.executionGuidelines) {
    assert.ok(typeof g === 'string' && g.length > 0);
  }
});

test('dry-run returns recommendations array', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.synthesis.recommendations));
  assert.ok(result.synthesis.recommendations.length > 0);
  for (const r of result.synthesis.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateConceptSynthesis({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(
      result.synthesis.mergedElements.length > 0,
      `${platform} should produce mergedElements`,
    );
    assert.ok(
      result.synthesis.creativeDirection.visualApproach.includes(platform),
      `${platform} should appear in visualApproach`,
    );
  }
});

test('dry-run works without a platform (any)', async () => {
  const result = await generateConceptSynthesis({
    concepts: validInput.concepts,
    productOrBrand: validInput.productOrBrand,
    dryRun: true,
  });
  assert.ok(result.synthesis.mergedElements.length > 0);
  assert.ok(result.synthesis.unifiedTheme.includes('any'));
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateConceptSynthesis({ ...validInput, dryRun: true });
  const b = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run is deterministic across all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const a = await generateConceptSynthesis({ ...validInput, platform, dryRun: true });
    const b = await generateConceptSynthesis({ ...validInput, platform, dryRun: true });
    assert.deepEqual(a, b, `${platform} should be deterministic`);
  }
});

test('dry-run accepts newline-separated string concepts', async () => {
  const result = await generateConceptSynthesis({
    concepts: 'A UGC hook\nA cinematic story\nA humorous skit',
    productOrBrand: 'A fitness app',
    dryRun: true,
  });
  assert.ok(result.synthesis.mergedElements.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run reflects the number of concepts in mergedElements', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  // 3 concepts + 1 synthesized shared element (unshifted when >= 2 concepts)
  assert.ok(result.synthesis.mergedElements.length >= 3);
});

test('dry-run includes brand in unifiedTheme', async () => {
  const result = await generateConceptSynthesis({ ...validInput, dryRun: true });
  assert.ok(result.synthesis.unifiedTheme.length > 0);
});

test('dry-run includes platform in unifiedTheme', async () => {
  const result = await generateConceptSynthesis({ ...validInput, platform: 'instagram', dryRun: true });
  assert.ok(result.synthesis.unifiedTheme.includes('instagram'));
});

test('generateConceptSynthesis rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateConceptSynthesis({ ...validInput, concepts: '' } as CreativeAdConceptSynthesizerInput),
    /invalid_creative_ad_concept_synthesizer_input/,
  );
});

test('generateConceptSynthesis rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateConceptSynthesis({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdConceptSynthesizerInput),
    /invalid_creative_ad_concept_synthesizer_input/,
  );
});

test('generateConceptSynthesis rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateConceptSynthesis({ ...validInput, platform: 'snapchat', dryRun: true } as CreativeAdConceptSynthesizerInput),
    /invalid_creative_ad_concept_synthesizer_input/,
  );
});
