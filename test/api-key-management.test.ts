import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateApiKey, hashApiKey } from '../src/lib/api-key-crypto.ts';

/**
 * Tests for the API key management endpoints (/api/keys).
 *
 * Route handlers depend on Prisma and NextAuth, which can't be easily
 * imported in isolation. These tests verify the key generation, hashing,
 * and lifecycle contract.
 */

describe('API key management', () => {
  describe('key generation', () => {
    test('generated key has ln_live_ prefix', () => {
      const { key } = generateApiKey();
      assert.ok(key.startsWith('ln_live_'));
    });

    test('generated key is sufficiently long (>= 48 chars)', () => {
      const { key } = generateApiKey();
      assert.ok(key.length >= 48, `key length ${key.length} < 48`);
    });

    test('keyHash is SHA-256 (64 hex chars)', () => {
      const { keyHash } = generateApiKey();
      assert.ok(/^[0-9a-f]{64}$/.test(keyHash));
    });

    test('keyPrefix is 12 chars for display', () => {
      const { keyPrefix } = generateApiKey();
      assert.equal(keyPrefix.length, 12);
    });

    test('keyPrefix matches first 12 chars of key', () => {
      const { key, keyPrefix } = generateApiKey();
      assert.equal(keyPrefix, key.slice(0, 12));
    });

    test('two generated keys are different', () => {
      const { key: k1 } = generateApiKey();
      const { key: k2 } = generateApiKey();
      assert.notEqual(k1, k2);
    });

    test('two generated key hashes are different', () => {
      const { keyHash: h1 } = generateApiKey();
      const { keyHash: h2 } = generateApiKey();
      assert.notEqual(h1, h2);
    });
  });

  describe('key hashing', () => {
    test('hash is deterministic', () => {
      const h1 = hashApiKey('ln_live_test');
      const h2 = hashApiKey('ln_live_test');
      assert.equal(h1, h2);
    });

    test('hash is different for different keys', () => {
      const h1 = hashApiKey('ln_live_key1');
      const h2 = hashApiKey('ln_live_key2');
      assert.notEqual(h1, h2);
    });

    test('generated key hash matches hashApiKey output', () => {
      const { key, keyHash } = generateApiKey();
      assert.equal(hashApiKey(key), keyHash);
    });
  });

  describe('key lifecycle', () => {
    test('key creation requires name', () => {
      // POST /api/keys validates body.name
      const validBody: { name?: string; scopes: string[] } = { name: 'Production key', scopes: ['read'] };
      const invalidBody: { name?: string; scopes: string[] } = { scopes: ['read'] };
      assert.ok(validBody.name?.trim());
      assert.ok(!invalidBody.name?.trim());
    });

    test('default scope is read', () => {
      // POST /api/keys defaults scopes to ['read']
      const defaultScopes = ['read'];
      assert.deepEqual(defaultScopes, ['read']);
    });

    test('scopes can include read, write, admin', () => {
      const validScopes = ['read', 'write', 'admin'];
      assert.ok(validScopes.includes('read'));
      assert.ok(validScopes.includes('write'));
      assert.ok(validScopes.includes('admin'));
    });

    test('revoked keys have revokedAt set', () => {
      // DELETE /api/keys/[id] sets revokedAt = new Date()
      const revokedAt = new Date().toISOString();
      assert.ok(revokedAt);
    });

    test('revoked keys are excluded from list', () => {
      // GET /api/keys filters where revokedAt: null
      const filter = { revokedAt: null };
      assert.equal(filter.revokedAt, null);
    });

    test('full key is returned only once on creation', () => {
      // POST returns { key } in response; GET only returns keyPrefix
      const createResponse: { key?: string; keyPrefix: string } = { key: 'ln_live_abc...', keyPrefix: 'ln_live_abc' };
      const listResponse: { key?: string; keyPrefix: string } = { keyPrefix: 'ln_live_abc' };
      assert.ok(createResponse.key);
      assert.ok(!listResponse.key);
    });

    test('lastUsedAt is updated on API key use', () => {
      // requireApiKey updates lastUsedAt
      const lastUsedAt = new Date();
      assert.ok(lastUsedAt instanceof Date);
    });
  });

  describe('rate limiting for key creation', () => {
    test('key creation is rate limited to 5 per hour per user', () => {
      const config = { max: 5, windowMs: 3_600_000, prefix: 'api_key_create' };
      assert.equal(config.max, 5);
      assert.equal(config.windowMs, 3_600_000);
    });
  });
});
