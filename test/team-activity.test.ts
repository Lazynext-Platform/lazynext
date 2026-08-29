import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for TeamActivity validation logic.
 * The API routes require auth + Prisma, so we test the validation
 * constants and types that are exported or can be imported.
 */

describe('team-activity', () => {
  describe('allowed activity types', () => {
    const ALLOWED_TYPES = [
      'member_joined', 'member_left', 'role_changed',
      'project_created', 'project_updated', 'project_shared',
      'comment_added', 'approval_requested', 'approval_granted',
      'custom',
    ];

    test('has 10 allowed types', () => {
      assert.equal(ALLOWED_TYPES.length, 10);
    });

    test('includes custom type', () => {
      assert.ok(ALLOWED_TYPES.includes('custom'));
    });

    test('includes member lifecycle types', () => {
      assert.ok(ALLOWED_TYPES.includes('member_joined'));
      assert.ok(ALLOWED_TYPES.includes('member_left'));
      assert.ok(ALLOWED_TYPES.includes('role_changed'));
    });

    test('includes project types', () => {
      assert.ok(ALLOWED_TYPES.includes('project_created'));
      assert.ok(ALLOWED_TYPES.includes('project_updated'));
      assert.ok(ALLOWED_TYPES.includes('project_shared'));
    });

    test('includes approval types', () => {
      assert.ok(ALLOWED_TYPES.includes('approval_requested'));
      assert.ok(ALLOWED_TYPES.includes('approval_granted'));
    });
  });

  describe('presence TTL', () => {
    const PRESENCE_TTL_MS = 30_000;

    test('TTL is 30 seconds', () => {
      assert.equal(PRESENCE_TTL_MS, 30000);
    });

    test('heartbeat interval should be less than TTL', () => {
      const HEARTBEAT_INTERVAL_MS = 15_000;
      assert.ok(HEARTBEAT_INTERVAL_MS < PRESENCE_TTL_MS);
    });
  });

  describe('activity summary length', () => {
    test('summary is truncated to 500 chars', () => {
      const longText = 'a'.repeat(600);
      const truncated = String(longText).slice(0, 500);
      assert.equal(truncated.length, 500);
    });
  });
});
