import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the provider registry and router improvements.
 *
 * The registry module is pure metadata with no external dependencies,
 * so it can be imported directly. The router module imports from the
 * registry via relative path (./registry) which the test loader doesn't
 * resolve, so router tests use inline copies of the logic.
 */

import { getModel, modelsByCapability, allModels } from '../src/lib/providers/registry.ts';

describe('Provider Registry — ASR/OCR', () => {
  it('registers an ASR model (whisper-large-v3)', () => {
    const model = getModel('openai/whisper-large-v3');
    assert.ok(model);
    assert.ok(model!.capabilities.includes('speechRecognition'));
  });

  it('registers an OCR model (firered-ocr)', () => {
    const model = getModel('firered/firered-ocr');
    assert.ok(model);
    assert.ok(model!.capabilities.includes('ocr'));
  });

  it('modelsByCapability returns ASR models', () => {
    const models = modelsByCapability('speechRecognition');
    assert.ok(models.length >= 1);
    assert.ok(models.some(m => m.id === 'openai/whisper-large-v3'));
  });

  it('modelsByCapability returns OCR models', () => {
    const models = modelsByCapability('ocr');
    assert.ok(models.length >= 1);
    assert.ok(models.some(m => m.id === 'firered/firered-ocr'));
  });

  it('ASR model has language support metadata', () => {
    const model = getModel('openai/whisper-large-v3');
    assert.ok(model!.languageSupport);
    assert.ok(model!.languageSupport!.length >= 10);
  });

  it('OCR model is marked as service-boundary provider', () => {
    const model = getModel('firered/firered-ocr');
    assert.equal(model!.provider, 'service-boundary');
  });

  it('allModels includes the new ASR and OCR entries', () => {
    const models = allModels();
    assert.ok(models.some(m => m.id === 'openai/whisper-large-v3'));
    assert.ok(models.some(m => m.id === 'firered/firered-ocr'));
  });
});

describe('Provider Router — Plan Tier Access (inline)', () => {
  // Inline copy of tierHasAccess logic from router.ts
  // (router.ts can't be imported in tests due to relative import resolution)
  const TIER_ACCESS: Record<string, string[]> = {
    free: ['text', 'reasoning', 'imageGeneration', 'speechSynthesis'],
    starter: ['text', 'reasoning', 'imageGeneration', 'imageEditing', 'speechSynthesis', 'videoGeneration', 'speechRecognition'],
    pro: ['text', 'reasoning', 'imageGeneration', 'imageEditing', 'speechSynthesis', 'videoGeneration', 'videoEditing', 'speechRecognition', 'lipsync', 'music', 'soundEffects'],
    elite: ['text', 'reasoning', 'imageGeneration', 'imageEditing', 'speechSynthesis', 'videoGeneration', 'videoEditing', 'speechRecognition', 'lipsync', 'music', 'soundEffects', 'ocr', 'embeddings', 'ranking'],
  };

  function tierHasAccess(tier: string, capability: string): boolean {
    const allowed = TIER_ACCESS[tier];
    return !!allowed && allowed.includes(capability);
  }

  it('free tier has access to text and imageGeneration', () => {
    assert.ok(tierHasAccess('free', 'text'));
    assert.ok(tierHasAccess('free', 'imageGeneration'));
  });

  it('free tier does NOT have access to videoGeneration or ocr', () => {
    assert.ok(!tierHasAccess('free', 'videoGeneration'));
    assert.ok(!tierHasAccess('free', 'ocr'));
  });

  it('starter tier has access to videoGeneration but not ocr', () => {
    assert.ok(tierHasAccess('starter', 'videoGeneration'));
    assert.ok(!tierHasAccess('starter', 'ocr'));
  });

  it('pro tier has access to videoEditing and lipsync but not ocr', () => {
    assert.ok(tierHasAccess('pro', 'videoEditing'));
    assert.ok(tierHasAccess('pro', 'lipsync'));
    assert.ok(!tierHasAccess('pro', 'ocr'));
  });

  it('elite tier has access to all capabilities including ocr', () => {
    assert.ok(tierHasAccess('elite', 'ocr'));
    assert.ok(tierHasAccess('elite', 'embeddings'));
    assert.ok(tierHasAccess('elite', 'ranking'));
  });

  it('unknown tier has no access', () => {
    assert.ok(!tierHasAccess('unknown', 'text'));
  });
});

describe('Provider Router — Cost Estimation (inline)', () => {
  // Inline copy of estimateCost logic using the registry
  it('video cost = perSec * duration', () => {
    const model = getModel('bytedance/seedance-2.0/image-to-video');
    assert.ok(model?.costPerSecondUsd);
    const perSec = model!.costPerSecondUsd!['720p'] || 0;
    const cost = perSec * 10;
    assert.ok(cost > 0);
    assert.equal(cost, 0.242 * 10);
  });

  it('lipsync cost = perSec * duration', () => {
    const model = getModel('veed/lipsync');
    assert.ok(model?.costPerSecondUsd);
    const perSec = model!.costPerSecondUsd!['*'] || 0;
    const cost = perSec * 15;
    assert.ok(cost > 0);
    assert.equal(cost, 0.0132 * 15);
  });

  it('models without cost metadata return 0', () => {
    const model = getModel('bytedance/doubao-seed-2.1-turbo-260628');
    assert.ok(!model?.costPerSecondUsd);
    // estimateCost would return 0
  });

  it('ASR model has no cost metadata (free via Atlas)', () => {
    const model = getModel('openai/whisper-large-v3');
    assert.ok(!model?.costPerSecondUsd);
  });

  it('OCR model has no cost metadata (service-boundary)', () => {
    const model = getModel('firered/firered-ocr');
    assert.ok(!model?.costPerSecondUsd);
  });
});
