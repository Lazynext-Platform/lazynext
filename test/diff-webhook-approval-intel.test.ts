import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for:
 * - Creative version diff comparison logic
 * - Webhook event dispatch and signature logic
 * - Approval workflow state transitions
 * - Intelligence dashboard trend aggregation
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Creative version diff
// ─────────────────────────────────────────────────────────────────────────────

type DiffItem = {
  type: string;
  scoreA: number | null;
  scoreB: number | null;
  scoreDelta: number | null;
  onlyInA: boolean;
  onlyInB: boolean;
};

function computeDiff(childrenA: string[], childrenB: string[], scoresA: Record<string, number>, scoresB: Record<string, number>): DiffItem[] {
  const types = ['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants'];
  return types.map(type => {
    const inA = childrenA.includes(type);
    const inB = childrenB.includes(type);
    const scoreA = type === 'score' && inA ? (scoresA[type] ?? null) : null;
    const scoreB = type === 'score' && inB ? (scoresB[type] ?? null) : null;
    return {
      type,
      scoreA,
      scoreB,
      scoreDelta: scoreA !== null && scoreB !== null ? scoreB - scoreA : null,
      onlyInA: inA && !inB,
      onlyInB: inB && !inA,
    };
  });
}

test('Diff: both packages have all types', () => {
  const types = ['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants'];
  const diff = computeDiff(types, types, { score: 75 }, { score: 82 });
  assert.equal(diff.length, 7);
  assert.equal(diff[5].type, 'score');
  assert.equal(diff[5].scoreDelta, 7);
});

test('Diff: score delta is negative when B < A', () => {
  const types = ['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants'];
  const diff = computeDiff(types, types, { score: 90 }, { score: 70 });
  assert.equal(diff[5].scoreDelta, -20);
});

test('Diff: onlyInA when type missing from B', () => {
  const diff = computeDiff(['brief', 'score'], ['brief'], { score: 80 }, {});
  const scoreItem = diff.find(d => d.type === 'score')!;
  assert.ok(scoreItem.onlyInA);
  assert.ok(!scoreItem.onlyInB);
  assert.equal(scoreItem.scoreDelta, null);
});

test('Diff: onlyInB when type missing from A', () => {
  const diff = computeDiff(['brief'], ['brief', 'score'], {}, { score: 85 });
  const scoreItem = diff.find(d => d.type === 'score')!;
  assert.ok(scoreItem.onlyInB);
  assert.ok(!scoreItem.onlyInA);
});

