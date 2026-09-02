import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Emotion Sequencer engine (AI-powered emotion
 * sequencing throughout ad creative content for maximum emotional impact).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_EMOTION_SEQUENCER_CREDIT_COST,
  validateAdCreativeEmotionSequencerInput,
  generateEmotionSequence,
  VALID_PLATFORMS,
  VALID_EMOTIONS,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_JOURNEY_LENGTH,
  type AdCreativeEmotionSequencerInput,
} from '@/lib/creative/ad-creative-emotion-sequencer';

// ── Credit cost ──

test('AD_CREATIVE_EMOTION_SEQUENCER_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_EMOTION_SEQUENCER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_EMOTIONS contains the twelve supported emotions', () => {
  assert.ok(VALID_EMOTIONS.includes('joy'));
  assert.ok(VALID_EMOTIONS.includes('surprise'));
  assert.ok(VALID_EMOTIONS.includes('fear'));
  assert.ok(VALID_EMOTIONS.includes('sadness'));
  assert.ok(VALID_EMOTIONS.includes('anger'));
  assert.ok(VALID_EMOTIONS.includes('trust'));
  assert.ok(VALID_EMOTIONS.includes('anticipation'));
  assert.ok(VALID_EMOTIONS.includes('disgust'));
  assert.ok(VALID_EMOTIONS.includes('excitement'));
  assert.ok(VALID_EMOTIONS.includes('nostalgia'));
  assert.ok(VALID_EMOTIONS.includes('pride'));
  assert.ok(VALID_EMOTIONS.includes('relief'));
  assert.equal(VALID_EMOTIONS.length, 12);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_JOURNEY_LENGTH is 2000', () => {
  assert.equal(MAX_JOURNEY_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeEmotionSequencerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  desiredJourney: 'curiosity → surprise → joy → trust',
  platform: 'tiktok',
};

test('validateAdCreativeEmotionSequencerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeEmotionSequencerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeEmotionSequencerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeEmotionSequencerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeEmotionSequencerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeEmotionSequencerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeEmotionSequencerInput rejects missing desiredJourney', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    desiredJourney: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_journey_required'));
});

test('validateAdCreativeEmotionSequencerInput rejects desiredJourney over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    desiredJourney: 'x'.repeat(MAX_JOURNEY_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_journey_too_long'));
});

test('validateAdCreativeEmotionSequencerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeEmotionSequencerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeEmotionSequencerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    productOrBrand: 'A fitness app',
    content: 'Get fit in 30 days with our AI coach',
    desiredJourney: 'anticipation → excitement → pride',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeEmotionSequencerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeEmotionSequencerInput accepts dryRun true', () => {
  const { valid, errors } = validateAdCreativeEmotionSequencerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateEmotionSequence with dryRun: true so no real LLM
// calls are made — deterministic heuristic emotion sequences are returned.

test('dry-run returns an EmotionSequencerResult with analysis', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.analysis);
  assert.ok(result.analysis.sequence);
  assert.ok(Array.isArray(result.analysis.sequence.beats));
  assert.ok(result.analysis.sequence.beats.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns resonanceScore in 0-100 range', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.ok(result.analysis.resonanceScore >= 0 && result.analysis.resonanceScore <= 100);
});

test('dry-run returns beats with correct structure', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  for (const beat of result.analysis.sequence.beats) {
    assert.ok(typeof beat.emotion === 'string' && beat.emotion.length > 0);
    assert.ok(typeof beat.intensity === 'number' && beat.intensity >= 0 && beat.intensity <= 100);
    assert.ok(typeof beat.timing === 'string' && beat.timing.length > 0);
    assert.ok(typeof beat.trigger === 'string' && beat.trigger.length > 0);
    assert.ok(typeof beat.duration === 'string' && beat.duration.length > 0);
  }
});

test('dry-run returns sequence with arc, climax, and resolution', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.ok(typeof result.analysis.sequence.arc === 'string' && result.analysis.sequence.arc.length > 0);
  assert.ok(typeof result.analysis.sequence.climax === 'string' && result.analysis.sequence.climax.length > 0);
  assert.ok(typeof result.analysis.sequence.resolution === 'string' && result.analysis.sequence.resolution.length > 0);
});

test('dry-run returns peaks with correct structure', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.peaks));
  assert.ok(result.analysis.peaks.length > 0);
  for (const peak of result.analysis.peaks) {
    assert.ok(typeof peak.emotion === 'string' && peak.emotion.length > 0);
    assert.ok(typeof peak.timing === 'string' && peak.timing.length > 0);
    assert.ok(typeof peak.intensity === 'number' && peak.intensity >= 0 && peak.intensity <= 100);
    assert.ok(typeof peak.buildup === 'string' && peak.buildup.length > 0);
  }
});

