import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPipelineError } from '../src/lib/pipeline-error-classifier.ts';
import type { PipelineErrorCode } from '../src/lib/pipeline-error-classifier.ts';

/**
 * Unit tests for src/lib/pipeline-error-classifier.ts — classifyPipelineError().
 *
 * classifyPipelineError maps a raw error string to a stable, controlled
 * PipelineErrorCode so internal details (stack traces, file paths) are never
 * leaked to API clients. The raw error is always logged server-side; only the
 * code is sent to the client.
 */

describe('classifyPipelineError — rate limit', () => {
  test('maps "rate_limited" substring to rate_limited', () => {
    assert.equal(classifyPipelineError('rate_limited by provider'), 'rate_limited');
  });

  test('maps "rate limit" substring to rate_limited', () => {
    assert.equal(classifyPipelineError('hit rate limit, slow down'), 'rate_limited');
  });

  test('maps HTTP 429 to rate_limited', () => {
    assert.equal(classifyPipelineError('Request failed with status 429'), 'rate_limited');
  });

  test('is case-insensitive for rate limit signals', () => {
    assert.equal(classifyPipelineError('RATE LIMIT exceeded'), 'rate_limited');
    assert.equal(classifyPipelineError('Rate_Limited'), 'rate_limited');
  });
});

describe('classifyPipelineError — insufficient credits', () => {
  test('maps "insufficient" + "credit" to insufficient_credits', () => {
    assert.equal(
      classifyPipelineError('INSUFFICIENT_CREDITS: balance too low'),
      'insufficient_credits',
    );
  });

  test('maps lowercase "insufficient credits" to insufficient_credits', () => {
    assert.equal(
      classifyPipelineError('you have insufficient credits for this operation'),
      'insufficient_credits',
    );
  });

  test('does NOT map "insufficient" alone (requires both words)', () => {
    // "insufficient" without "credit" falls through to unknown
    assert.equal(classifyPipelineError('insufficient permissions'), 'unknown');
  });

  test('does NOT map "credit" alone (requires both words)', () => {
    assert.equal(classifyPipelineError('credit balance updated'), 'unknown');
  });
});

describe('classifyPipelineError — timeout', () => {
  test('maps "timeout" to timeout', () => {
    assert.equal(classifyPipelineError('Request timeout after 30s'), 'timeout');
  });

  test('maps "timed out" to timeout', () => {
    assert.equal(classifyPipelineError('the operation timed out'), 'timeout');
  });

  test('is case-insensitive for timeout', () => {
    assert.equal(classifyPipelineError('TIMEOUT'), 'timeout');
  });
});

describe('classifyPipelineError — network', () => {
  test('maps "network" to network', () => {
    assert.equal(classifyPipelineError('network error occurred'), 'network');
  });

  test('maps "fetch" to network', () => {
    assert.equal(classifyPipelineError('fetch failed'), 'network');
  });

  test('maps "ECONNREFUSED" to network', () => {
    assert.equal(classifyPipelineError('connect ECONNREFUSED 127.0.0.1:443'), 'network');
  });
});

describe('classifyPipelineError — auth', () => {
  test('maps "auth" to auth', () => {
    assert.equal(classifyPipelineError('auth token invalid'), 'auth');
  });

  test('maps "unauthorized" to auth', () => {
    assert.equal(classifyPipelineError('unauthorized access'), 'auth');
  });

  test('maps HTTP 401 to auth', () => {
    assert.equal(classifyPipelineError('401 Unauthorized'), 'auth');
  });
});

describe('classifyPipelineError — server', () => {
  test('maps "server" to server', () => {
    assert.equal(classifyPipelineError('internal server error'), 'server');
  });

  test('maps HTTP 500 to server', () => {
    assert.equal(classifyPipelineError('500 Internal Server Error'), 'server');
  });

  test('maps HTTP 502 to server', () => {
    assert.equal(classifyPipelineError('502 Bad Gateway'), 'server');
  });

  test('maps HTTP 503 to server', () => {
    assert.equal(classifyPipelineError('503 Service Unavailable'), 'server');
  });
});

describe('classifyPipelineError — precedence & unknown', () => {
  test('returns unknown for unrecognized error strings', () => {
    assert.equal(classifyPipelineError('something weird happened'), 'unknown');
    assert.equal(classifyPipelineError(''), 'unknown');
  });

  test('rate_limited takes precedence over a 429-only check (both match, rate_limited wins)', () => {
    // "429 rate limit" matches the rate_limited branch first
    assert.equal(classifyPipelineError('429 rate limit'), 'rate_limited');
  });

  test('insufficient_credits is checked before timeout/network/auth/server', () => {
    // A message mentioning both insufficient credits and a timeout should map
    // to insufficient_credits because that branch is evaluated first.
    assert.equal(
      classifyPipelineError('insufficient credits caused a timeout'),
      'insufficient_credits',
    );
  });

  test('timeout is checked before network/auth/server', () => {
    assert.equal(classifyPipelineError('timeout while fetching from server'), 'timeout');
  });

  test('network is checked before auth/server', () => {
    assert.equal(classifyPipelineError('network failure with 401'), 'network');
  });

  test('auth is checked before server', () => {
    assert.equal(classifyPipelineError('auth error on the server'), 'auth');
  });

  test('every returned code is a valid PipelineErrorCode', () => {
    const samples = [
      'rate_limited',
      'rate limit',
      '429',
      'insufficient credits',
      'timeout',
      'timed out',
      'network',
      'fetch failed',
      'ECONNREFUSED',
      'auth',
      'unauthorized',
      '401',
      'server',
      '500',
      '502',
      '503',
      'totally unknown error',
    ];
    const valid: PipelineErrorCode[] = [
      'rate_limited',
      'insufficient_credits',
      'timeout',
      'network',
      'auth',
      'server',
      'unknown',
    ];
    for (const s of samples) {
      const code = classifyPipelineError(s);
      assert.ok(valid.includes(code), `code "${code}" for "${s}" should be a valid PipelineErrorCode`);
    }
  });
});
