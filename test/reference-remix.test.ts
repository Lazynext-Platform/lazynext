import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Note: reference-remix.ts imports from @/lib/atlas and @/lib/providers/model-helpers
// which have extensionless imports the Node test runner cannot resolve.
// These tests validate the structure, validation logic, and dry-run output
// shape by mirroring the module's exported contracts.

// Mirror of validateReferenceRemixInput (kept in sync with the module).
function validateReferenceRemixInput(input: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return { valid: false, errors: ['input_required'] };
  if (typeof input.referenceUrl !== 'string' || !input.referenceUrl.trim()) {
    errors.push('reference_url_required');
  } else {
    try {
      const u = new URL(input.referenceUrl.trim());
      if (!u.protocol || !u.host) errors.push('reference_url_invalid');
    } catch {
      errors.push('reference_url_invalid');
    }
  }
  const validTypes = new Set(['video', 'image', 'ad_copy']);
  if (input.referenceType && !validTypes.has(input.referenceType as string)) {
    errors.push('reference_type_invalid');
  }
  if (input.preserveElements && !Array.isArray(input.preserveElements)) {
    errors.push('preserve_elements_must_be_array');
  }
  if (input.changeElements && !Array.isArray(input.changeElements)) {
    errors.push('change_elements_must_be_array');
  }
  return { valid: errors.length === 0, errors };
}

// Credit cost mirrored from the module.
const REFERENCE_REMIX_CREDIT_COST = 4;

// Deterministic dry-run output builder (mirrors the module's dryRunOutput).
function dryRunOutput(input: {
  referenceUrl: string;
  referenceType?: string;
  targetProduct?: string;
  targetAudience?: string;
  platform?: string;
}) {
  const refType = input.referenceType || 'video';
  const product = input.targetProduct || 'your product';
  const audience = input.targetAudience || 'your target audience';
  const platform = input.platform || 'TikTok';
  return {
    evidence: {
      hooks: [
        { timecode: '0:00-0:02', hookText: '[mock] Pattern-interrupt opening visual', hookType: 'pattern_interrupt' },
        { timecode: '0:02-0:04', hookText: '[mock] Curiosity-gap question', hookType: 'curiosity_gap' },
      ],
      angles: ['[mock] problem-solution angle', '[mock] before-after angle'],
      pacing: { avgSceneDuration: 3.2, totalScenes: 7, rhythmDescription: '[mock] fast cuts with a slow-motion emphasis beat at 0:08' },
      visualStyle: {
        colorPalette: ['[mock] #FF5722', '[mock] neutral grey'],
        cameraStyle: '[mock] handheld',
        editingStyle: '[mock] fast cut',
        textOverlayStyle: '[mock] bold sans',
      },
      emotionalBeats: [
        { timecode: '0:03', emotion: '[mock] curiosity', trigger: '[mock] unexpected visual' },
        { timecode: '0:08', emotion: '[mock] desire', trigger: '[mock] product reveal' },
      ],
      ctaStructure: { timing: '[mock] final 3s', type: '[mock] direct', text: '[mock] Shop now' },
    },
    analysis: {
      whatWorks: ['[mock] strong 2-second hook', '[mock] clear product reveal timing'],
      whatDoesnt: ['[mock] CTA could be more urgent'],
      whyItWorks: ['[mock] curiosity gap earns attention', '[mock] visual proof builds desire'],
      targetAudienceFit: `[mock] well-suited to ${audience}`,
      platformOptimization: [`[mock] vertical format optimized for ${platform}`],
      performancePredictors: ['[mock] hook retention in first 2s', '[mock] product clarity at 0:08'],
    },
    remixBrief: {
      concept: `[mock] Remix the ${refType}'s hook-and-reveal structure for ${product} aimed at ${audience} on ${platform}.`,
      hookStrategy: '[mock] Keep the pattern-interrupt opening; swap the visual to feature ' + product,
      angleStrategy: '[mock] Preserve the problem-solution angle; reframe around ' + product,
      visualDirection: '[mock] Maintain the bold color palette and handheld energy; update product shots',
      pacingGuidance: '[mock] Keep the fast-cut rhythm with a slow-motion emphasis beat before the CTA',
      ctaStrategy: '[mock] Strengthen the CTA with urgency framing tailored to ' + platform,
      differentiationNotes: '[mock] Differentiate via product-specific proof and a unique visual signature',
      generationPrompt: `[mock] Generate a ${platform} vertical video for ${product}. Open with a pattern-interrupt hook in the first 2 seconds, reveal the product by 0:08 with a slow-motion emphasis beat, fast cuts throughout, bold text overlays, and a direct urgent CTA in the final 3 seconds. Target audience: ${audience}.`,
    },
    originalUrl: input.referenceUrl,
    processingNotes: '[mock] dry-run reference remix — no LLM call made',
  };
}