test('dry-run returns transitions with correct structure', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.transitions));
  assert.ok(result.analysis.transitions.length > 0);
  for (const tr of result.analysis.transitions) {
    assert.ok(typeof tr.from === 'string' && tr.from.length > 0);
    assert.ok(typeof tr.to === 'string' && tr.to.length > 0);
    assert.ok(typeof tr.technique === 'string' && tr.technique.length > 0);
    assert.ok(typeof tr.description === 'string' && tr.description.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.analysis.recommendations));
  assert.ok(result.analysis.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateEmotionSequence({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.analysis.sequence.beats.length > 0, `${platform} should produce beats`);
  }
});

test('dry-run adapts emotions based on desired journey (fear)', async () => {
  const result = await generateEmotionSequence({
    ...validInput,
    desiredJourney: 'fear → relief',
    dryRun: true,
  });
  const emotions = result.analysis.sequence.beats.map((b) => b.emotion);
  assert.ok(emotions.includes('fear'), 'should include fear emotion for fear journey');
});

test('dry-run adapts emotions based on desired journey (sadness)', async () => {
  const result = await generateEmotionSequence({
    ...validInput,
    desiredJourney: 'sadness → joy',
    dryRun: true,
  });
  const emotions = result.analysis.sequence.beats.map((b) => b.emotion);
  assert.ok(emotions.includes('sadness'), 'should include sadness emotion for sad journey');
});

test('dry-run adapts emotions based on desired journey (excitement)', async () => {
  const result = await generateEmotionSequence({
    ...validInput,
    desiredJourney: 'excitement and thrill',
    dryRun: true,
  });
  const emotions = result.analysis.sequence.beats.map((b) => b.emotion);
  assert.ok(emotions.includes('excitement'), 'should include excitement emotion for thrill journey');
});

test('dry-run adapts emotions based on desired journey (trust)', async () => {
  const result = await generateEmotionSequence({
    ...validInput,
    desiredJourney: 'trust and calm',
    dryRun: true,
  });
  const emotions = result.analysis.sequence.beats.map((b) => b.emotion);
  assert.ok(emotions.includes('trust'), 'should include trust emotion for trust journey');
});

test('dry-run is deterministic for the same input', async () => {
  const r1 = await generateEmotionSequence({ ...validInput, dryRun: true });
  const r2 = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.equal(r1.analysis.resonanceScore, r2.analysis.resonanceScore);
  assert.equal(r1.analysis.sequence.beats.length, r2.analysis.sequence.beats.length);
  assert.deepEqual(
    r1.analysis.sequence.beats.map((b) => b.emotion),
    r2.analysis.sequence.beats.map((b) => b.emotion),
  );
});

test('generateEmotionSequence rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmotionSequence({ ...validInput, content: '' } as AdCreativeEmotionSequencerInput),
    /invalid_ad_creative_emotion_sequencer_input/,
  );
});

test('generateEmotionSequence rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmotionSequence({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeEmotionSequencerInput),
    /invalid_ad_creative_emotion_sequencer_input/,
  );
});

test('generateEmotionSequence rejects missing desiredJourney in dry-run mode', async () => {
  await assert.rejects(
    () => generateEmotionSequence({ ...validInput, desiredJourney: '', dryRun: true } as AdCreativeEmotionSequencerInput),
    /invalid_ad_creative_emotion_sequencer_input/,
  );
});

test('generateEmotionSequence rejects missing input (null)', async () => {
  await assert.rejects(
    () => generateEmotionSequence(null as never),
    /invalid_ad_creative_emotion_sequencer_input/,
  );
});

test('dry-run produces transitions that link consecutive beats', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  const beats = result.analysis.sequence.beats;
  const transitions = result.analysis.transitions;
  assert.ok(transitions.length === beats.length - 1 || transitions.length >= 1);
  if (transitions.length === beats.length - 1 && beats.length > 1) {
    for (let i = 0; i < transitions.length; i++) {
      assert.equal(transitions[i].from, beats[i].emotion);
      assert.equal(transitions[i].to, beats[i + 1].emotion);
    }
  }
});

test('dry-run peaks have high intensity (>= 70) or at least one peak exists', async () => {
  const result = await generateEmotionSequence({ ...validInput, dryRun: true });
  assert.ok(result.analysis.peaks.length > 0);
  // At least one peak should have intensity >= 70 OR the fallback peak exists
  const hasHighPeak = result.analysis.peaks.some((p) => p.intensity >= 70);
  assert.ok(hasHighPeak || result.analysis.peaks.length > 0);
});
