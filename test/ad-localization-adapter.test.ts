import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Localization Adapter engine (AI-powered cross-cultural ad
 * localization for regional and cultural markets).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_LOCALIZATION_ADAPTER_CREDIT_COST,
  validateAdLocalizationAdapterInput,
  generateLocalization,
  VALID_PLATFORMS,
  VALID_MARKETS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type AdLocalizationAdapterInput,
} from '@/lib/creative/ad-localization-adapter';

// ── Credit cost ──

test('AD_LOCALIZATION_ADAPTER_CREDIT_COST is 4', () => {
  assert.equal(AD_LOCALIZATION_ADAPTER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_MARKETS contains the eleven supported markets', () => {
  assert.ok(VALID_MARKETS.includes('us'));
  assert.ok(VALID_MARKETS.includes('uk'));
  assert.ok(VALID_MARKETS.includes('eu'));
  assert.ok(VALID_MARKETS.includes('cn'));
  assert.ok(VALID_MARKETS.includes('jp'));
  assert.ok(VALID_MARKETS.includes('kr'));
  assert.ok(VALID_MARKETS.includes('in'));
  assert.ok(VALID_MARKETS.includes('br'));
  assert.ok(VALID_MARKETS.includes('sea'));
  assert.ok(VALID_MARKETS.includes('mena'));
  assert.ok(VALID_MARKETS.includes('latam'));
  assert.equal(VALID_MARKETS.length, 11);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdLocalizationAdapterInput = {
  content: 'Check out our amazing new product — it is a game changer! Buy now and save 20%!',
  productOrBrand: 'GlowUp skincare',
  sourceMarket: 'us',
  targetMarket: 'jp',
};

test('validateAdLocalizationAdapterInput accepts a valid input', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdLocalizationAdapterInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdLocalizationAdapterInput rejects missing content', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdLocalizationAdapterInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdLocalizationAdapterInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdLocalizationAdapterInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdLocalizationAdapterInput rejects missing sourceMarket', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    sourceMarket: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('source_market_required'));
});

test('validateAdLocalizationAdapterInput rejects invalid sourceMarket', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    sourceMarket: 'canada' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('source_market_invalid'));
});

test('validateAdLocalizationAdapterInput rejects missing targetMarket', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    targetMarket: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_market_required'));
});

test('validateAdLocalizationAdapterInput rejects invalid targetMarket', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    targetMarket: 'canada' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_market_invalid'));
});

test('validateAdLocalizationAdapterInput rejects invalid platform', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdLocalizationAdapterInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdLocalizationAdapterInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdLocalizationAdapterInput({
    content: 'Buy our product now!',
    productOrBrand: 'GlowUp',
    sourceMarket: 'us',
    targetMarket: 'uk',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateLocalization with dryRun: true so no real LLM calls
// are made — deterministic heuristic localization is returned instead.

test('dry-run returns a LocalizationAdapterResult with a localization', async () => {
  const result = await generateLocalization({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.localization);
  assert.ok(typeof result.localization.localizedContent === 'string');
  assert.equal(result.dryRun, true);
});

test('dry-run returns localization with correct structure', async () => {
  const result = await generateLocalization({ ...validInput, dryRun: true });
  assert.ok(typeof result.localization.localizedContent === 'string' && result.localization.localizedContent.length > 0);
  assert.ok(Array.isArray(result.localization.culturalNotes));
  assert.ok(result.localization.culturalNotes.length > 0);
  assert.ok(Array.isArray(result.localization.idiomAdaptations));
  assert.ok(result.localization.idiomAdaptations.length > 0);
  assert.ok(Array.isArray(result.localization.colorSymbolConsiderations));
  assert.ok(result.localization.colorSymbolConsiderations.length > 0);
  assert.ok(Array.isArray(result.localization.complianceFlags));
  assert.ok(result.localization.complianceFlags.length > 0);
  assert.ok(typeof result.localization.toneAdjustment === 'string' && result.localization.toneAdjustment.length > 0);
  assert.ok(typeof result.localization.marketSpecificCTA === 'string' && result.localization.marketSpecificCTA.length > 0);
  assert.ok(Array.isArray(result.localization.recommendations));
  assert.ok(result.localization.recommendations.length > 0);
});

test('dry-run returns idiom adaptations with correct structure', async () => {
  const result = await generateLocalization({ ...validInput, dryRun: true });
  for (const idiom of result.localization.idiomAdaptations) {
    assert.ok(typeof idiom.original === 'string' && idiom.original.length > 0);
    assert.ok(typeof idiom.localized === 'string' && idiom.localized.length > 0);
    assert.ok(typeof idiom.reason === 'string' && idiom.reason.length > 0);
  }
});

test('dry-run works for all eleven target markets', async () => {
  for (const market of VALID_MARKETS) {
    const result = await generateLocalization({
      content: 'Check out our amazing new product!',
      productOrBrand: 'GlowUp',
      sourceMarket: 'us',
      targetMarket: market,
      dryRun: true,
    });
    assert.ok(result.localization.localizedContent.length > 0, `${market} should produce localized content`);
    assert.ok(result.localization.culturalNotes.length > 0, `${market} should produce cultural notes`);
  }
});

test('generateLocalization rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateLocalization({ ...validInput, content: '' } as AdLocalizationAdapterInput),
    /invalid_ad_localization_adapter_input/,
  );
});

test('generateLocalization rejects invalid sourceMarket in dry-run mode', async () => {
  await assert.rejects(
    () => generateLocalization({ ...validInput, sourceMarket: 'canada' as never, dryRun: true } as AdLocalizationAdapterInput),
    /invalid_ad_localization_adapter_input/,
  );
});

test('generateLocalization rejects invalid targetMarket in dry-run mode', async () => {
  await assert.rejects(
    () => generateLocalization({ ...validInput, targetMarket: 'canada' as never, dryRun: true } as AdLocalizationAdapterInput),
    /invalid_ad_localization_adapter_input/,
  );
});
