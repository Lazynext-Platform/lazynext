import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

// Mock fetch and process.env before importing the module
const originalFetch = globalThis.fetch;
const originalEnv = process.env;

function setupMockFetch(responses: Array<{ ok: boolean; status: number }>) {
  let callIdx = 0;
  const calls: Array<{ url: string; body: string }> = [];
  const mockFetch = async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body || '') });
    const res = responses[callIdx] || { ok: true, status: 200 };
    callIdx++;
    return {
      ok: res.ok,
      status: res.status,
      json: async () => ({}),
      text: async () => '',
    } as Response;
  };
  globalThis.fetch = mockFetch as typeof fetch;
  return { calls, callCount: () => callIdx };
}

describe('Alerts', () => {
  test.beforeEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  test.afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  test('sendAlert logs to console when no webhook URL is configured', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    const logSpy = mock.method(console, 'log', () => {});
    const { sendAlert } = await import('../src/lib/observability/alerts.ts');
    await sendAlert({
      level: 'critical',
      category: 'pipeline',
      message: 'Test alert',
    });
    assert.ok(logSpy.mock.calls.length > 0);
    const logged = logSpy.mock.calls[0].arguments[0] as string;
    assert.ok(logged.includes('ALERT-CRITICAL'));
    assert.ok(logged.includes('Test alert'));
    logSpy.mock.restore();
  });

  test('sendAlert sends to webhook when URL is configured', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://example.com/webhook';
    process.env.ALERT_WEBHOOK_SECRET = 'secret123';
    const { calls } = setupMockFetch([{ ok: true, status: 200 }]);
    const { sendAlert } = await import('../src/lib/observability/alerts.ts');
    await sendAlert({
      level: 'warning',
      category: 'credits',
      message: 'Credit error',
      userId: 'user123',
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://example.com/webhook');
    const body = JSON.parse(calls[0].body);
    assert.equal(body.level, 'warning');
    assert.equal(body.category, 'credits');
    assert.equal(body.message, 'Credit error');
    assert.equal(body.userId, 'user123');
  });

  test('alertPipelineFailed sends critical alert with pipeline details', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    const logSpy = mock.method(console, 'log', () => {});
    const { alertPipelineFailed } = await import('../src/lib/observability/alerts.ts');
    await alertPipelineFailed('user1', 'pipe1', 'stage_failed', { stage: 'media_generation' });
    const logged = logSpy.mock.calls[0].arguments[0] as string;
    assert.ok(logged.includes('ALERT-CRITICAL'));
    assert.ok(logged.includes('pipe1'));
    assert.ok(logged.includes('stage_failed'));
    logSpy.mock.restore();
  });

  test('alertCreditError sends critical alert for credit issues', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    const logSpy = mock.method(console, 'log', () => {});
    const { alertCreditError } = await import('../src/lib/observability/alerts.ts');
    await alertCreditError('user1', 'insufficient_credits');
    const logged = logSpy.mock.calls[0].arguments[0] as string;
    assert.ok(logged.includes('ALERT-CRITICAL'));
    assert.ok(logged.includes('credits'));
    logSpy.mock.restore();
  });

  test('sendAlert does not throw when webhook fails', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://example.com/webhook';
    globalThis.fetch = async () => { throw new Error('network error'); };
    const { sendAlert } = await import('../src/lib/observability/alerts.ts');
    // Should not throw
    await sendAlert({
      level: 'critical',
      category: 'system',
      message: 'Test',
    });
  });
});
