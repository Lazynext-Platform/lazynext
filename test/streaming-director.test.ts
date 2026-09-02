import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the streaming Creative Director API route
 * (src/app/api/creative/director/route.ts).
 *
 * The production route uses auth(), deductCredits(), refundSync(), and
 * runCreativeDirector() — all of which hit Cloudflare/external systems that
 * cannot be instantiated in the Node test runner. Following the same convention
 * as test/creative-director.test.ts and test/creative-learning.test.ts, we
 * replicate the pure logic (NDJSON line format, credit refund math, stream
 * vs legacy mode selection, error event format) to verify the protocol
 * invariants hermetically.
 */

// ── NDJSON line format ──

// Replicate the send() function from the route
function formatNDJSONLine(event: string, data: unknown): string {
  return JSON.stringify({ event, data }) + '\n';
}

test('formatNDJSONLine produces valid JSON terminated by newline', () => {
  const line = formatNDJSONLine('step', { name: 'brief', status: 'completed' });
  assert.ok(line.endsWith('\n'));
  const parsed = JSON.parse(line.trim());
  assert.equal(parsed.event, 'step');
  assert.equal(parsed.data.name, 'brief');
  assert.equal(parsed.data.status, 'completed');
});

test('formatNDJSONLine for complete event includes all result fields', () => {
  const result = {
    steps: [{ name: 'brief', status: 'completed', creditsSpent: 5 }],
    brief: { product: 'Serum', platform: 'tiktok' },
    hooks: [{ hook: 'Stop scrolling', type: 'pattern_interrupt' }],
    angles: [{ name: 'UGC', description: 'User-generated content style' }],
    bestCombination: { angle: { name: 'UGC' }, hook: { hook: 'Stop scrolling' } },
    variants: [{ id: 'v1', variationType: 'hook_swap' }],
    totalCreditsSpent: 25,
    budgetCredits: 30,
    assetPackageId: 'pkg-123',
  };
  const line = formatNDJSONLine('complete', result);
  const parsed = JSON.parse(line.trim());
  assert.equal(parsed.event, 'complete');
  assert.equal(parsed.data.totalCreditsSpent, 25);
  assert.equal(parsed.data.budgetCredits, 30);
  assert.equal(parsed.data.assetPackageId, 'pkg-123');
  assert.equal(parsed.data.hooks.length, 1);
});

test('formatNDJSONLine for error event includes error and detail', () => {
  const line = formatNDJSONLine('error', { error: 'director_failed', detail: 'some error' });
  const parsed = JSON.parse(line.trim());
  assert.equal(parsed.event, 'error');
  assert.equal(parsed.data.error, 'director_failed');
  assert.equal(parsed.data.detail, 'some error');
});

test('formatNDJSONLine for step event includes name, status, credits, and totals', () => {
  const line = formatNDJSONLine('step', {
    name: 'hooks',
    status: 'running',
    creditsSpent: 3,
    error: undefined,
    totalCreditsSpent: 8,
    budgetCredits: 30,
  });
  const parsed = JSON.parse(line.trim());
  assert.equal(parsed.event, 'step');
  assert.equal(parsed.data.name, 'hooks');
  assert.equal(parsed.data.status, 'running');
  assert.equal(parsed.data.creditsSpent, 3);
  assert.equal(parsed.data.totalCreditsSpent, 8);
  assert.equal(parsed.data.budgetCredits, 30);
});

// ── NDJSON stream parsing (replicate the client-side consumer) ──

function parseNDJSONStream(streamText: string): Array<{ event: string; data: Record<string, unknown> }> {
  const lines = streamText.split('\n').filter((l) => l.trim());
  return lines.map((line) => JSON.parse(line) as { event: string; data: Record<string, unknown> });
}

test('parseNDJSONStream parses multiple lines correctly', () => {
  const stream = [
    formatNDJSONLine('step', { name: 'brief', status: 'completed' }),
    formatNDJSONLine('step', { name: 'hooks', status: 'completed' }),
    formatNDJSONLine('complete', { totalCreditsSpent: 20, budgetCredits: 30 }),
  ].join('');
  const events = parseNDJSONStream(stream);
  assert.equal(events.length, 3);
  assert.equal(events[0].event, 'step');
  assert.equal(events[1].event, 'step');
  assert.equal(events[2].event, 'complete');
});

test('parseNDJSONStream handles empty lines between events', () => {
  const stream = formatNDJSONLine('step', { name: 'brief', status: 'completed' }) + '\n\n' + formatNDJSONLine('complete', { totalCreditsSpent: 10 });
  const events = parseNDJSONStream(stream);
  assert.equal(events.length, 2);
});

test('parseNDJSONStream handles a single complete event', () => {
  const stream = formatNDJSONLine('complete', { totalCreditsSpent: 15, budgetCredits: 30 });
  const events = parseNDJSONStream(stream);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'complete');
});

// ── Credit refund math ──

// Replicate the refund logic from the route
function computeRefund(budget: number, totalCreditsSpent: number): number {
  const unused = budget - totalCreditsSpent;
  return unused > 0 ? unused : 0;
}

test('computeRefund returns unused credits when spent < budget', () => {
  assert.equal(computeRefund(30, 20), 10);
  assert.equal(computeRefund(50, 15), 35);
});

test('computeRefund returns 0 when spent equals budget', () => {
  assert.equal(computeRefund(30, 30), 0);
});

test('computeRefund returns 0 when spent exceeds budget', () => {
  assert.equal(computeRefund(30, 35), 0);
});

test('computeRefund returns full budget when nothing spent', () => {
  assert.equal(computeRefund(30, 0), 30);
});

// Replicate the failure refund: full budget refunded on error
function computeFailureRefund(budget: number): number {
  return budget;
}

