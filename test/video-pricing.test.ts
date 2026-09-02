import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  videoCredits,
  estimateVideoCredits,
  ACCOUNT_MARKUP,
  MARGIN,
  CREDIT_USD,
} from '../src/lib/video-pricing.ts';

/**
 * Unit tests for src/lib/video-pricing.ts — videoCredits().
 *
 * Formula: credits = max(MIN_VIDEO_CREDITS, ceil( rate[resolution] * seconds
 *   * ACCOUNT_MARKUP * MARGIN / CREDIT_USD ))
 * where seconds = max(1, ceil(duration)) and rate comes from PER_SEC_USD.
 */

describe('videoCredits — basic pricing', () => {
  test('seedance 720p 5s matches the documented formula', () => {
    // rate=0.242, sec=5, markup=1.2, margin=1.5, credit=0.065
    const expected = Math.max(2, Math.ceil((0.242 * 5 * ACCOUNT_MARKUP * MARGIN) / CREDIT_USD));
    const got = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', 5);
    assert.equal(got, expected);
    assert.ok(got >= 2);
  });

  test('seedance 1080p 10s costs more than 720p 10s', () => {
    const p1080 = videoCredits('bytedance/seedance-2.0/image-to-video', '1080p', 10);
    const p720 = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', 10);
    assert.ok(p1080 > p720, '1080p should cost more than 720p for the same duration');
  });

  test('4k costs more than 1080p for the same duration', () => {
    const p4k = videoCredits('bytedance/seedance-2.0/image-to-video', '4k', 10);
    const p1080 = videoCredits('bytedance/seedance-2.0/image-to-video', '1080p', 10);
    assert.ok(p4k > p1080);
  });

  test('credits scale linearly with duration (doubling seconds ~ doubles credits)', () => {
    const model = 'bytedance/seedance-2.0/image-to-video';
    const res = '720p';
    const c10 = videoCredits(model, res, 10);
    const c20 = videoCredits(model, res, 20);
    // ceil rounding may differ by 1, but 20s should be roughly 2x of 10s
    assert.ok(c20 >= c10 * 2 - 1 && c20 <= c10 * 2 + 1);
  });
});

describe('videoCredits — wildcard resolution ("*") models', () => {
  test('uses the "*" rate regardless of resolution for gemini-omni-flash', () => {
    const any = videoCredits('google/gemini-omni-flash/video-edit', 'whatever', 10);
    const star = videoCredits('google/gemini-omni-flash/video-edit', undefined, 10);
    assert.equal(any, star);
    // rate=0.14, sec=10
    const expected = Math.max(2, Math.ceil((0.14 * 10 * ACCOUNT_MARKUP * MARGIN) / CREDIT_USD));
    assert.equal(any, expected);
  });

  test('veed lipsync uses "*" rate', () => {
    const got = videoCredits('veed/lipsync', undefined, 8);
    const expected = Math.max(2, Math.ceil((0.0132 * 8 * ACCOUNT_MARKUP * MARGIN) / CREDIT_USD));
    assert.equal(got, expected);
  });
});

describe('videoCredits — resolution fallback', () => {
  test('falls back to "*" when an explicit resolution is not in the table', () => {
    // seedance image-to-video has no "720p-SR"; for models with "*" that's the
    // wildcard. For seedance (no "*"), an unknown resolution falls back to the
    // max resolution rate. Verify the fallback returns a positive credit count.
    const got = videoCredits('bytedance/seedance-2.0/image-to-video', '999p', 5);
    assert.ok(got >= 2);
  });
});

describe('videoCredits — unknown model uses conservative fallback', () => {
  test('unknown model falls back to 0.25/s per-second rate', () => {
    const sec = 10;
    const expected = Math.max(2, Math.ceil((0.25 * sec * ACCOUNT_MARKUP * MARGIN) / CREDIT_USD));
    assert.equal(videoCredits('some/unknown-model', '1080p', sec), expected);
  });

  test('unknown model with undefined resolution still works', () => {
    assert.ok(videoCredits('some/unknown-model', undefined, 5) >= 2);
  });
});

describe('videoCredits — edge cases', () => {
  test('0 duration is clamped to 1 second (minimum charge)', () => {
    const got = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', 0);
    const oneSec = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', 1);
    assert.equal(got, oneSec);
    assert.ok(got >= 2);
  });

  test('negative duration is clamped to 1 second', () => {
    const got = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', -100);
    const oneSec = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', 1);
    assert.equal(got, oneSec);
  });

  test('NaN duration is clamped to 1 second (seconds || 0 -> 0 -> ceil -> max(1,...))', () => {
    const got = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', NaN);
    const oneSec = videoCredits('bytedance/seedance-2.0/image-to-video', '720p', 1);
    assert.equal(got, oneSec);
  });

  test('fractional duration is ceiled up (5.2s -> 6s)', () => {
    const model = 'bytedance/seedance-2.0/image-to-video';
    const res = '720p';
    const got = videoCredits(model, res, 5.2);
    const sixSec = videoCredits(model, res, 6);
    assert.equal(got, sixSec);
  });

  test('very long duration (e.g. 600s) produces a large credit cost', () => {
    const got = videoCredits('bytedance/seedance-2.0/image-to-video', '1080p', 600);
    assert.ok(got > 100, 'a 10-minute 1080p render should cost a lot of credits');
  });

  test('never returns below the MIN_VIDEO_CREDITS floor (2)', () => {
    // A tiny wildcard rate with 1 second should still hit the floor.
    const got = videoCredits('veed/lipsync', undefined, 1);
    assert.ok(got >= 2);
  });

  test('always returns an integer credit count', () => {
    const got = videoCredits('bytedance/seedance-2.0/reference-to-video', '1080p-SR', 7.7);
    assert.equal(Number.isInteger(got), true);
  });
});

describe('estimateVideoCredits — alias of videoCredits', () => {
  test('estimateVideoCredits is the same function as videoCredits', () => {
    assert.equal(estimateVideoCredits, videoCredits);
  });

  test('estimateVideoCredits returns identical results to videoCredits', () => {
    const model = 'bytedance/seedance-2.0/image-to-video';
    assert.equal(
      estimateVideoCredits(model, '720p', 12),
      videoCredits(model, '720p', 12),
    );
  });
});

describe('videoCredits — exported constants', () => {
  test('exports the documented markup/margin/credit-usd constants', () => {
    assert.equal(ACCOUNT_MARKUP, 1.2);
    assert.equal(MARGIN, 1.5);
    assert.equal(CREDIT_USD, 0.065);
  });
});
