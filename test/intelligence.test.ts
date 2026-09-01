import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREATIVE_COSTS,
  type BriefInput,
} from '@/lib/creative/intelligence';

// ── CREATIVE_COSTS ──

test('CREATIVE_COSTS has expected keys', () => {
  assert.ok(typeof CREATIVE_COSTS === 'object');
  assert.ok('brief' in CREATIVE_COSTS);
  assert.ok('hooks' in CREATIVE_COSTS);
  assert.ok('angles' in CREATIVE_COSTS);
  assert.ok('script' in CREATIVE_COSTS);
  assert.ok('storyboard' in CREATIVE_COSTS);
});

test('CREATIVE_COSTS values are positive integers', () => {
  for (const [key, val] of Object.entries(CREATIVE_COSTS)) {
    assert.ok(typeof val === 'number', `${key} should be a number`);
    assert.ok(val > 0, `${key} should be positive`);
    assert.ok(Number.isInteger(val), `${key} should be an integer`);
  }
});

// ── Type instantiation (compile-time check) ──

test('BriefInput type accepts valid shape', () => {
  const input: BriefInput = {
    product: 'A great widget that saves time',
    productName: 'Widget',
    platform: 'tiktok',
    audience: 'Young adults',
  };
  assert.equal(input.product, 'A great widget that saves time');
  assert.equal(input.platform, 'tiktok');
});

test('BriefInput accepts minimal shape with only product', () => {
  const input: BriefInput = {
    product: 'Test Product',
  };
  assert.equal(input.product, 'Test Product');
  assert.equal(input.productName, undefined);
});
