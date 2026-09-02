import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the built-in creative templates module.
 *
 * The templates module exports BUILTIN_TEMPLATES — an array of pre-built
 * starting points for common e-commerce creative patterns, spanning brief,
 * hooks, angles, script, and skill-bundle categories.
 *
 * These tests verify the structure, completeness, and integrity of the
 * template data.
 */
import {
  BUILTIN_TEMPLATES,
  type BuiltinTemplate,
} from '@/lib/creative/templates';

// ── BUILTIN_TEMPLATES structure ──

test('BUILTIN_TEMPLATES is a non-empty array', () => {
  assert.ok(Array.isArray(BUILTIN_TEMPLATES));
  assert.ok(BUILTIN_TEMPLATES.length > 0);
});

test('every BUILTIN_TEMPLATES entry has a valid category', () => {
  const validCategories = ['brief', 'hooks', 'angles', 'script', 'skill-bundle'];
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(
      validCategories.includes(t.category),
      `template "${t.name}" has invalid category: ${t.category}`,
    );
  }
});

test('every BUILTIN_TEMPLATES entry has a non-empty name', () => {
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(typeof t.name === 'string' && t.name.trim().length > 0, `template has empty name`);
  }
});

test('every BUILTIN_TEMPLATES entry has a non-empty description', () => {
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(typeof t.description === 'string' && t.description.trim().length > 0, `template "${t.name}" has empty description`);
  }
});

test('every BUILTIN_TEMPLATES entry has a payload object', () => {
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(typeof t.payload === 'object' && t.payload !== null, `template "${t.name}" has no payload`);
  }
});

test('every BUILTIN_TEMPLATES entry has a tags array', () => {
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(Array.isArray(t.tags), `template "${t.name}" has no tags array`);
  }
});

// ── Category coverage ──

test('BUILTIN_TEMPLATES includes at least one brief template', () => {
  const briefs = BUILTIN_TEMPLATES.filter((t) => t.category === 'brief');
  assert.ok(briefs.length >= 1, 'expected at least one brief template');
});

test('BUILTIN_TEMPLATES includes at least one hooks template', () => {
  const hooks = BUILTIN_TEMPLATES.filter((t) => t.category === 'hooks');
  assert.ok(hooks.length >= 1, 'expected at least one hooks template');
});

test('BUILTIN_TEMPLATES includes at least one angles template', () => {
  const angles = BUILTIN_TEMPLATES.filter((t) => t.category === 'angles');
  assert.ok(angles.length >= 1, 'expected at least one angles template');
});

test('BUILTIN_TEMPLATES includes at least one script template', () => {
  const scripts = BUILTIN_TEMPLATES.filter((t) => t.category === 'script');
  assert.ok(scripts.length >= 1, 'expected at least one script template');
});

test('BUILTIN_TEMPLATES includes at least one skill-bundle template', () => {
  const bundles = BUILTIN_TEMPLATES.filter((t) => t.category === 'skill-bundle');
  assert.ok(bundles.length >= 1, 'expected at least one skill-bundle template');
});

// ── Brief template content ──

test('brief templates have goals array in payload', () => {
  const briefs = BUILTIN_TEMPLATES.filter((t) => t.category === 'brief');
  for (const t of briefs) {
    assert.ok(Array.isArray(t.payload.goals), `brief template "${t.name}" missing goals array`);
  }
});

test('brief templates have a cta field in payload', () => {
  const briefs = BUILTIN_TEMPLATES.filter((t) => t.category === 'brief');
  for (const t of briefs) {
    assert.ok(typeof t.payload.cta === 'string', `brief template "${t.name}" missing cta string`);
  }
});

// ── Hooks template content ──

test('hooks templates have hooks array in payload', () => {
  const hooks = BUILTIN_TEMPLATES.filter((t) => t.category === 'hooks');
  for (const t of hooks) {
    assert.ok(Array.isArray(t.payload.hooks), `hooks template "${t.name}" missing hooks array`);
    assert.ok(t.payload.hooks.length > 0, `hooks template "${t.name}" has empty hooks array`);
  }
});

test('hooks template entries have type and text fields', () => {
  const hooks = BUILTIN_TEMPLATES.filter((t) => t.category === 'hooks');
  for (const t of hooks) {
    for (const h of t.payload.hooks as Array<Record<string, unknown>>) {
      assert.ok(typeof h.type === 'string', `hook in "${t.name}" missing type`);
      assert.ok(typeof h.text === 'string', `hook in "${t.name}" missing text`);
    }
  }
});

// ── Angles template content ──

test('angles templates have angles array in payload', () => {
  const angles = BUILTIN_TEMPLATES.filter((t) => t.category === 'angles');
  for (const t of angles) {
    assert.ok(Array.isArray(t.payload.angles), `angles template "${t.name}" missing angles array`);
    assert.ok(t.payload.angles.length > 0, `angles template "${t.name}" has empty angles array`);
  }
});

test('angles template entries have name and emotionalTrigger fields', () => {
  const angles = BUILTIN_TEMPLATES.filter((t) => t.category === 'angles');
  for (const t of angles) {
    for (const a of t.payload.angles as Array<Record<string, unknown>>) {
      assert.ok(typeof a.name === 'string', `angle in "${t.name}" missing name`);
      assert.ok(typeof a.emotionalTrigger === 'string', `angle in "${t.name}" missing emotionalTrigger`);
    }
  }
});

// ── Script template content ──

test('script templates have scenes array in payload', () => {
  const scripts = BUILTIN_TEMPLATES.filter((t) => t.category === 'script');
  for (const t of scripts) {
    assert.ok(Array.isArray(t.payload.scenes), `script template "${t.name}" missing scenes array`);
    assert.ok(t.payload.scenes.length > 0, `script template "${t.name}" has empty scenes array`);
  }
});

test('script template scenes have beat and durationSec fields', () => {
  const scripts = BUILTIN_TEMPLATES.filter((t) => t.category === 'script');
  for (const t of scripts) {
    for (const s of t.payload.scenes as Array<Record<string, unknown>>) {
      assert.ok(typeof s.beat === 'string', `scene in "${t.name}" missing beat`);
      assert.ok(typeof s.durationSec === 'number', `scene in "${t.name}" missing durationSec`);
    }
  }
});

// ── Skill-bundle template content ──

test('skill-bundle templates have skillIds array in payload', () => {
  const bundles = BUILTIN_TEMPLATES.filter((t) => t.category === 'skill-bundle');
  for (const t of bundles) {
    assert.ok(Array.isArray(t.payload.skillIds), `skill-bundle template "${t.name}" missing skillIds array`);
    assert.ok(t.payload.skillIds.length > 0, `skill-bundle template "${t.name}" has empty skillIds array`);
  }
});

// ── Uniqueness ──

test('all BUILTIN_TEMPLATES names are unique', () => {
  const names = BUILTIN_TEMPLATES.map((t) => t.name);
  const unique = new Set(names);
  assert.equal(names.length, unique.size, 'duplicate template names found');
});