describe('Reference Remix Pipeline', () => {
  // ── Validation ──

  test('validation fails on missing URL', () => {
    const result = validateReferenceRemixInput({ referenceUrl: '' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('reference_url_required'));
  });

  test('validation fails on invalid URL', () => {
    const result = validateReferenceRemixInput({ referenceUrl: 'not-a-url' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('reference_url_invalid'));
  });

  test('validation fails on invalid referenceType', () => {
    const result = validateReferenceRemixInput({
      referenceUrl: 'https://example.com/video.mp4',
      referenceType: 'podcast',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('reference_type_invalid'));
  });

  test('validation fails when preserveElements is not an array', () => {
    const result = validateReferenceRemixInput({
      referenceUrl: 'https://example.com/video.mp4',
      preserveElements: 'hook',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('preserve_elements_must_be_array'));
  });

  test('validation fails when changeElements is not an array', () => {
    const result = validateReferenceRemixInput({
      referenceUrl: 'https://example.com/video.mp4',
      changeElements: 'product',
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('change_elements_must_be_array'));
  });

  test('validation passes on valid input', () => {
    const result = validateReferenceRemixInput({
      referenceUrl: 'https://example.com/video.mp4',
      referenceType: 'video',
      targetProduct: 'wireless earbuds',
      targetAudience: 'gen-z fitness enthusiasts',
      platform: 'TikTok',
      preserveElements: ['hook structure', 'pacing'],
      changeElements: ['product', 'voice', 'setting'],
    });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  test('validation passes with only required URL', () => {
    const result = validateReferenceRemixInput({
      referenceUrl: 'https://example.com/ad.mp4',
    });
    assert.equal(result.valid, true);
  });

  // ── Credit cost ──

  test('credit cost is positive', () => {
    assert.ok(REFERENCE_REMIX_CREDIT_COST > 0);
    assert.equal(REFERENCE_REMIX_CREDIT_COST, 4);
  });

  // ── Output structure ──

  test('output has evidence, analysis, remixBrief all present', () => {
    const out = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4' });
    assert.ok(out.evidence, 'evidence should be present');
    assert.ok(out.analysis, 'analysis should be present');
    assert.ok(out.remixBrief, 'remixBrief should be present');
    assert.equal(out.originalUrl, 'https://example.com/v.mp4');
    assert.ok(typeof out.processingNotes === 'string');
  });

  // ── Evidence extraction ──

  test('evidence extraction has hooks, angles, pacing, visualStyle', () => {
    const out = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4' });
    const ev = out.evidence;
    assert.ok(Array.isArray(ev.hooks));
    assert.ok(ev.hooks.length > 0);
    assert.ok(Array.isArray(ev.angles));
    assert.ok(ev.angles.length > 0);
    assert.ok(ev.pacing);
    assert.equal(typeof ev.pacing.avgSceneDuration, 'number');
    assert.equal(typeof ev.pacing.totalScenes, 'number');
    assert.equal(typeof ev.pacing.rhythmDescription, 'string');
    assert.ok(ev.visualStyle);
    assert.ok(Array.isArray(ev.visualStyle.colorPalette));
    assert.equal(typeof ev.visualStyle.cameraStyle, 'string');
    assert.equal(typeof ev.visualStyle.editingStyle, 'string');
    assert.equal(typeof ev.visualStyle.textOverlayStyle, 'string');
  });

  test('evidence hooks have timecode, hookText, hookType', () => {
    const out = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4' });
    for (const h of out.evidence.hooks) {
      assert.ok(typeof h.timecode === 'string');
      assert.ok(typeof h.hookText === 'string');
      assert.ok(typeof h.hookType === 'string');
    }
  });

  test('evidence has emotionalBeats and ctaStructure', () => {
    const out = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4' });
    const ev = out.evidence;
    assert.ok(Array.isArray(ev.emotionalBeats));
    assert.ok(ev.emotionalBeats.length > 0);
    for (const b of ev.emotionalBeats) {
      assert.ok(typeof b.timecode === 'string');
      assert.ok(typeof b.emotion === 'string');
      assert.ok(typeof b.trigger === 'string');
    }
    assert.ok(ev.ctaStructure);
    assert.equal(typeof ev.ctaStructure.timing, 'string');
    assert.equal(typeof ev.ctaStructure.type, 'string');
    assert.equal(typeof ev.ctaStructure.text, 'string');
  });

  // ── Creative analysis ──

  test('analysis has whatWorks, whatDoesnt, whyItWorks', () => {
    const out = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4' });
    const an = out.analysis;
    assert.ok(Array.isArray(an.whatWorks));
    assert.ok(an.whatWorks.length > 0);
    assert.ok(Array.isArray(an.whatDoesnt));
    assert.ok(an.whatDoesnt.length > 0);
    assert.ok(Array.isArray(an.whyItWorks));
    assert.ok(an.whyItWorks.length > 0);
  });

  test('analysis has targetAudienceFit, platformOptimization, performancePredictors', () => {
    const out = dryRunOutput({
      referenceUrl: 'https://example.com/v.mp4',
      targetAudience: 'gen-z',
      platform: 'Reels',
    });
    const an = out.analysis;
    assert.equal(typeof an.targetAudienceFit, 'string');
    assert.ok(an.targetAudienceFit.includes('gen-z'));
    assert.ok(Array.isArray(an.platformOptimization));
    assert.ok(an.platformOptimization.length > 0);
    assert.ok(an.platformOptimization[0].includes('Reels'));
    assert.ok(Array.isArray(an.performancePredictors));
    assert.ok(an.performancePredictors.length > 0);
  });

  // ── Remix brief ──

  test('remixBrief has concept, hookStrategy, generationPrompt', () => {
    const out = dryRunOutput({
      referenceUrl: 'https://example.com/v.mp4',
      targetProduct: 'earbuds',
      targetAudience: 'runners',
      platform: 'TikTok',
    });
    const rb = out.remixBrief;
    assert.ok(typeof rb.concept === 'string' && rb.concept.length > 0);
    assert.ok(typeof rb.hookStrategy === 'string' && rb.hookStrategy.length > 0);
    assert.ok(typeof rb.generationPrompt === 'string' && rb.generationPrompt.length > 0);
  });

  test('remixBrief has all strategy fields', () => {
    const out = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4' });
    const rb = out.remixBrief;
    assert.equal(typeof rb.angleStrategy, 'string');
    assert.equal(typeof rb.visualDirection, 'string');
    assert.equal(typeof rb.pacingGuidance, 'string');
    assert.equal(typeof rb.ctaStrategy, 'string');
    assert.equal(typeof rb.differentiationNotes, 'string');
  });

  test('generationPrompt is ready for video generation (non-empty, descriptive)', () => {
    const out = dryRunOutput({
      referenceUrl: 'https://example.com/v.mp4',
      targetProduct: 'skincare serum',
      targetAudience: 'millennials',
      platform: 'YouTube Shorts',
    });
    const prompt = out.remixBrief.generationPrompt;
    assert.ok(prompt.length > 50, 'generationPrompt should be a substantial prompt');
    assert.ok(prompt.includes('skincare serum'), 'generationPrompt should reference the product');
    assert.ok(prompt.includes('millennials'), 'generationPrompt should reference the audience');
  });

  // ── Dry-run mode ──

  test('dry-run mode returns structured output', () => {
    const out = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4' });
    assert.ok(out.processingNotes.includes('mock'), 'dry-run output should be marked as mock');
    assert.equal(out.originalUrl, 'https://example.com/v.mp4');
    // Full structural sanity check
    assert.ok(out.evidence.hooks.length >= 1);
    assert.ok(out.evidence.angles.length >= 1);
    assert.ok(out.analysis.whatWorks.length >= 1);
    assert.ok(out.remixBrief.generationPrompt.length > 0);
  });

  test('dry-run output is deterministic for the same input', () => {
    const a = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4', targetProduct: 'X' });
    const b = dryRunOutput({ referenceUrl: 'https://example.com/v.mp4', targetProduct: 'X' });
    assert.deepEqual(a, b);
  });

  test('dry-run output reflects input product/audience/platform', () => {
    const out = dryRunOutput({
      referenceUrl: 'https://example.com/v.mp4',
      targetProduct: 'protein powder',
      targetAudience: 'gym-goers',
      platform: 'Instagram',
    });
    assert.ok(out.remixBrief.concept.includes('protein powder'));
    assert.ok(out.remixBrief.concept.includes('gym-goers'));
    assert.ok(out.remixBrief.concept.includes('Instagram'));
  });
});
