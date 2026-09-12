import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { logger } from '@/lib/services/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Logger — severity methods
// ─────────────────────────────────────────────────────────────────────────────

describe('logger', () => {
  it('exposes debug, info, warn, error, fatal methods', () => {
    assert.equal(typeof logger.debug, 'function');
    assert.equal(typeof logger.info, 'function');
    assert.equal(typeof logger.warn, 'function');
    assert.equal(typeof logger.error, 'function');
    assert.equal(typeof logger.fatal, 'function');
  });

  it('exposes wrap method', () => {
    assert.equal(typeof logger.wrap, 'function');
  });

  it('debug() does not throw', () => {
    assert.doesNotThrow(() => logger.debug('test debug message'));
  });

  it('info() does not throw', () => {
    assert.doesNotThrow(() => logger.info('test info message'));
  });

  it('warn() does not throw', () => {
    assert.doesNotThrow(() => logger.warn('test warn message'));
  });

  it('error() does not throw', () => {
    assert.doesNotThrow(() => logger.error('test error message'));
  });

  it('fatal() does not throw', () => {
    assert.doesNotThrow(() => logger.fatal('test fatal message'));
  });

  it('debug() accepts metadata', () => {
    assert.doesNotThrow(() => logger.debug('test', { key: 'value', num: 42 }));
  });

  it('error() accepts structured error options', () => {
    assert.doesNotThrow(() =>
      logger.error('test error', { code: 'TEST_ERROR', statusCode: 500, path: '/api/test' }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Logger.wrap
// ─────────────────────────────────────────────────────────────────────────────

describe('logger.wrap', () => {
  it('returns the result of a successful async function', async () => {
    const result = await logger.wrap(async () => 42);
    assert.equal(result, 42);
  });

  it('re-throws after logging when the function throws', async () => {
    await assert.rejects(
      () => logger.wrap(async () => { throw new Error('test error'); }),
      { message: 'test error' },
    );
  });

  it('accepts context metadata', async () => {
    const result = await logger.wrap(
      async () => 'success',
      { path: '/api/test', method: 'GET' },
    );
    assert.equal(result, 'success');
  });

  it('re-throws non-Error exceptions', async () => {
    await assert.rejects(
      () => logger.wrap(async () => { throw 'string error'; }),
      /string error/,
    );
  });
});
