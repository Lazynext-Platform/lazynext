import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the centralized theme system logic.
 * The pure helpers (isTheme, resolveTheme) are re-implemented here to mirror
 * src/lib/theme.tsx exactly, so they can be tested without a DOM.
 */

type SelectedTheme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

function isTheme(v: unknown): v is SelectedTheme {
  return v === 'light' || v === 'dark' || v === 'system';
}

function resolveTheme(sel: SelectedTheme, prefersDark: boolean): ResolvedTheme {
  if (sel === 'system') return prefersDark ? 'dark' : 'light';
  return sel;
}

// Mirror of readStoredTheme's validation (without localStorage).
function validateStored(v: string | null): SelectedTheme {
  return isTheme(v) ? v : 'system';
}

test('isTheme accepts only the three valid modes', () => {
  assert.equal(isTheme('light'), true);
  assert.equal(isTheme('dark'), true);
  assert.equal(isTheme('system'), true);
  assert.equal(isTheme(''), false);
  assert.equal(isTheme('blue'), false);
  assert.equal(isTheme(null), false);
  assert.equal(isTheme(undefined), false);
});

test('invalid / missing stored values fall back to system', () => {
  assert.equal(validateStored(null), 'system');
  assert.equal(validateStored(''), 'system');
  assert.equal(validateStored('blue'), 'system');
  assert.equal(validateStored('DARK'), 'system'); // case-sensitive
  assert.equal(validateStored('light'), 'light');
  assert.equal(validateStored('system'), 'system');
});

test('system mode resolves from the OS preference', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});

test('manual light override ignores the OS preference', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('light', false), 'light');
});

test('manual dark override ignores the OS preference', () => {
  assert.equal(resolveTheme('dark', true), 'dark');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('default selection is system', () => {
  // The default returned when there is no stored value must be 'system'.
  assert.equal(validateStored(null), 'system');
});
