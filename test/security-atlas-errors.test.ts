import assert from 'node:assert/strict';
import test from 'node:test';

import { safeError, safeAtlasError, isAtlas402 } from '@/lib/security';

test('isAtlas402 detects Atlas chat 402 error', () => {
  const e = new Error('Atlas chat 402: {"error":"insufficient_balance"}');
  assert.equal(isAtlas402(e), true);
});

test('isAtlas402 detects Atlas submit 402 error', () => {
  const e = new Error('Atlas 402: payment required');
  assert.equal(isAtlas402(e), true);
});

test('isAtlas402 returns false for non-402 Atlas errors', () => {
  const e = new Error('Atlas chat 500: internal server error');
  assert.equal(isAtlas402(e), false);
});

test('isAtlas402 returns false for non-Atlas errors', () => {
  const e = new Error('something else went wrong');
  assert.equal(isAtlas402(e), false);
});

test('isAtlas402 returns false for non-Error values', () => {
  assert.equal(isAtlas402('string error'), false);
  assert.equal(isAtlas402(null), false);
  assert.equal(isAtlas402(undefined), false);
  assert.equal(isAtlas402(42), false);
});

test('safeAtlasError returns atlas_insufficient_balance for 402 errors', () => {
  const e = new Error('Atlas chat 402: insufficient balance');
  const r = safeAtlasError(e, 'test_route', 'generate_failed');
  assert.equal(r.error, 'atlas_insufficient_balance');
  assert.equal(r.status, 503);
});

test('safeAtlasError returns default error code for non-402 errors', () => {
  const e = new Error('some other error');
  const r = safeAtlasError(e, 'test_route', 'generate_failed');
  assert.equal(r.error, 'generate_failed');
  assert.equal(r.status, 500);
});

test('safeError returns the provided error code', () => {
  const e = new Error('test error');
  const r = safeError(e, 'test_route', 'my_error_code');
  assert.equal(r.error, 'my_error_code');
});

test('safeError handles non-Error values', () => {
  const r = safeError('string error', 'test_route', 'my_error_code');
  assert.equal(r.error, 'my_error_code');
});
