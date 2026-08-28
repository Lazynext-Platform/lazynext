import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkSpendCap } from '@/lib/ad-platforms/meta';

describe('Meta Ads Integration', () => {
  test('checkSpendCap returns ok when spend within cap', () => {
    const result = checkSpendCap(50, 100);
    assert.equal(result.ok, true);
  });

  test('checkSpendCap returns ok when spend equals cap', () => {
    const result = checkSpendCap(100, 100);
    assert.equal(result.ok, true);
  });

  test('checkSpendCap returns not ok when spend exceeds cap with margin', () => {
    const result = checkSpendCap(120, 100);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.cap, 100);
      assert.equal(result.value, 120);
    }
  });

  test('checkSpendCap returns ok for zero or negative cap', () => {
    const result = checkSpendCap(50, 0);
    assert.equal(result.ok, true);
  });

  test('checkSpendCap returns ok for negative cap', () => {
    const result = checkSpendCap(50, -10);
    assert.equal(result.ok, true);
  });

  test('checkSpendCap applies 10% safety margin', () => {
    // 110 is exactly at the 1.1x margin of 100
    const result = checkSpendCap(110, 100);
    assert.equal(result.ok, true);
  });

  test('checkSpendCap fails just above margin', () => {
    const result = checkSpendCap(111, 100);
    assert.equal(result.ok, false);
  });
});
