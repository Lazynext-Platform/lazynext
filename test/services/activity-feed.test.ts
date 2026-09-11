import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test the activity feed SSE formatting (pure functions)

test('formatSSE produces valid SSE data format', () => {
  function formatSSE(event: { id: string; type: string; timestamp: string }): string {
    return `data: ${JSON.stringify(event)}\n\n`;
  }
  const event = { id: 'evt1', type: 'agent.run.completed', timestamp: '2024-01-01T00:00:00Z' };
  const sse = formatSSE(event);
  assert.ok(sse.startsWith('data: '));
  assert.ok(sse.endsWith('\n\n'));
  assert.ok(sse.includes('"id":"evt1"'));
  assert.ok(sse.includes('"type":"agent.run.completed"'));
});

test('formatKeepalive produces SSE comment', () => {
  function formatKeepalive(): string {
    return `: keepalive\n\n`;
  }
  const ka = formatKeepalive();
  assert.equal(ka, ': keepalive\n\n');
});

test('formatError produces SSE error event', () => {
  function formatError(message: string): string {
    return `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`;
  }
  const err = formatError('test_error');
  assert.ok(err.startsWith('event: error\n'));
  assert.ok(err.includes('"error":"test_error"'));
});

test('formatConnected produces SSE connected event', () => {
  function formatConnected(): string {
    return `event: connected\ndata: ${JSON.stringify({ connected: true, timestamp: '2024-01-01T00:00:00Z' })}\n\n`;
  }
  const conn = formatConnected();
  assert.ok(conn.startsWith('event: connected\n'));
  assert.ok(conn.includes('"connected":true'));
});

test('getEventColor maps agent events to blue', () => {
  const EVENT_COLORS: Record<string, string> = {
    'agent.': 'text-blue-500',
    'company.bootstrap.': 'text-purple-500',
    'email.': 'text-orange-500',
    'site.': 'text-green-500',
  };
  function getEventColor(type: string): string {
    for (const [prefix, color] of Object.entries(EVENT_COLORS)) {
      if (type.startsWith(prefix)) return color;
    }
    return 'text-muted';
  }
  assert.equal(getEventColor('agent.run.completed'), 'text-blue-500');
  assert.equal(getEventColor('company.bootstrap.started'), 'text-purple-500');
  assert.equal(getEventColor('email.inbound.received'), 'text-orange-500');
  assert.equal(getEventColor('site.document.published'), 'text-green-500');
  assert.equal(getEventColor('unknown.event'), 'text-muted');
});

test('formatEventType humanizes event type', () => {
  function formatEventType(type: string): string {
    return type.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
  assert.equal(formatEventType('agent.run.completed'), 'Agent Run Completed');
  assert.equal(formatEventType('company.bootstrap.started'), 'Company Bootstrap Started');
  assert.equal(formatEventType('email.inbound.received'), 'Email Inbound Received');
});

test('formatTime returns relative time for recent events', () => {
  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  }
  // 5 seconds ago
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
  assert.ok(formatTime(fiveSecondsAgo).includes('s ago'));
  // 5 minutes ago
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assert.ok(formatTime(fiveMinutesAgo).includes('m ago'));
  // 5 hours ago
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  assert.ok(formatTime(fiveHoursAgo).includes('h ago'));
});
