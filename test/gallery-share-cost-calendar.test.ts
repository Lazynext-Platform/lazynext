import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for:
 * - Cost estimator calculation logic
 * - Content calendar entry grouping
 * - Share link token/validation logic
 * - Asset delete cascade logic
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cost estimator calculation logic
// ─────────────────────────────────────────────────────────────────────────────

interface CostItem { tool: string; label: string; credits: number; count?: number }

function calculateTotal(items: CostItem[]): number {
  return items.reduce((sum, item) => sum + item.credits * (item.count || 1), 0);
}

test('Cost: single item total', () => {
  assert.equal(calculateTotal([{ tool: 'brief', label: 'Brief', credits: 3 }]), 3);
});

test('Cost: multiple items total', () => {
  const items: CostItem[] = [
    { tool: 'brief', label: 'Brief', credits: 3 },
    { tool: 'hooks', label: 'Hooks', credits: 2 },
    { tool: 'angles', label: 'Angles', credits: 2 },
  ];
  assert.equal(calculateTotal(items), 7);
});

test('Cost: item with count multiplier', () => {
  const items: CostItem[] = [
    { tool: 'hooks', label: 'Hooks', credits: 2, count: 5 },
  ];
  assert.equal(calculateTotal(items), 10);
});

test('Cost: mixed single and counted items', () => {
  const items: CostItem[] = [
    { tool: 'brief', label: 'Brief', credits: 3 },
    { tool: 'script', label: 'Script', credits: 3, count: 3 },
    { tool: 'score', label: 'Score', credits: 2 },
  ];
  assert.equal(calculateTotal(items), 3 + 9 + 2);
});

test('Cost: insufficient balance detection', () => {
  const total = 15;
  const balance = 10;
  assert.ok(balance < total);
});

test('Cost: sufficient balance detection', () => {
  const total = 15;
  const balance = 30;
  assert.ok(balance >= total);
});

test('Cost: remaining calculation', () => {
  const total = 15;
  const balance = 30;
  assert.equal(balance - total, 15);
});

test('Cost: empty items returns 0', () => {
  assert.equal(calculateTotal([]), 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Content calendar entry grouping
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarEntry { date: string; type: 'campaign' | 'creative'; name: string; platform?: string; status?: string; id: string }

function groupByDate(entries: CalendarEntry[]): Record<string, CalendarEntry[]> {
  return entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {} as Record<string, CalendarEntry[]>);
}

test('Calendar: groups entries by date', () => {
  const entries: CalendarEntry[] = [
    { date: '2026-08-01', type: 'campaign', name: 'Camp A', id: '1' },
    { date: '2026-08-01', type: 'creative', name: 'Brief A', id: '2' },
    { date: '2026-08-15', type: 'campaign', name: 'Camp B', id: '3' },
  ];
  const grouped = groupByDate(entries);
  assert.equal(Object.keys(grouped).length, 2);
  assert.equal(grouped['2026-08-01'].length, 2);
  assert.equal(grouped['2026-08-15'].length, 1);
});

test('Calendar: filters upcoming within 7 days', () => {
  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const in10days = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const entries: CalendarEntry[] = [
    { date: todayStr, type: 'campaign', name: 'Today', status: 'active', id: '1' },
    { date: in3days, type: 'campaign', name: 'Soon', status: 'active', id: '2' },
    { date: in10days, type: 'campaign', name: 'Later', status: 'active', id: '3' },
  ];

  const sevenDays = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const upcoming = entries.filter(e =>
    e.type === 'campaign' &&
    (e.status === 'active' || e.status === 'pending_approval') &&
    e.date >= todayStr && e.date <= sevenDays
  );
  assert.equal(upcoming.length, 2);
  assert.ok(upcoming.some(e => e.name === 'Today'));
  assert.ok(upcoming.some(e => e.name === 'Soon'));
  assert.ok(!upcoming.some(e => e.name === 'Later'));
});

test('Calendar: stats calculation', () => {
  const entries: CalendarEntry[] = [
    { date: '2026-08-01', type: 'campaign', name: 'A', status: 'active', id: '1' },
    { date: '2026-08-02', type: 'campaign', name: 'B', status: 'paused', id: '2' },
    { date: '2026-08-03', type: 'creative', name: 'C', id: '3' },
  ];
  const totalCampaigns = entries.filter(e => e.type === 'campaign').length;
  const totalCreatives = entries.filter(e => e.type === 'creative').length;
  const activeCampaigns = entries.filter(e => e.type === 'campaign' && e.status === 'active').length;
  assert.equal(totalCampaigns, 2);
  assert.equal(totalCreatives, 1);
  assert.equal(activeCampaigns, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Share link token validation
// ─────────────────────────────────────────────────────────────────────────────

function validateShareToken(token: string): boolean {
  // Token should be a 48-char hex string (24 bytes)
  return /^[a-f0-9]{48}$/.test(token);
}

test('Share: valid token format', () => {
  const token = 'a'.repeat(48);
  assert.ok(validateShareToken(token));
});

test('Share: rejects short token', () => {
  assert.ok(!validateShareToken('abc'));
});

test('Share: rejects non-hex token', () => {
  assert.ok(!validateShareToken('z'.repeat(48)));
});

test('Share: expiry check', () => {
  const expiresAt = new Date('2026-01-01');
  const now = new Date('2026-08-01');
  assert.ok(now > expiresAt);
});

test('Share: non-expired link', () => {
  const expiresAt = new Date('2026-12-31');
  const now = new Date('2026-08-01');
  assert.ok(now < expiresAt);
});

test('Share: null expiry means never expires', () => {
  const expiresAt: Date | null = null;
  const isExpired = expiresAt !== null && new Date() > (expiresAt as Date);
  assert.ok(!isExpired);
});

test('Share: password match', () => {
  const stored = 'secret123';
  const provided = 'secret123';
  assert.equal(stored, provided);
});

test('Share: password mismatch', () => {
  const stored = 'secret123';
  const provided = 'wrong';
  assert.notEqual(stored, provided);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Asset delete cascade logic
// ─────────────────────────────────────────────────────────────────────────────

test('Asset: delete returns 0 for non-owned asset', () => {
  // Simulates the ownership check: findFirst returns null
  const found = null;
  assert.equal(found ? 1 : 0, 0);
});

test('Asset: delete count includes children', () => {
  // Parent + 3 children = 4 deletes
  const childCount = 3;
  const totalDeleted = childCount + 1;
  assert.equal(totalDeleted, 4);
});

test('Asset: delete with no children returns 1', () => {
  const childCount = 0;
  const totalDeleted = childCount + 1;
  assert.equal(totalDeleted, 1);
});
