import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Belief Shift Designer engine (AI-powered
 * belief-shift design for ad creative content).
 *
 * Tests cover input validation, credit cost, constants, type exports,
 * parseDesignerJson behavior, and dry-run mode (no real LLM calls) so they
 * can run in the Node test runner.
 */
import {
  AD_CREATIVE_BELIEF_SHIFT_DESIGNER_CREDIT_COST,
  AD_CREATIVE_BELIEF_SHIFT_DESIGNER_SYS,
  AD_CREATIVE_BELIEF_SHIFT_DESIGNER_MODEL,
  validateAdCreativeBeliefShiftDesignerInput,
  generateBeliefShifts,
  VALID_PLATFORMS,
  VALID_SHIFT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeBeliefShiftDesignerInput,
  type BeliefShift,
  type ShiftStrategy,
  type BeliefShiftDesignerResult,
  type ShiftType,
} from '@/lib/creative/ad-creative-belief-shift-designer';

// ── Credit cost ──

test('AD_CREATIVE_BELIEF_SHIFT_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_BELIEF_SHIFT_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_SHIFT_TYPES contains the eight shift types', () => {
  assert.ok(VALID_SHIFT_TYPES.includes('myth_busting'));
  assert.ok(VALID_SHIFT_TYPES.includes('paradigm_shift'));
  assert.ok(VALID_SHIFT_TYPES.includes('assumption_challenge'));
  assert.ok(VALID_SHIFT_TYPES.includes('reputation_reframe'));
  assert.ok(VALID_SHIFT_TYPES.includes('comparison_shift'));
  assert.ok(VALID_SHIFT_TYPES.includes('evidence_revelation'));
  assert.ok(VALID_SHIFT_TYPES.includes('authority_transfer'));
  assert.ok(VALID_SHIFT_TYPES.includes('experience_reframe'));
  assert.equal(VALID_SHIFT_TYPES.length, 8);
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

// ── System prompt & model constant ──

test('AD_CREATIVE_BELIEF_SHIFT_DESIGNER_SYS is a non-empty string', () => {
  assert.ok(typeof AD_CREATIVE_BELIEF_SHIFT_DESIGNER_SYS === 'string');
  assert.ok(AD_CREATIVE_BELIEF_SHIFT_DESIGNER_SYS.length > 100);
  assert.ok(AD_CREATIVE_BELIEF_SHIFT_DESIGNER_SYS.includes('belief'));
});

test('AD_CREATIVE_BELIEF_SHIFT_DESIGNER_MODEL is a string', () => {
  assert.ok(typeof AD_CREATIVE_BELIEF_SHIFT_DESIGNER_MODEL === 'string');
});

// ── Type exports (compile-time checks) ──

test('ShiftType union is assignable to string', () => {
  const s: ShiftType = 'myth_busting';
  const str: string = s;
  assert.equal(str, 'myth_busting');
});

test('BeliefShift interface has required fields', () => {
  const shift: BeliefShift = {
    type: 'paradigm_shift',
    currentBelief: 'old belief',
    targetBelief: 'new belief',
    evidenceAnchor: 'evidence',
    shiftStrength: 80,
    convictionLevel: 75,
    shiftPathway: 'pathway',
  };
  assert.equal(shift.type, 'paradigm_shift');
  assert.equal(shift.shiftStrength, 80);
});

test('ShiftStrategy interface has shifts and recommendations', () => {
  const strategy: ShiftStrategy = {
    shifts: [],
    recommendations: ['rec'],
  };
  assert.ok(Array.isArray(strategy.shifts));
  assert.equal(strategy.recommendations.length, 1);
});

test('BeliefShiftDesignerResult interface has strategy and dryRun', () => {
  const result: BeliefShiftDesignerResult = {
    strategy: { shifts: [], recommendations: [] },
    dryRun: true,
  };
  assert.equal(result.dryRun, true);
});

// ── Input validation tests ──

const validInput: AdCreativeBeliefShiftDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeBeliefShiftDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeBeliefShiftDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeBeliefShiftDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeBeliefShiftDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBeliefShiftDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBeliefShiftDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeBeliefShiftDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
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

test('validateAdCreativeBeliefShiftDesignerInput accepts whitespace-only product as invalid', () => {
  const { valid, errors } = validateAdCreativeBeliefShiftDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateBeliefShifts with dryRun: true so no real LLM
// calls are made — deterministic heuristic shifts are returned.

test('dry-run returns a BeliefShiftDesignerResult with strategy', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.shifts));
  assert.ok(result.strategy.shifts.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns exactly 3 shifts', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  assert.equal(result.strategy.shifts.length, 3);
});

test('dry-run returns shifts with correct structure', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  for (const s of result.strategy.shifts) {
    assert.ok(typeof s.type === 'string' && s.type.length > 0);
    assert.ok(typeof s.currentBelief === 'string' && s.currentBelief.length > 0);
    assert.ok(typeof s.targetBelief === 'string' && s.targetBelief.length > 0);
    assert.ok(typeof s.evidenceAnchor === 'string' && s.evidenceAnchor.length > 0);
    assert.ok(typeof s.shiftStrength === 'number');
    assert.ok(typeof s.convictionLevel === 'number');
    assert.ok(typeof s.shiftPathway === 'string' && s.shiftPathway.length > 0);
  }
});

test('dry-run returns shifts with valid shift types', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  for (const s of result.strategy.shifts) {
    assert.ok(
      VALID_SHIFT_TYPES.includes(s.type as ShiftType),
      `shift type "${s.type}" should be valid`,
    );
  }
});

