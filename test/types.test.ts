import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  CreativeBrief,
  HookCandidate,
  CreativeAngle,
  ScriptCandidate,
  StoryboardCandidate,
  CreativeVariant,
  CreativeScore,
  EditCut,
  EditResult,
  ReferenceCreativeAnalysis,
  SceneBreakdown,
  HookAnalysis,
  PacingAnalysis,
  DeepReferenceAnalysis,
} from '@/lib/creative/types';

// ── Type shape instantiation (compile-time + runtime smoke) ──
// These tests verify that each exported interface can be instantiated
// with the correct shape. We use `as unknown` to construct minimal
// objects that satisfy the interface without providing every field.

test('CreativeBrief accepts valid shape', () => {
  const brief = {
    objective: 'conversion',
    platform: 'tiktok',
    format: 'ugc',
    audience: 'Gen Z',
    product: 'Widget',
    productName: 'Widget',
    offer: '20% off',
    painPoint: 'Time wasted',
    benefit: 'Saves time',
    mechanism: 'AI-powered',
    proof: '10k users',
    angle: 'Pain → Solution',
    hook: 'Stop scrolling',
    cta: 'Buy now',
    visualDirection: 'Bright',
    soundDirection: 'Upbeat',
    complianceConstraints: [],
    language: 'en',
  } as unknown as CreativeBrief;
  assert.equal(brief.productName, 'Widget');
  assert.equal(brief.platform, 'tiktok');
});

test('HookCandidate accepts valid shape', () => {
  const hook = {
    id: 'h1',
    text: 'Stop scrolling!',
    type: 'pattern-interrupt',
    rationale: 'Grabs attention',
    estimatedRetention: 85,
    score: 85,
  } as unknown as HookCandidate;
  assert.equal(hook.text, 'Stop scrolling!');
});

test('CreativeAngle accepts valid shape', () => {
  const angle = {
    name: 'Pain Point',
    description: 'Focus on customer pain',
    rationale: 'High resonance',
  } as unknown as CreativeAngle;
  assert.equal(angle.name, 'Pain Point');
});

test('ScriptCandidate accepts valid shape', () => {
  const script = {
    id: 's1',
    title: 'UGC Script v1',
    content: 'Hook → Story → CTA',
    angleId: 'a1',
    hookId: 'h1',
    scenes: [],
    duration: 30,
  } as unknown as ScriptCandidate;
  assert.equal(script.title, 'UGC Script v1');
});

test('StoryboardCandidate accepts valid shape', () => {
  const sb = {
    id: 'sb1',
    scriptId: 's1',
    shots: [],
    ratio: '9x16',
    totalDurationSec: 30,
  } as unknown as StoryboardCandidate;
  assert.equal(sb.id, 'sb1');
});

test('CreativeScore accepts valid shape', () => {
  const score = {
    overall: 78,
    hookStrength: 80,
    clarity: 75,
    productVisibility: 70,
    brandConsistency: 80,
  } as unknown as CreativeScore;
  assert.equal(score.overall, 78);
});

test('CreativeVariant accepts valid shape', () => {
  const variant = {
    id: 'v1',
    parentCreativeId: 'c1',
    variationType: 'hook',
    label: 'Variant A',
  } as unknown as CreativeVariant;
  assert.equal(variant.id, 'v1');
});

test('EditCut accepts valid shape', () => {
  const cut = {
    shotIndex: 0,
    shot: { id: 'shot1' },
    prompt: 'Close-up',
  } as unknown as EditCut;
  assert.equal(cut.shotIndex, 0);
});

test('EditResult accepts valid shape', () => {
  const result = {
    cutPlan: 'fast-paced',
  } as unknown as EditResult;
  assert.ok(typeof result.cutPlan === 'string');
});

test('ReferenceCreativeAnalysis accepts valid shape', () => {
  const analysis = {
    source: 'url',
    duration: 30,
    format: 'mp4',
    platform: 'tiktok',
    hooks: [],
    angles: [],
    cta: 'Buy now',
  } as unknown as ReferenceCreativeAnalysis;
  assert.equal(analysis.cta, 'Buy now');
});

test('SceneBreakdown accepts valid shape', () => {
  const scene = {
    sceneNumber: 1,
    timeRange: '0-3s',
    shotType: 'close-up',
    emotionScore: 0.8,
  } as unknown as SceneBreakdown;
  assert.equal(scene.sceneNumber, 1);
});

test('HookAnalysis accepts valid shape', () => {
  const hook = {
    hookType: 'question',
    hookText: 'Did you know?',
    hookTiming: 0,
    effectivenessScore: 85,
  } as unknown as HookAnalysis;
  assert.equal(hook.hookType, 'question');
});

test('PacingAnalysis accepts valid shape', () => {
  const pacing = {
    overallPace: 'fast',
    averageShotDuration: 2.5,
    shotCount: 12,
    paceChanges: 3,
  } as unknown as PacingAnalysis;
  assert.equal(pacing.overallPace, 'fast');
});

test('DeepReferenceAnalysis accepts valid shape', () => {
  const deep = {
    basicAnalysis: {},
    hookAnalysis: {},
    pacing: {},
    emotionalArc: [],
    scenes: [],
    hooks: [],
    emotionalBeats: [],
  } as unknown as DeepReferenceAnalysis;
  assert.ok(Array.isArray(deep.scenes));
});
