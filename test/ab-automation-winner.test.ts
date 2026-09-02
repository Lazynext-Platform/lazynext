import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWinnerTag,
  determineWinner,
  type AutomationVariant,
} from '../src/lib/creative/ab-automation';

// ---------------------------------------------------------------------------
// applyWinnerTag — pure function for the winner feedback loop.
// Tests the tagging logic in isolation (no Prisma mocking needed).
// ---------------------------------------------------------------------------

describe('applyWinnerTag', () => {
  test('tags an untagged creation with winner metadata', () => {
    const currentOutputs = { url: 'https://example.com/ad.mp4', type: 'video' };
    const { outputs, changed } = applyWinnerTag(currentOutputs, 'job-123', '2026-09-01T00:00:00Z');

    assert.equal(changed, true);
    assert.equal(outputs.abTestWinner, true);
    assert.equal(outputs.abTestWinnerAt, '2026-09-01T00:00:00Z');
    assert.equal(outputs.abTestJobId, 'job-123');
  });

  test('preserves existing output fields when tagging', () => {
    const currentOutputs = { url: 'https://example.com/ad.mp4', type: 'video', customField: 'value' };
    const { outputs } = applyWinnerTag(currentOutputs, 'job-456');

    assert.equal(outputs.url, 'https://example.com/ad.mp4');
    assert.equal(outputs.type, 'video');
    assert.equal(outputs.customField, 'value');
    assert.equal(outputs.abTestWinner, true);
    assert.equal(outputs.abTestJobId, 'job-456');
  });

  test('is idempotent — does not re-tag an already-tagged creation', () => {
    const currentOutputs = {
      url: 'https://example.com/ad.mp4',
      abTestWinner: true,
      abTestWinnerAt: '2026-08-01T00:00:00Z',
      abTestJobId: 'original-job',
    };
    const { outputs, changed } = applyWinnerTag(currentOutputs, 'new-job-789');

    assert.equal(changed, false);
    // Original tag values should be preserved, not overwritten
    assert.equal(outputs.abTestWinner, true);
    assert.equal(outputs.abTestWinnerAt, '2026-08-01T00:00:00Z');
    assert.equal(outputs.abTestJobId, 'original-job');
  });

  test('handles null/undefined outputs gracefully', () => {
    const { outputs, changed } = applyWinnerTag(undefined, 'job-null');

    assert.equal(changed, true);
    assert.equal(outputs.abTestWinner, true);
    assert.equal(outputs.abTestJobId, 'job-null');
    assert.ok(outputs.abTestWinnerAt);
  });

  test('handles empty outputs object', () => {
    const { outputs, changed } = applyWinnerTag({}, 'job-empty');

    assert.equal(changed, true);
    assert.equal(outputs.abTestWinner, true);
    assert.equal(outputs.abTestJobId, 'job-empty');
  });

  test('handles null outputs', () => {
    const { outputs, changed } = applyWinnerTag(null, 'job-null-outputs');

    assert.equal(changed, true);
    assert.equal(outputs.abTestWinner, true);
    assert.equal(outputs.abTestJobId, 'job-null-outputs');
  });

  test('generates a timestamp when not provided', () => {
    const { outputs } = applyWinnerTag({}, 'job-auto-ts');

    assert.ok(outputs.abTestWinnerAt);
    assert.equal(typeof outputs.abTestWinnerAt, 'string');
    // Should be a valid ISO date string
    const parsed = new Date(outputs.abTestWinnerAt as string);
    assert.ok(!isNaN(parsed.getTime()));
  });

  test('does not mutate the original outputs object', () => {
    const currentOutputs = { url: 'https://example.com/ad.mp4' };
    const originalSnapshot = { ...currentOutputs };
    applyWinnerTag(currentOutputs, 'job-immutable');

    // Original object should be unchanged
    assert.deepEqual(currentOutputs, originalSnapshot);
    assert.equal((currentOutputs as any).abTestWinner, undefined);
  });
});

// ---------------------------------------------------------------------------
// Integration: determineWinner + applyWinnerTag — verify the full winner
// feedback loop logic works end-to-end (without Prisma).
// ---------------------------------------------------------------------------

describe('winner feedback loop integration', () => {
  const makeVariant = (label: string, imps: number, conv: number, roas = 1): AutomationVariant => ({
    creationId: `creation-${label}`,
    label,
    impressions: imps,
    clicks: conv * 2,
    conversions: conv,
    spend: 100,
    revenue: 100 * roas,
    ctr: imps > 0 ? (conv * 2 / imps) * 100 : 0,
    cvr: conv * 2 > 0 ? (conv / (conv * 2)) * 100 : 0,
    roas,
  });

  test('determineWinner returns winner ID, applyWinnerTag tags it', () => {
    const variants = [
      makeVariant('A', 10000, 500, 3),
      makeVariant('B', 10000, 100, 1),
    ];
    const winnerId = determineWinner(variants, 'roas');
    assert.ok(winnerId);
    assert.equal(winnerId, 'creation-A');

    // Simulate tagging the winning creation
    const { outputs, changed } = applyWinnerTag({ url: 'https://example.com/a.mp4' }, 'job-integration');
    assert.equal(changed, true);
    assert.equal(outputs.abTestWinner, true);
    assert.equal(outputs.abTestJobId, 'job-integration');
  });

  test('no winner — no tagging needed', () => {
    const variants = [
      makeVariant('A', 1500, 75, 1.5),
      makeVariant('B', 1500, 73, 1.4),
    ];
    const winnerId = determineWinner(variants, 'roas');
    assert.equal(winnerId, null);
    // No winner means no tagging — applyWinnerTag would not be called
  });

  test('winner determined, tagging is idempotent on second check', () => {
    const variants = [
      makeVariant('A', 10000, 500, 3),
      makeVariant('B', 10000, 100, 1),
    ];
    const winnerId = determineWinner(variants, 'roas');
    assert.equal(winnerId, 'creation-A');

    // First tag
    const firstTag = applyWinnerTag({ url: 'https://example.com/a.mp4' }, 'job-idempotent');
    assert.equal(firstTag.changed, true);

    // Second tag (simulating a re-check) — should not change
    const secondTag = applyWinnerTag(firstTag.outputs, 'job-idempotent');
    assert.equal(secondTag.changed, false);
    // Values preserved from first tag
    assert.equal(secondTag.outputs.abTestJobId, 'job-idempotent');
  });
});
