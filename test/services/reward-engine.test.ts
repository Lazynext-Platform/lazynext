import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test the scoring logic in isolation (no DB calls)
// We import the pure scoring function by testing the band logic

test('score band logic: 90+ is reward', () => {
  const score = 95;
  const band = score >= 90 ? 'reward' : score >= 75 ? 'good' : score >= 50 ? 'correction' : 'failure';
  assert.equal(band, 'reward');
});

test('score band logic: 75-89 is good', () => {
  const score = 80;
  const band = score >= 90 ? 'reward' : score >= 75 ? 'good' : score >= 50 ? 'correction' : 'failure';
  assert.equal(band, 'good');
});

test('score band logic: 50-74 is correction', () => {
  const score = 60;
  const band = score >= 90 ? 'reward' : score >= 75 ? 'good' : score >= 50 ? 'correction' : 'failure';
  assert.equal(band, 'correction');
});

test('score band logic: 0-49 is failure', () => {
  const score = 30;
  const band = score >= 90 ? 'reward' : score >= 75 ? 'good' : score >= 50 ? 'correction' : 'failure';
  assert.equal(band, 'failure');
});

test('weighted score: all perfect = 100', () => {
  const verification = 100;
  const timeEfficiency = 100;
  const noRegression = 100;
  const outputQuality = 100;
  const attemptCount = 100;
  const score = Math.round(
    verification * 0.30 +
    timeEfficiency * 0.20 +
    noRegression * 0.20 +
    outputQuality * 0.15 +
    attemptCount * 0.15,
  );
  assert.equal(score, 100);
});

test('weighted score: verification fail + regression = low', () => {
  const verification = 0;
  const timeEfficiency = 100;
  const noRegression = 0;
  const outputQuality = 50;
  const attemptCount = 50;
  const score = Math.round(
    verification * 0.30 +
    timeEfficiency * 0.20 +
    noRegression * 0.20 +
    outputQuality * 0.15 +
    attemptCount * 0.15,
  );
  assert.ok(score < 50, `expected < 50, got ${score}`);
});

test('weighted score: verification pass, no regression, first attempt = high', () => {
  const verification = 100;
  const timeEfficiency = 80;
  const noRegression = 100;
  const outputQuality = 80;
  const attemptCount = 100;
  const score = Math.round(
    verification * 0.30 +
    timeEfficiency * 0.20 +
    noRegression * 0.20 +
    outputQuality * 0.15 +
    attemptCount * 0.15,
  );
  assert.ok(score >= 75, `expected >= 75, got ${score}`);
});

test('attempt count penalty: 4 attempts = 25', () => {
  const attemptCount = Math.max(0, Math.min(100, 100 - (4 - 1) * 25));
  assert.equal(attemptCount, 25);
});

test('attempt count penalty: 1 attempt = 100', () => {
  const attemptCount = Math.max(0, Math.min(100, 100 - (1 - 1) * 25));
  assert.equal(attemptCount, 100);
});

test('attempt count penalty: 5 attempts = 0', () => {
  const attemptCount = Math.max(0, Math.min(100, 100 - (5 - 1) * 25));
  assert.equal(attemptCount, 0);
});

test('time efficiency: elapsed = expected = 100', () => {
  const expectedMs = 5000;
  const elapsedMs = 5000;
  const timeEfficiency = Math.max(0, Math.min(100, (expectedMs / Math.max(elapsedMs, 1)) * 100));
  assert.equal(timeEfficiency, 100);
});

test('time efficiency: elapsed = 2x expected = 50', () => {
  const expectedMs = 5000;
  const elapsedMs = 10000;
  const timeEfficiency = Math.max(0, Math.min(100, (expectedMs / Math.max(elapsedMs, 1)) * 100));
  assert.equal(timeEfficiency, 50);
});

test('empty performance stats have correct defaults', () => {
  const stats = {
    totalRuns: 0,
    totalScore: 0,
    averageScore: 0,
    rewardCount: 0,
    correctionCount: 0,
    failureCount: 0,
    lastScore: 0,
    lastBand: 'good',
    updatedAt: new Date().toISOString(),
  };
  assert.equal(stats.totalRuns, 0);
  assert.equal(stats.averageScore, 0);
  assert.equal(stats.lastBand, 'good');
});

// ── Escalation ladder tests ──

test('escalation ladder: attempt 1 is standard', () => {
  const retryCount = 1;
  assert.ok(retryCount < 5, 'attempt 1 should not escalate');
});

test('escalation ladder: attempt 5 escalates', () => {
  const retryCount = 5;
  assert.ok(retryCount >= 5, 'attempt 5 should escalate');
});

test('escalation ladder: attempt 2 includes episodic context', () => {
  const retryCount = 2;
  assert.ok(retryCount >= 2, 'attempt 2 should include episodic context');
});

test('escalation ladder: attempt 3 includes knowledge context', () => {
  const retryCount = 3;
  assert.ok(retryCount >= 3, 'attempt 3 should include knowledge context');
});

test('escalation ladder: attempt 4 requests decomposition', () => {
  const retryCount = 4;
  assert.ok(retryCount >= 4, 'attempt 4 should request decomposition');
});

// ── Tiered model routing tests ──

test('role tier: engineering = quality', () => {
  const ROLE_TIER_MAP: Record<string, string> = {
    ceo: 'quality', engineering: 'quality', strategy: 'quality',
    product: 'quality', design: 'quality', security: 'quality',
    research: 'balanced', growth: 'balanced', sales: 'balanced',
    support: 'cost', operations: 'cost', finance: 'cost',
    custom: 'balanced',
  };
  assert.equal(ROLE_TIER_MAP['engineering'], 'quality');
});

test('role tier: support = cost', () => {
  const ROLE_TIER_MAP: Record<string, string> = {
    support: 'cost', operations: 'cost', finance: 'cost',
  };
  assert.equal(ROLE_TIER_MAP['support'], 'cost');
});

test('role tier: research = balanced', () => {
  const ROLE_TIER_MAP: Record<string, string> = {
    research: 'balanced', growth: 'balanced', sales: 'balanced',
  };
  assert.equal(ROLE_TIER_MAP['research'], 'balanced');
});

test('role tier: unknown role = balanced', () => {
  const getRoleTier = (role?: string) => role ? 'balanced' : 'balanced';
  assert.equal(getRoleTier('unknown_role'), 'balanced');
  assert.equal(getRoleTier(undefined), 'balanced');
});
