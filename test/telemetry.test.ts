import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the telemetry structured logging utility.
 *
 * Verifies that logToolExecution and logProviderRouting emit valid JSON
 * with all required fields and a valid ISO 8601 timestamp. Output is
 * captured from console.log.
 */
import { logToolExecution, logProviderRouting } from '@/lib/telemetry';

/** Capture console.log output for the duration of a callback. */
function captureConsoleLog<T>(fn: () => T): { output: string; result: T } {
  const original = console.log;
  let output = '';
  console.log = (msg: string) => {
    output += msg;
  };
  try {
    const result = fn();
    return { output, result };
  } finally {
    console.log = original;
  }
}

describe('Telemetry — logToolExecution', () => {
  it('produces valid JSON with all required fields', () => {
    const { output } = captureConsoleLog(() =>
      logToolExecution({
        tool: 'creative.generateBrief',
        userId: 'user_123',
        cost: 3,
        durationMs: 1250,
        success: true,
      }),
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.type, 'tool_execution');
    assert.equal(parsed.tool, 'creative.generateBrief');
    assert.equal(parsed.userId, 'user_123');
    assert.equal(parsed.cost, 3);
    assert.equal(parsed.durationMs, 1250);
    assert.equal(parsed.success, true);
    assert.ok(typeof parsed.timestamp === 'string');
  });

  it('includes error and model fields when provided', () => {
    const { output } = captureConsoleLog(() =>
      logToolExecution({
        tool: 'creative.generateScript',
        userId: 'user_456',
        cost: 0,
        durationMs: 50,
        success: false,
        error: 'no_json_in_creative_output',
        model: 'bytedance/doubao-seed-2.1-turbo-260628',
      }),
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.success, false);
    assert.equal(parsed.error, 'no_json_in_creative_output');
    assert.equal(parsed.model, 'bytedance/doubao-seed-2.1-turbo-260628');
  });

  it('emits a valid ISO 8601 timestamp', () => {
    const { output } = captureConsoleLog(() =>
      logToolExecution({
        tool: 'creative.scoreCombination',
        userId: 'user_789',
        cost: 2,
        durationMs: 300,
        success: true,
      }),
    );

    const parsed = JSON.parse(output);
    const ts = new Date(parsed.timestamp);
    assert.ok(!isNaN(ts.getTime()), 'timestamp should parse to a valid Date');
    assert.ok(parsed.timestamp.includes('T'), 'timestamp should be ISO 8601 format');
    assert.ok(parsed.timestamp.endsWith('Z'), 'timestamp should be UTC (Z suffix)');
  });
});

describe('Telemetry — logProviderRouting', () => {
  it('produces valid JSON with all required fields', () => {
    const { output } = captureConsoleLog(() =>
      logProviderRouting({
        capability: 'text',
        planTier: 'free',
        selectedModel: 'bytedance/doubao-seed-2.1-turbo-260628',
        fallback: false,
      }),
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.type, 'provider_routing');
    assert.equal(parsed.capability, 'text');
    assert.equal(parsed.planTier, 'free');
    assert.equal(parsed.selectedModel, 'bytedance/doubao-seed-2.1-turbo-260628');
    assert.equal(parsed.fallback, false);
    assert.ok(typeof parsed.timestamp === 'string');
  });

  it('records fallback=true when the default model is used', () => {
    const { output } = captureConsoleLog(() =>
      logProviderRouting({
        capability: 'videoGeneration',
        planTier: 'pro',
        selectedModel: 'bytedance/seedance-2.0/image-to-video',
        fallback: true,
      }),
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.fallback, true);
    assert.equal(parsed.capability, 'videoGeneration');
    assert.equal(parsed.planTier, 'pro');
  });

  it('emits a valid ISO 8601 timestamp', () => {
    const { output } = captureConsoleLog(() =>
      logProviderRouting({
        capability: 'imageGeneration',
        planTier: 'starter',
        selectedModel: 'google/nano-banana-2/text-to-image',
        fallback: false,
      }),
    );

    const parsed = JSON.parse(output);
    const ts = new Date(parsed.timestamp);
    assert.ok(!isNaN(ts.getTime()), 'timestamp should parse to a valid Date');
    assert.ok(parsed.timestamp.includes('T'), 'timestamp should be ISO 8601 format');
    assert.ok(parsed.timestamp.endsWith('Z'), 'timestamp should be UTC (Z suffix)');
  });
});