test('computeFailureRefund returns full budget on failure', () => {
  assert.equal(computeFailureRefund(30), 30);
  assert.equal(computeFailureRefund(50), 50);
});

// ── Budget clamping ──

// Replicate the budget clamping from the route
function clampBudget(budgetCredits: number | undefined): number {
  const DEFAULT = 30;
  const MAX = 50;
  if (typeof budgetCredits === 'number') return Math.min(budgetCredits, MAX);
  return DEFAULT;
}

test('clampBudget returns default when undefined', () => {
  assert.equal(clampBudget(undefined), 30);
});

test('clampBudget clamps to max 50', () => {
  assert.equal(clampBudget(100), 50);
  assert.equal(clampBudget(50), 50);
});

test('clampBudget preserves values within range', () => {
  assert.equal(clampBudget(30), 30);
  assert.equal(clampBudget(10), 10);
  assert.equal(clampBudget(45), 45);
});

test('clampBudget handles edge case of 0', () => {
  assert.equal(clampBudget(0), 0);
});

// ── Stream vs legacy mode selection ──

// Replicate the stream parameter check
function wantsStream(streamParam: string | null): boolean {
  return streamParam !== 'false';
}

test('wantsStream returns true when param is null (default)', () => {
  assert.equal(wantsStream(null), true);
});

test('wantsStream returns false when param is "false"', () => {
  assert.equal(wantsStream('false'), false);
});

test('wantsStream returns true when param is "true"', () => {
  assert.equal(wantsStream('true'), true);
});

test('wantsStream returns true when param is any other value', () => {
  assert.equal(wantsStream('1'), true);
  assert.equal(wantsStream('yes'), true);
});

// ── Response headers ──

// Replicate the streaming response headers
const STREAM_HEADERS = {
  'Content-Type': 'application/x-ndjson',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

test('streaming response uses application/x-ndjson content type', () => {
  assert.equal(STREAM_HEADERS['Content-Type'], 'application/x-ndjson');
});

test('streaming response disables caching', () => {
  assert.equal(STREAM_HEADERS['Cache-Control'], 'no-cache');
});

test('streaming response uses keep-alive connection', () => {
  assert.equal(STREAM_HEADERS['Connection'], 'keep-alive');
});

// ── Step event callback shape ──

// Replicate the onStep callback data shape from the route
function formatStepCallbackData(step: { name: string; status: string; creditsSpent: number; error?: string }, current: { totalCreditsSpent: number; budgetCredits: number }) {
  return {
    name: step.name,
    status: step.status,
    creditsSpent: step.creditsSpent,
    error: step.error,
    totalCreditsSpent: current.totalCreditsSpent,
    budgetCredits: current.budgetCredits,
  };
}

test('formatStepCallbackData includes all expected fields', () => {
  const data = formatStepCallbackData(
    { name: 'brief', status: 'completed', creditsSpent: 5 },
    { totalCreditsSpent: 5, budgetCredits: 30 },
  );
  assert.equal(data.name, 'brief');
  assert.equal(data.status, 'completed');
  assert.equal(data.creditsSpent, 5);
  assert.equal(data.error, undefined);
  assert.equal(data.totalCreditsSpent, 5);
  assert.equal(data.budgetCredits, 30);
});

test('formatStepCallbackData preserves error field when present', () => {
  const data = formatStepCallbackData(
    { name: 'hooks', status: 'failed', creditsSpent: 3, error: 'api_timeout' },
    { totalCreditsSpent: 8, budgetCredits: 30 },
  );
  assert.equal(data.error, 'api_timeout');
  assert.equal(data.status, 'failed');
});

// ── Full stream lifecycle simulation ──

test('full stream lifecycle: steps then complete event', () => {
  const lines: string[] = [];
  const send = (event: string, data: unknown) => {
    lines.push(formatNDJSONLine(event, data));
  };

  // Simulate a director run with 3 steps
  send('step', { name: 'brief', status: 'completed', creditsSpent: 5, totalCreditsSpent: 5, budgetCredits: 30 });
  send('step', { name: 'hooks', status: 'completed', creditsSpent: 3, totalCreditsSpent: 8, budgetCredits: 30 });
  send('step', { name: 'angles', status: 'completed', creditsSpent: 4, totalCreditsSpent: 12, budgetCredits: 30 });
  send('complete', { totalCreditsSpent: 12, budgetCredits: 30, assetPackageId: 'pkg-abc' });

  const events = parseNDJSONStream(lines.join(''));
  assert.equal(events.length, 4);
  assert.equal(events[0].event, 'step');
  assert.equal(events[0].data.name, 'brief');
  assert.equal(events[3].event, 'complete');
  assert.equal(events[3].data.assetPackageId, 'pkg-abc');

  // Verify credit progression
  assert.equal(events[0].data.totalCreditsSpent, 5);
  assert.equal(events[1].data.totalCreditsSpent, 8);
  assert.equal(events[2].data.totalCreditsSpent, 12);
  assert.equal(events[3].data.totalCreditsSpent, 12);

  // Refund should be 30 - 12 = 18
  assert.equal(computeRefund(30, 12), 18);
});

test('full stream lifecycle: error event triggers full refund', () => {
  const lines: string[] = [];
  const send = (event: string, data: unknown) => {
    lines.push(formatNDJSONLine(event, data));
  };

  send('step', { name: 'brief', status: 'completed', creditsSpent: 5, totalCreditsSpent: 5, budgetCredits: 30 });
  send('error', { error: 'director_failed', detail: 'api_timeout' });

  const events = parseNDJSONStream(lines.join(''));
  assert.equal(events.length, 2);
  assert.equal(events[1].event, 'error');

  // On error, full budget is refunded
  assert.equal(computeFailureRefund(30), 30);
});