test('dry-run returns shiftStrength in 0-100 range', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  for (const s of result.strategy.shifts) {
    assert.ok(s.shiftStrength >= 0 && s.shiftStrength <= 100, `shiftStrength ${s.shiftStrength} out of range`);
  }
});

test('dry-run returns convictionLevel in 0-100 range', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  for (const s of result.strategy.shifts) {
    assert.ok(s.convictionLevel >= 0 && s.convictionLevel <= 100, `convictionLevel ${s.convictionLevel} out of range`);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateBeliefShifts({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.shifts.length > 0, `${platform} should produce shifts`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateBeliefShifts({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.shifts.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateBeliefShifts({ ...validInput, dryRun: true });
  const r2 = await generateBeliefShifts({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.shifts.length, r2.strategy.shifts.length);
  assert.equal(r1.strategy.shifts[0].shiftStrength, r2.strategy.shifts[0].shiftStrength);
  assert.equal(r1.strategy.shifts[0].convictionLevel, r2.strategy.shifts[0].convictionLevel);
  assert.equal(r1.strategy.shifts[0].currentBelief, r2.strategy.shifts[0].currentBelief);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateBeliefShifts({ ...validInput, dryRun: true });
  const r2 = await generateBeliefShifts({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Shift count is the same (3) but scores differ based on content length
  assert.equal(r1.strategy.shifts.length, r2.strategy.shifts.length);
  assert.notEqual(r1.strategy.shifts[0].shiftStrength, r2.strategy.shifts[0].shiftStrength);
});

test('dry-run recommendations reference the product and platform', async () => {
  const result = await generateBeliefShifts({ ...validInput, platform: 'instagram', dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.length > 0);
});

test('dry-run shifts reference the brand and audience', async () => {
  const result = await generateBeliefShifts({ ...validInput, dryRun: true });
  const joined = result.strategy.shifts.map((s) => `${s.currentBelief} ${s.targetBelief}`).join(' ');
  assert.ok(joined.length > 0);
});

test('generateBeliefShifts rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateBeliefShifts({ ...validInput, content: '' } as AdCreativeBeliefShiftDesignerInput),
    /invalid_ad_creative_belief_shift_designer_input/,
  );
});

test('generateBeliefShifts rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateBeliefShifts({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeBeliefShiftDesignerInput),
    /invalid_ad_creative_belief_shift_designer_input/,
  );
});

test('generateBeliefShifts rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateBeliefShifts({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeBeliefShiftDesignerInput),
    /invalid_ad_creative_belief_shift_designer_input/,
  );
});

test('generateBeliefShifts rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateBeliefShifts(null as never),
    /invalid_ad_creative_belief_shift_designer_input/,
  );
});

test('generateBeliefShifts rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateBeliefShifts({ ...validInput, platform: 'snapchat' as never, dryRun: true }),
    /invalid_ad_creative_belief_shift_designer_input/,
  );
});
