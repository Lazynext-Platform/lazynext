import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Sound Design Strategist engine (AI-powered sound
 * design strategy for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST,
  validateAdCreativeSoundDesignStrategistInput,
  generateSoundDesign,
  VALID_PLATFORMS,
  VALID_MOODS,
  VALID_LAYER_TYPES,
  VALID_EMOTIONAL_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_MOOD_LENGTH,
  type AdCreativeSoundDesignStrategistInput,
} from '@/lib/creative/ad-creative-sound-design-strategist';

// ── Credit cost ──

test('AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_SOUND_DESIGN_STRATEGIST_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_MOODS contains the ten supported moods', () => {
  assert.ok(VALID_MOODS.includes('energetic'));
  assert.ok(VALID_MOODS.includes('calm'));
  assert.ok(VALID_MOODS.includes('mysterious'));
  assert.ok(VALID_MOODS.includes('playful'));
  assert.ok(VALID_MOODS.includes('dramatic'));
  assert.ok(VALID_MOODS.includes('uplifting'));
  assert.ok(VALID_MOODS.includes('melancholic'));
  assert.ok(VALID_MOODS.includes('tense'));
  assert.ok(VALID_MOODS.includes('joyful'));
  assert.ok(VALID_MOODS.includes('epic'));
  assert.equal(VALID_MOODS.length, 10);
});

test('VALID_LAYER_TYPES contains the six layer types', () => {
  assert.ok(VALID_LAYER_TYPES.includes('music'));
  assert.ok(VALID_LAYER_TYPES.includes('sfx'));
  assert.ok(VALID_LAYER_TYPES.includes('voiceover'));
  assert.ok(VALID_LAYER_TYPES.includes('ambient'));
  assert.ok(VALID_LAYER_TYPES.includes('foley'));
  assert.ok(VALID_LAYER_TYPES.includes('silence'));
  assert.equal(VALID_LAYER_TYPES.length, 6);
});

test('VALID_EMOTIONAL_IMPACTS contains the three impacts', () => {
  assert.ok(VALID_EMOTIONAL_IMPACTS.includes('low'));
  assert.ok(VALID_EMOTIONAL_IMPACTS.includes('medium'));
  assert.ok(VALID_EMOTIONAL_IMPACTS.includes('high'));
  assert.equal(VALID_EMOTIONAL_IMPACTS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_MOOD_LENGTH is 2000', () => {
  assert.equal(MAX_MOOD_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeSoundDesignStrategistInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  mood: 'energetic',
  platform: 'tiktok',
};

test('validateAdCreativeSoundDesignStrategistInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeSoundDesignStrategistInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects missing mood', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    mood: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('mood_required'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects mood over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    mood: 'x'.repeat(MAX_MOOD_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('mood_too_long'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeSoundDesignStrategistInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeSoundDesignStrategistInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    mood: 'uplifting',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSoundDesignStrategistInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSoundDesignStrategistInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeSoundDesignStrategistInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    mood: 'calm',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateSoundDesign with dryRun: true so no real LLM
// calls are made — deterministic heuristic sound design is returned.

test('dry-run returns a SoundDesignStrategistResult with strategy', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.layers));
  assert.ok(result.strategy.layers.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns soundDesignScore in 0-100 range', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(
    result.strategy.soundDesignScore >= 0 && result.strategy.soundDesignScore <= 100,
    `score ${result.strategy.soundDesignScore} out of range`,
  );
});

test('dry-run returns layers with correct structure', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  for (const layer of result.strategy.layers) {
    assert.ok(typeof layer.type === 'string' && layer.type.length > 0);
    assert.ok(typeof layer.description === 'string' && layer.description.length > 0);
    assert.ok(typeof layer.timing === 'string' && layer.timing.length > 0);
    assert.ok(typeof layer.volume === 'number' && layer.volume >= 0 && layer.volume <= 100);
    assert.ok(typeof layer.duration === 'string' && layer.duration.length > 0);
    assert.ok(typeof layer.purpose === 'string' && layer.purpose.length > 0);
  }
});

test('dry-run returns cues with correct structure', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.cues));
  assert.ok(result.strategy.cues.length > 0);
  for (const cue of result.strategy.cues) {
    assert.ok(typeof cue.type === 'string' && cue.type.length > 0);
    assert.ok(typeof cue.timing === 'string' && cue.timing.length > 0);
    assert.ok(typeof cue.description === 'string' && cue.description.length > 0);
    assert.ok(VALID_EMOTIONAL_IMPACTS.includes(cue.emotionalImpact));
    assert.ok(typeof cue.transition === 'string' && cue.transition.length > 0);
  }
});

