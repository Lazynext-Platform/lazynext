import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Intelligence system prompts module.
 *
 * The prompts module exports string constants that serve as system prompts
 * for each generation step (brief, hooks, angles, scripts, storyboard,
 * reference analysis, deep reference analysis, scoring, refinement, remix).
 *
 * These tests verify that each prompt is a non-empty string containing the
 * key structural instructions expected by downstream generation modules.
 */
import {
  BRIEF_SYS,
  HOOKS_SYS,
  ANGLES_SYS,
  SCRIPT_SYS,
  STORYBOARD_SYS,
  REFERENCE_ANALYSIS_SYS,
  DEEP_REFERENCE_ANALYSIS_SYS,
  SCORE_SYS,
  REFINE_SYS,
  REMIX_SYS,
} from '@/lib/creative/prompts';

// ── BRIEF_SYS ──

test('BRIEF_SYS is a non-empty string', () => {
  assert.equal(typeof BRIEF_SYS, 'string');
  assert.ok(BRIEF_SYS.length > 100);
});

test('BRIEF_SYS instructs JSON-only output', () => {
  assert.ok(BRIEF_SYS.includes('JSON'));
});

test('BRIEF_SYS includes the output schema with objective field', () => {
  assert.ok(BRIEF_SYS.includes('objective'));
  assert.ok(BRIEF_SYS.includes('platform'));
  assert.ok(BRIEF_SYS.includes('audience'));
});

test('BRIEF_SYS includes injection guard language', () => {
  assert.ok(BRIEF_SYS.includes('DATA') || BRIEF_SYS.includes('data'));
});

// ── HOOKS_SYS ──

test('HOOKS_SYS is a non-empty string', () => {
  assert.equal(typeof HOOKS_SYS, 'string');
  assert.ok(HOOKS_SYS.length > 100);
});

test('HOOKS_SYS mentions hook types', () => {
  assert.ok(HOOKS_SYS.includes('conflict'));
  assert.ok(HOOKS_SYS.includes('suspense'));
  assert.ok(HOOKS_SYS.includes('curiosity') || HOOKS_SYS.includes('pov'));
});

test('HOOKS_SYS instructs JSON array output', () => {
  assert.ok(HOOKS_SYS.includes('JSON'));
});

// ── ANGLES_SYS ──

test('ANGLES_SYS is a non-empty string', () => {
  assert.equal(typeof ANGLES_SYS, 'string');
  assert.ok(ANGLES_SYS.length > 100);
});

test('ANGLES_SYS mentions emotional triggers', () => {
  assert.ok(ANGLES_SYS.includes('social proof') || ANGLES_SYS.includes('social_proof'));
  assert.ok(ANGLES_SYS.includes('urgency') || ANGLES_SYS.includes('aspiration'));
});

test('ANGLES_SYS instructs JSON array output', () => {
  assert.ok(ANGLES_SYS.includes('JSON'));
});

// ── SCRIPT_SYS ──

test('SCRIPT_SYS is a non-empty string', () => {
  assert.equal(typeof SCRIPT_SYS, 'string');
  assert.ok(SCRIPT_SYS.length > 100);
});

test('SCRIPT_SYS references scenes and voiceover', () => {
  assert.ok(SCRIPT_SYS.includes('scenes'));
  assert.ok(SCRIPT_SYS.includes('voiceover'));
});

test('SCRIPT_SYS instructs JSON output', () => {
  assert.ok(SCRIPT_SYS.includes('JSON'));
});

// ── STORYBOARD_SYS ──

test('STORYBOARD_SYS is a non-empty string', () => {
  assert.equal(typeof STORYBOARD_SYS, 'string');
  assert.ok(STORYBOARD_SYS.length > 100);
});

test('STORYBOARD_SYS references shots and prompts', () => {
  assert.ok(STORYBOARD_SYS.includes('shot'));
  assert.ok(STORYBOARD_SYS.includes('prompt'));
});

test('STORYBOARD_SYS mentions ratio', () => {
  assert.ok(STORYBOARD_SYS.includes('ratio'));
});

// ── REFERENCE_ANALYSIS_SYS ──

test('REFERENCE_ANALYSIS_SYS is a non-empty string', () => {
  assert.equal(typeof REFERENCE_ANALYSIS_SYS, 'string');
  assert.ok(REFERENCE_ANALYSIS_SYS.length > 100);
});

test('REFERENCE_ANALYSIS_SYS references adaptation and originality', () => {
  assert.ok(REFERENCE_ANALYSIS_SYS.includes('adaptation'));
  assert.ok(REFERENCE_ANALYSIS_SYS.includes('originality'));
});

// ── DEEP_REFERENCE_ANALYSIS_SYS ──

test('DEEP_REFERENCE_ANALYSIS_SYS is a non-empty string', () => {
  assert.equal(typeof DEEP_REFERENCE_ANALYSIS_SYS, 'string');
  assert.ok(DEEP_REFERENCE_ANALYSIS_SYS.length > 100);
});

test('DEEP_REFERENCE_ANALYSIS_SYS references scenes and hook analysis', () => {
  assert.ok(DEEP_REFERENCE_ANALYSIS_SYS.includes('scenes'));
  assert.ok(DEEP_REFERENCE_ANALYSIS_SYS.includes('hookAnalysis') || DEEP_REFERENCE_ANALYSIS_SYS.includes('hook'));
});

test('DEEP_REFERENCE_ANALYSIS_SYS references remix brief', () => {
  assert.ok(DEEP_REFERENCE_ANALYSIS_SYS.includes('remixBrief') || DEEP_REFERENCE_ANALYSIS_SYS.includes('remix'));
});

// ── SCORE_SYS ──

test('SCORE_SYS is a non-empty string', () => {
  assert.equal(typeof SCORE_SYS, 'string');
  assert.ok(SCORE_SYS.length > 100);
});

test('SCORE_SYS references quality dimensions', () => {
  assert.ok(SCORE_SYS.includes('hookStrength'));
  assert.ok(SCORE_SYS.includes('clarity'));
  assert.ok(SCORE_SYS.includes('complianceRisk'));
});

// ── REFINE_SYS ──

test('REFINE_SYS is a non-empty string', () => {
  assert.equal(typeof REFINE_SYS, 'string');
  assert.ok(REFINE_SYS.length > 100);
});

test('REFINE_SYS references refinement and safety', () => {
  assert.ok(REFINE_SYS.includes('refine'));
  assert.ok(REFINE_SYS.includes('safety') || REFINE_SYS.includes('brand'));
});

// ── REMIX_SYS ──

test('REMIX_SYS is a non-empty string', () => {
  assert.equal(typeof REMIX_SYS, 'string');
  assert.ok(REMIX_SYS.length > 100);
});

test('REMIX_SYS references adaptation not copying', () => {
  assert.ok(REMIX_SYS.includes('ADAPT') || REMIX_SYS.includes('adapt'));
  assert.ok(REMIX_SYS.includes('copy') || REMIX_SYS.includes('NOT copy'));
});

test('REMIX_SYS includes the brief output schema', () => {
  assert.ok(REMIX_SYS.includes('objective'));
  assert.ok(REMIX_SYS.includes('platform'));
});
