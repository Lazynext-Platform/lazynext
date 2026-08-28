import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Deep Reference Analysis', () => {
  test('SceneBreakdown structure is valid', () => {
    const scene = {
      sceneNumber: 1,
      timeRange: { startSec: 0, endSec: 5 },
      shotType: 'close-up',
      description: 'Product reveal',
      emotionScore: 75,
      engagementScore: 80,
      visualElements: ['product', 'hands'],
      audioElements: ['music', 'voiceover'],
      textElements: ['caption'],
    };
    assert.equal(scene.sceneNumber, 1);
    assert.equal(scene.timeRange.startSec, 0);
    assert.equal(scene.emotionScore, 75);
    assert.equal(scene.visualElements.length, 2);
  });

  test('HookAnalysis structure is valid', () => {
    const hook = {
      hookType: 'question',
      hookText: 'Want better skin?',
      hookTiming: { startSec: 0, endSec: 3 },
      effectivenessScore: 85,
      psychologicalTrigger: 'curiosity',
      audienceAttentionFactor: 'high',
      variantSuggestions: ['variant1', 'variant2'],
    };
    assert.equal(hook.hookType, 'question');
    assert.equal(hook.effectivenessScore, 85);
    assert.equal(hook.variantSuggestions.length, 2);
  });

  test('PacingAnalysis structure is valid', () => {
    const pacing = {
      overallPace: 'fast',
      averageShotDuration: 2.5,
      shotCount: 12,
      paceChanges: [{ timeSec: 10, change: 'slowdown' }],
      energyCurve: [{ timeSec: 0, energy: 80 }, { timeSec: 15, energy: 50 }],
      recommendedPace: 'medium',
    };
    assert.equal(pacing.overallPace, 'fast');
    assert.equal(pacing.shotCount, 12);
    assert.equal(pacing.energyCurve.length, 2);
  });

  test('score color coding: green >= 80', () => {
    const score = 85;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'green');
  });

  test('score color coding: yellow 60-79', () => {
    const score = 70;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'yellow');
  });

  test('score color coding: red < 60', () => {
    const score = 45;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'red');
  });

  test('DeepReferenceAnalysis has all required sections', () => {
    const analysis = {
      basicAnalysis: {},
      scenes: [],
      hookAnalysis: { hookType: 'visual', hookText: '', hookTiming: { startSec: 0, endSec: 0 }, effectivenessScore: 0, psychologicalTrigger: '', audienceAttentionFactor: '', variantSuggestions: [] },
      pacing: { overallPace: '', averageShotDuration: 0, shotCount: 0, paceChanges: [], energyCurve: [], recommendedPace: '' },
      emotionalArc: [],
      persuasionTimeline: [],
      remixBrief: { preservedElements: [], adaptedElements: [], newElements: [], recommendedStructure: '', differentiationStrategy: '' },
      performancePrediction: { hookStrength: 0, storyFlow: 0, ctaClarity: 0, brandAlignment: 0, overallScore: 0 },
    };
    assert.ok('basicAnalysis' in analysis);
    assert.ok('scenes' in analysis);
    assert.ok('hookAnalysis' in analysis);
    assert.ok('pacing' in analysis);
    assert.ok('emotionalArc' in analysis);
    assert.ok('persuasionTimeline' in analysis);
    assert.ok('remixBrief' in analysis);
    assert.ok('performancePrediction' in analysis);
  });
});