test('dry-run returns musicStrategy with correct structure', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  const ms = result.strategy.musicStrategy;
  assert.ok(typeof ms.genre === 'string' && ms.genre.length > 0);
  assert.ok(typeof ms.tempo === 'string' && ms.tempo.length > 0);
  assert.ok(typeof ms.energy === 'number' && ms.energy >= 0 && ms.energy <= 100);
  assert.ok(typeof ms.keyMoment === 'string' && ms.keyMoment.length > 0);
  assert.ok(typeof ms.fadeStrategy === 'string' && ms.fadeStrategy.length > 0);
});

test('dry-run returns voiceoverDirection with correct structure', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  const vo = result.strategy.voiceoverDirection;
  assert.ok(typeof vo.tone === 'string' && vo.tone.length > 0);
  assert.ok(typeof vo.pace === 'string' && vo.pace.length > 0);
  assert.ok(typeof vo.emphasis === 'string' && vo.emphasis.length > 0);
  assert.ok(typeof vo.pauses === 'string' && vo.pauses.length > 0);
  assert.ok(typeof vo.personality === 'string' && vo.personality.length > 0);
});

test('dry-run returns recommendations', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateSoundDesign({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.layers.length > 0, `${platform} should produce layers`);
  }
});

test('dry-run works for all moods', async () => {
  for (const mood of VALID_MOODS) {
    const result = await generateSoundDesign({
      ...validInput,
      mood,
      dryRun: true,
    });
    assert.ok(result.strategy.layers.length > 0, `${mood} should produce layers`);
  }
});

test('dry-run produces layers covering multiple layer types', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  const types = new Set(result.strategy.layers.map((l) => l.type));
  assert.ok(types.size >= 3, `expected at least 3 distinct layer types, got ${types.size}`);
});

test('dry-run includes a music layer', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(result.strategy.layers.some((l) => l.type === 'music'));
});

test('dry-run includes a voiceover layer', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(result.strategy.layers.some((l) => l.type === 'voiceover'));
});

test('dry-run includes a silence layer', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(result.strategy.layers.some((l) => l.type === 'silence'));
});

test('dry-run silence layer has volume 0', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  const silence = result.strategy.layers.find((l) => l.type === 'silence');
  assert.ok(silence, 'silence layer should exist');
  assert.equal(silence!.volume, 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateSoundDesign({ ...validInput, dryRun: true });
  const b = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.deepEqual(a, b);
});

test('dry-run musicStrategy energy is in 0-100 range', async () => {
  const result = await generateSoundDesign({ ...validInput, dryRun: true });
  assert.ok(
    result.strategy.musicStrategy.energy >= 0 && result.strategy.musicStrategy.energy <= 100,
  );
});

test('generateSoundDesign rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateSoundDesign({ ...validInput, content: '' } as AdCreativeSoundDesignStrategistInput),
    /invalid_ad_creative_sound_design_strategist_input/,
  );
});

test('generateSoundDesign rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateSoundDesign({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeSoundDesignStrategistInput),
    /invalid_ad_creative_sound_design_strategist_input/,
  );
});

test('generateSoundDesign rejects missing mood in dry-run mode', async () => {
  await assert.rejects(
    () => generateSoundDesign({ ...validInput, mood: '', dryRun: true } as AdCreativeSoundDesignStrategistInput),
    /invalid_ad_creative_sound_design_strategist_input/,
  );
});
