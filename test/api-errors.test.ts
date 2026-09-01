import assert from 'node:assert/strict';
import test from 'node:test';

import { apiErrorMessage } from '@/lib/api-errors';

test('apiErrorMessage maps insufficient_credits', () => {
  const r = apiErrorMessage('insufficient_credits');
  assert.equal(r.key, 'common.errPaymentRequired');
  assert.ok(r.fallback.includes('credits'));
});

test('apiErrorMessage maps atlas_insufficient_balance', () => {
  const r = apiErrorMessage('atlas_insufficient_balance');
  assert.equal(r.key, 'common.errAtlasBalance');
  assert.ok(r.fallback.includes('unavailable'));
});

test('apiErrorMessage maps unauthorized', () => {
  const r = apiErrorMessage('unauthorized');
  assert.equal(r.key, 'common.errUnauthorized');
});

test('apiErrorMessage maps forbidden', () => {
  const r = apiErrorMessage('forbidden');
  assert.equal(r.key, 'common.errForbidden');
});

test('apiErrorMessage maps not_found', () => {
  const r = apiErrorMessage('not_found');
  assert.equal(r.key, 'common.errNotFound');
});

test('apiErrorMessage returns generic for unknown codes', () => {
  const r = apiErrorMessage('some_unknown_error');
  assert.equal(r.key, 'common.errGeneric');
});

test('apiErrorMessage returns generic for undefined', () => {
  const r = apiErrorMessage(undefined);
  assert.equal(r.key, 'common.errGeneric');
});

test('apiErrorMessage returns generic for empty string', () => {
  const r = apiErrorMessage('');
  assert.equal(r.key, 'common.errGeneric');
});
