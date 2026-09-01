import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Hook-Story-Offer Designer engine (AI-powered
 * UGC Hook-Story-Offer structure design for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_HOOK_STORY_OFFER_DESIGNER_CREDIT_COST,
  validateAdCreativeHookStoryOfferDesignerInput,
  generateHookStoryOffer,
  VALID_PLATFORMS,
  VALID_HOOK_TYPES,
  VALID_STORY_ARCS,
  VALID_OFFER_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeHookStoryOfferDesignerInput,
} from '@/lib/creative/ad-creative-hook-story-offer-designer';

// ── Credit cost ──

test('AD_CREATIVE_HOOK_STORY_OFFER_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_HOOK_STORY_OFFER_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_HOOK_TYPES contains the eight hook types', () => {
  assert.ok(VALID_HOOK_TYPES.includes('question'));
  assert.ok(VALID_HOOK_TYPES.includes('bold_claim'));
  assert.ok(VALID_HOOK_TYPES.includes('pattern_interrupt'));
  assert.ok(VALID_HOOK_TYPES.includes('curiosity_gap'));
  assert.ok(VALID_HOOK_TYPES.includes('shocking_stat'));
  assert.ok(VALID_HOOK_TYPES.includes('relatable_pain'));
  assert.ok(VALID_HOOK_TYPES.includes('transformation'));
  assert.ok(VALID_HOOK_TYPES.includes('social_proof'));
  assert.equal(VALID_HOOK_TYPES.length, 8);
});

test('VALID_STORY_ARCS contains the six story arcs', () => {
  assert.ok(VALID_STORY_ARCS.includes('problem_agitation'));
  assert.ok(VALID_STORY_ARCS.includes('personal_journey'));
  assert.ok(VALID_STORY_ARCS.includes('before_after'));
  assert.ok(VALID_STORY_ARCS.includes('discovery'));
  assert.ok(VALID_STORY_ARCS.includes('testimony'));
  assert.ok(VALID_STORY_ARCS.includes('myth_busting'));
  assert.equal(VALID_STORY_ARCS.length, 6);
});

test('VALID_OFFER_TYPES contains the seven offer types', () => {
  assert.ok(VALID_OFFER_TYPES.includes('discount'));
  assert.ok(VALID_OFFER_TYPES.includes('bundle'));
  assert.ok(VALID_OFFER_TYPES.includes('free_trial'));
  assert.ok(VALID_OFFER_TYPES.includes('limited_time'));
  assert.ok(VALID_OFFER_TYPES.includes('bonus'));
  assert.ok(VALID_OFFER_TYPES.includes('guarantee'));
  assert.ok(VALID_OFFER_TYPES.includes('exclusive_access'));
  assert.equal(VALID_OFFER_TYPES.length, 7);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeHookStoryOfferDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-34 interested in clean beauty',
  platform: 'tiktok',
};

test('validateAdCreativeHookStoryOfferDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeHookStoryOfferDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeHookStoryOfferDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeHookStoryOfferDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeHookStoryOfferDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeHookStoryOfferDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeHookStoryOfferDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeHookStoryOfferDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeHookStoryOfferDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHookStoryOfferDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHookStoryOfferDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHookStoryOfferDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeHookStoryOfferDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateAdCreativeHookStoryOfferDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateHookStoryOffer with dryRun: true so no real LLM
// calls are made — deterministic heuristic Hook-Story-Offer copy is returned.

test('dry-run returns a HookStoryOfferDesignerResult with framework', async () => {
  const result = await generateHookStoryOffer({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.framework);
  assert.equal(result.dryRun, true);
});

test('dry-run returns framework with hook, story, and offer', async () => {
  const result = await generateHookStoryOffer({ ...validInput, dryRun: true });
  assert.ok(result.framework.hook);
  assert.ok(result.framework.story);
  assert.ok(result.framework.offer);
});

test('dry-run returns hook with copy and hookType', async () => {
  const result = await generateHookStoryOffer({ ...validInput, dryRun: true });
  assert.ok(typeof result.framework.hook.copy === 'string' && result.framework.hook.copy.length > 0);
  assert.ok(typeof result.framework.hook.hookType === 'string' && result.framework.hook.hookType.length > 0);
  assert.ok(VALID_HOOK_TYPES.includes(result.framework.hook.hookType as never));
});

test('dry-run returns story with copy and storyArc', async () => {
  const result = await generateHookStoryOffer({ ...validInput, dryRun: true });
  assert.ok(typeof result.framework.story.copy === 'string' && result.framework.story.copy.length > 0);
  assert.ok(typeof result.framework.story.storyArc === 'string' && result.framework.story.storyArc.length > 0);
  assert.ok(VALID_STORY_ARCS.includes(result.framework.story.storyArc as never));
});

test('dry-run returns offer with copy, offerType, and cta', async () => {
  const result = await generateHookStoryOffer({ ...validInput, dryRun: true });
  assert.ok(typeof result.framework.offer.copy === 'string' && result.framework.offer.copy.length > 0);
  assert.ok(typeof result.framework.offer.offerType === 'string' && result.framework.offer.offerType.length > 0);
  assert.ok(VALID_OFFER_TYPES.includes(result.framework.offer.offerType as never));
  assert.ok(typeof result.framework.offer.cta === 'string' && result.framework.offer.cta.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateHookStoryOffer({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.framework.hook, `${platform} should produce a framework`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateHookStoryOffer({
    productOrBrand: validInput.productOrBrand,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.framework.hook);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateHookStoryOffer({ ...validInput, dryRun: true });
  const b = await generateHookStoryOffer({ ...validInput, dryRun: true });
  assert.equal(a.framework.hook.copy, b.framework.hook.copy);
  assert.equal(a.framework.offer.cta, b.framework.offer.cta);
});

test('generateHookStoryOffer rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookStoryOffer({ ...validInput, productOrBrand: '' } as AdCreativeHookStoryOfferDesignerInput),
    /invalid_ad_creative_hook_story_offer_designer_input/,
  );
});

test('generateHookStoryOffer rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateHookStoryOffer({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeHookStoryOfferDesignerInput),
    /invalid_ad_creative_hook_story_offer_designer_input/,
  );
});

test('dry-run framework references the brand or audience', async () => {
  const result = await generateHookStoryOffer({ ...validInput, dryRun: true });
  const allText = [
    result.framework.hook.copy,
    result.framework.story.copy,
    result.framework.offer.copy,
  ].join(' ').toLowerCase();
  assert.ok(
    allText.includes('brand') || allText.includes('audience'),
    'framework should reference the brand or audience',
  );
});
