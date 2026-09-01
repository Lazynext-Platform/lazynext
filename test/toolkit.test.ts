import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isDryRun,
  extractJson,
  asStr,
  asNum,
  asObj,
  asStrArr,
  isString,
  sanitizeInput,
  validateRequired,
  validatePlatform,
  INJECTION_GUARD,
} from '@/lib/creative/toolkit';

// ── isString ──

test('isString returns true for strings', () => {
  assert.equal(isString('hello'), true);
  assert.equal(isString(''), true);
});

test('isString returns false for non-strings', () => {
  assert.equal(isString(42), false);
  assert.equal(isString(null), false);
  assert.equal(isString(undefined), false);
  assert.equal(isString({}), false);
});

// ── asStr ──

test('asStr returns trimmed string', () => {
  assert.equal(asStr('  hello  '), 'hello');
});

test('asStr returns fallback for empty string', () => {
  assert.equal(asStr('', 'default'), 'default');
  assert.equal(asStr('   ', 'default'), 'default');
});

test('asStr returns fallback for non-strings', () => {
  assert.equal(asStr(42, 'default'), 'default');
  assert.equal(asStr(null, 'default'), 'default');
  assert.equal(asStr(undefined, 'default'), 'default');
});

// ── asNum ──

test('asNum returns number for valid input', () => {
  assert.equal(asNum('42', 0), 42);
  assert.equal(asNum(42, 0), 42);
  assert.equal(asNum(3.14, 0), 3.14);
});

test('asNum returns fallback for invalid input', () => {
  assert.equal(asNum('abc', 10), 10);
  assert.equal(asNum(NaN, 10), 10);
  assert.equal(asNum(Infinity, 10), 10);
  // null coerces to 0 via Number(), which is finite — so it returns 0, not fallback
  assert.equal(asNum(null, 10), 0);
  // undefined coerces to NaN via Number()
  assert.equal(asNum(undefined, 10), 10);
});

test('asNum clamps to min/max', () => {
  assert.equal(asNum(5, 0, 1, 10), 5);
  assert.equal(asNum(0, 0, 1, 10), 1);
  assert.equal(asNum(20, 0, 1, 10), 10);
});

// ── asObj ──

test('asObj returns object for valid input', () => {
  const obj = { a: 1 };
  assert.deepEqual(asObj(obj), obj);
});

test('asObj returns empty object for non-objects', () => {
  assert.deepEqual(asObj(null), {});
  assert.deepEqual(asObj(undefined), {});
  assert.deepEqual(asObj('string'), {});
  assert.deepEqual(asObj(42), {});
});

// ── asStrArr ──

test('asStrArr returns string array for valid input', () => {
  assert.deepEqual(asStrArr(['a', 'b', 'c']), ['a', 'b', 'c']);
});

test('asStrArr filters empty strings', () => {
  assert.deepEqual(asStrArr(['a', '', 'b', '  ', 'c']), ['a', 'b', 'c']);
});

test('asStrArr returns empty array for non-arrays', () => {
  assert.deepEqual(asStrArr(null), []);
  assert.deepEqual(asStrArr('string'), []);
  assert.deepEqual(asStrArr(42), []);
});

test('asStrArr returns fallback array for non-arrays', () => {
  assert.deepEqual(asStrArr(null, ['fallback']), ['fallback']);
});

test('asStrArr limits array length', () => {
  assert.deepEqual(asStrArr(['a', 'b', 'c', 'd'], 2), ['a', 'b']);
});

// ── extractJson ──

test('extractJson extracts JSON from plain string', () => {
  const result = extractJson('{"key": "value"}');
  assert.equal(result.key, 'value');
});

test('extractJson extracts JSON from markdown code block', () => {
  const result = extractJson('```json\n{"key": "value"}\n```');
  assert.equal(result.key, 'value');
});

test('extractJson extracts JSON from surrounding text', () => {
  const result = extractJson('Here is the result: {"key": "value"} done.');
  assert.equal(result.key, 'value');
});

test('extractJson throws for no JSON', () => {
  assert.throws(() => extractJson('no json here'), /no_json/);
});

// ── sanitizeInput ──

test('sanitizeInput trims and truncates', () => {
  assert.equal(sanitizeInput('  hello  ', 100), 'hello');
  assert.equal(sanitizeInput('hello world', 5), 'hello');
});

// ── validateRequired ──

test('validateRequired returns null for valid input', () => {
  assert.equal(validateRequired('hello', 'field', 100), null);
});

test('validateRequired returns error for empty input', () => {
  const err = validateRequired('', 'Field', 100);
  assert.ok(err);
  assert.ok(err!.includes('required'));
});

test('validateRequired returns error for too-long input', () => {
  const err = validateRequired('x'.repeat(101), 'Field', 100);
  assert.ok(err);
  assert.ok(err!.includes('most'));
});

// ── validatePlatform ──

test('validatePlatform returns undefined for empty input', () => {
  assert.equal(validatePlatform(''), undefined);
  assert.equal(validatePlatform(undefined), undefined);
});

test('validatePlatform returns platform for valid input', () => {
  assert.equal(validatePlatform('tiktok'), 'tiktok');
  assert.equal(validatePlatform('TikTok'), 'tiktok');
  assert.equal(validatePlatform('INSTAGRAM'), 'instagram');
});

test('validatePlatform returns undefined for invalid input', () => {
  assert.equal(validatePlatform('myspace'), undefined);
  assert.equal(validatePlatform('123'), undefined);
});

// ── INJECTION_GUARD ──

test('INJECTION_GUARD is a non-empty string', () => {
  assert.ok(typeof INJECTION_GUARD === 'string');
  assert.ok(INJECTION_GUARD.length > 50);
  assert.ok(INJECTION_GUARD.includes('JSON'));
});

// ── isDryRun ──

test('isDryRun returns a boolean', () => {
  assert.equal(typeof isDryRun(), 'boolean');
});
