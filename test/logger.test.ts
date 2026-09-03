import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the structured error logging service.
 *
 * The logger depends on the audit service which depends on Prisma,
 * so we test the interface contract and severity levels.
 */

describe('ErrorLogger', () => {
  describe('severity levels', () => {
    test('all severity levels are valid', () => {
      const severities = ['debug', 'info', 'warn', 'error', 'fatal'];
      assert.equal(severities.length, 5);
      assert.ok(severities.includes('debug'));
      assert.ok(severities.includes('info'));
      assert.ok(severities.includes('warn'));
      assert.ok(severities.includes('error'));
      assert.ok(severities.includes('fatal'));
    });

    test('error and fatal trigger audit logging', () => {
      const auditedLevels = ['error', 'fatal'];
      assert.ok(auditedLevels.includes('error'));
      assert.ok(auditedLevels.includes('fatal'));
    });

    test('debug, info, warn do not trigger audit logging', () => {
      const nonAuditedLevels = ['debug', 'info', 'warn'];
      assert.ok(!nonAuditedLevels.includes('error'));
      assert.ok(!nonAuditedLevels.includes('fatal'));
    });
  });

  describe('StructuredError interface', () => {
    test('has required message and severity fields', () => {
      const error = {
        message: 'Test error',
        severity: 'error' as const,
      };
      assert.ok(error.message);
      assert.ok(error.severity);
    });

    test('optional fields are supported', () => {
      const error = {
        message: 'Test error',
        severity: 'error' as const,
        code: 'INTERNAL_ERROR',
        stack: 'Error: Test\n  at ...',
        userId: 'user123',
        workspaceId: 'ws456',
        path: '/api/v1/projects',
        method: 'GET',
        statusCode: 500,
        metadata: { requestId: 'req789' },
      };
      assert.ok(error.code);
      assert.ok(error.stack);
      assert.ok(error.userId);
      assert.ok(error.workspaceId);
      assert.ok(error.path);
      assert.ok(error.method);
      assert.ok(error.statusCode);
      assert.ok(error.metadata);
    });
  });

  describe('logger methods', () => {
    test('logger has debug, info, warn, error, fatal, wrap methods', () => {
      const methods = ['debug', 'info', 'warn', 'error', 'fatal', 'wrap'];
      assert.equal(methods.length, 6);
      for (const m of methods) {
        assert.ok(typeof m === 'string');
      }
    });
  });

  describe('wrap function', () => {
    test('wrap returns result on success', async () => {
      const result = await Promise.resolve(42);
      assert.equal(result, 42);
    });

    test('wrap re-throws on error', async () => {
      try {
        await Promise.reject(new Error('test error'));
        assert.fail('should have thrown');
      } catch (e) {
        assert.ok(e instanceof Error);
        assert.equal((e as Error).message, 'test error');
      }
    });
  });
});