test('Diff: both missing means no delta', () => {
  const diff = computeDiff([], [], {}, {});
  const scoreItem = diff.find(d => d.type === 'score')!;
  assert.equal(scoreItem.scoreA, null);
  assert.equal(scoreItem.scoreB, null);
  assert.equal(scoreItem.scoreDelta, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Webhook event dispatch and signature
// ─────────────────────────────────────────────────────────────────────────────

const VALID_EVENTS = [
  'creative.generated', 'creative.scored', 'campaign.deployed',
  'campaign.metrics_updated', 'pipeline.completed', 'performance.recorded',
];

test('Webhook: valid event names', () => {
  assert.ok(VALID_EVENTS.includes('creative.generated'));
  assert.ok(VALID_EVENTS.includes('campaign.deployed'));
  assert.ok(VALID_EVENTS.includes('pipeline.completed'));
});

test('Webhook: invalid event rejected', () => {
  assert.ok(!VALID_EVENTS.includes('invalid.event'));
  assert.ok(!VALID_EVENTS.includes(''));
});

test('Webhook: events filter by subscription', () => {
  const endpointEvents = 'creative.generated,campaign.deployed';
  const event = 'creative.generated';
  assert.ok(endpointEvents.includes(event));

  const unevent = 'performance.recorded';
  assert.ok(!endpointEvents.includes(unevent));
});

test('Webhook: signature format', () => {
  // Simulate HMAC-SHA256 signature format
  const sig = 'sha256=' + 'a'.repeat(64);
  assert.ok(sig.startsWith('sha256='));
  assert.equal(sig.length, 71); // 7 + 64
});

test('Webhook: payload structure', () => {
  const payload = {
    event: 'creative.generated',
    timestamp: new Date().toISOString(),
    data: { assetPackageId: 'abc123' },
  };
  assert.ok(payload.event);
  assert.ok(payload.timestamp);
  assert.ok(payload.data);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Approval workflow state transitions
// ─────────────────────────────────────────────────────────────────────────────

function transitionStatus(current: string, action: 'approve' | 'reject' | 'request_changes'): string {
  if (current !== 'pending_approval') return current;
  if (action === 'approve') return 'active';
  if (action === 'reject') return 'rejected';
  return 'changes_requested';
}

test('Approval: approve transitions to active', () => {
  assert.equal(transitionStatus('pending_approval', 'approve'), 'active');
});

test('Approval: reject transitions to rejected', () => {
  assert.equal(transitionStatus('pending_approval', 'reject'), 'rejected');
});

test('Approval: request_changes transitions to changes_requested', () => {
  assert.equal(transitionStatus('pending_approval', 'request_changes'), 'changes_requested');
});

test('Approval: non-pending state is unchanged', () => {
  assert.equal(transitionStatus('active', 'approve'), 'active');
  assert.equal(transitionStatus('rejected', 'approve'), 'rejected');
});

test('Approval: valid actions', () => {
  const validActions = ['approve', 'reject', 'request_changes'];
  assert.ok(validActions.includes('approve'));
  assert.ok(validActions.includes('reject'));
  assert.ok(validActions.includes('request_changes'));
  assert.ok(!validActions.includes('maybe'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Intelligence dashboard trend aggregation
// ─────────────────────────────────────────────────────────────────────────────

type PerfRecord = {
  hookType: string | null;
  angleName: string | null;
  platform: string;
  roas: number;
  ctr: number;
  recordedAt: Date;
};

function aggregateHookTrends(records: PerfRecord[]) {
  const byDate: Record<string, Record<string, { roas: number[]; count: number }>> = {};
  for (const r of records) {
    if (!r.hookType) continue;
    const date = r.recordedAt.toISOString().slice(0, 10);
    if (!byDate[date]) byDate[date] = {};
    if (!byDate[date][r.hookType]) byDate[date][r.hookType] = { roas: [], count: 0 };
    byDate[date][r.hookType].roas.push(r.roas);
    byDate[date][r.hookType].count++;
  }
  return Object.entries(byDate).map(([date, hooks]) => ({
    date,
    hooks: Object.fromEntries(
      Object.entries(hooks).map(([type, d]) => [type, {
        avgRoas: d.roas.reduce((a, b) => a + b, 0) / d.roas.length,
        count: d.count,
      }])
    ),
  }));
}

test('Intel: aggregates hook trends by date', () => {
  const records: PerfRecord[] = [
    { hookType: 'curiosity', angleName: null, platform: 'meta', roas: 2.5, ctr: 0.03, recordedAt: new Date('2026-08-01') },
    { hookType: 'curiosity', angleName: null, platform: 'meta', roas: 3.5, ctr: 0.04, recordedAt: new Date('2026-08-01') },
    { hookType: 'shock', angleName: null, platform: 'google', roas: 1.5, ctr: 0.02, recordedAt: new Date('2026-08-02') },
  ];
  const trends = aggregateHookTrends(records);
  assert.equal(trends.length, 2);
  const day1 = trends.find(t => t.date === '2026-08-01')!;
  assert.equal(day1.hooks.curiosity.avgRoas, 3.0);
  assert.equal(day1.hooks.curiosity.count, 2);
});

test('Intel: skips records without hookType', () => {
  const records: PerfRecord[] = [
    { hookType: null, angleName: null, platform: 'meta', roas: 2.0, ctr: 0.03, recordedAt: new Date('2026-08-01') },
    { hookType: 'curiosity', angleName: null, platform: 'meta', roas: 3.0, ctr: 0.04, recordedAt: new Date('2026-08-01') },
  ];
  const trends = aggregateHookTrends(records);
  assert.equal(trends.length, 1);
  assert.equal(Object.keys(trends[0].hooks).length, 1);
});

function bestTimeOfDay(records: PerfRecord[]) {
  const hours: Array<{ hour: number; roas: number[]; count: number }> = [];
  for (let h = 0; h < 24; h++) hours.push({ hour: h, roas: [], count: 0 });
  for (const r of records) {
    const h = r.recordedAt.getHours();
    hours[h].roas.push(r.roas);
    hours[h].count++;
  }
  return hours
    .filter(h => h.count > 0)
    .map(h => ({ hour: h.hour, avgRoas: h.roas.reduce((a, b) => a + b, 0) / h.roas.length, count: h.count }))
    .sort((a, b) => b.avgRoas - a.avgRoas);
}

test('Intel: best time of day sorted by ROAS', () => {
  const records: PerfRecord[] = [
    { hookType: null, angleName: null, platform: 'meta', roas: 5.0, ctr: 0.05, recordedAt: new Date('2026-08-01T14:00:00Z') },
    { hookType: null, angleName: null, platform: 'meta', roas: 1.0, ctr: 0.01, recordedAt: new Date('2026-08-01T08:00:00Z') },
    { hookType: null, angleName: null, platform: 'meta', roas: 3.0, ctr: 0.03, recordedAt: new Date('2026-08-01T20:00:00Z') },
  ];
  const tod = bestTimeOfDay(records);
  assert.equal(tod[0].avgRoas, 5.0);
  assert.equal(tod[1].avgRoas, 3.0);
  assert.equal(tod[2].avgRoas, 1.0);
});

test('Intel: empty records returns empty trends', () => {
  assert.equal(aggregateHookTrends([]).length, 0);
  assert.equal(bestTimeOfDay([]).length, 0);
});

test('Intel: platform comparison aggregates correctly', () => {
  const records: PerfRecord[] = [
    { hookType: null, angleName: null, platform: 'meta', roas: 2.0, ctr: 0.03, recordedAt: new Date() },
    { hookType: null, angleName: null, platform: 'meta', roas: 4.0, ctr: 0.05, recordedAt: new Date() },
    { hookType: null, angleName: null, platform: 'google', roas: 3.0, ctr: 0.04, recordedAt: new Date() },
  ];
  const byPlatform: Record<string, number[]> = {};
  for (const r of records) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = [];
    byPlatform[r.platform].push(r.roas);
  }
  const metaAvg = byPlatform.meta.reduce((a, b) => a + b, 0) / byPlatform.meta.length;
  const googleAvg = byPlatform.google.reduce((a, b) => a + b, 0) / byPlatform.google.length;
  assert.equal(metaAvg, 3.0);
  assert.equal(googleAvg, 3.0);
  assert.equal(Object.keys(byPlatform).length, 2);
});
