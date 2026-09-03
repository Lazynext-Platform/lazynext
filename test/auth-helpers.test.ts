import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateApiKey, hashApiKey } from '../src/lib/api-key-crypto.ts';

/**
 * Tests for the centralized authorization helpers.
 *
 * requireAuth, requireRole, and requireApiKey depend on NextAuth session
 * and Prisma, which can't be easily imported in isolation. These tests
 * cover the pure functions: generateApiKey and hashApiKey.
 */

describe('auth helpers', () => {
  describe('generateApiKey', () => {
    test('produces a key with the ln_live_ prefix', () => {
      const { key } = generateApiKey();
      assert.ok(key.startsWith('ln_live_'), `expected ln_live_ prefix, got: ${key.slice(0, 10)}`);
    });

    test('produces a key with sufficient entropy (at least 40 chars after prefix)', () => {
      const { key } = generateApiKey();
      assert.ok(key.length >= 48, `expected at least 48 chars, got ${key.length}`);
    });

    test('produces unique keys on successive calls', () => {
      const { key: k1 } = generateApiKey();
      const { key: k2 } = generateApiKey();
      assert.notEqual(k1, k2);
    });

    test('produces a keyHash that is a 64-char hex string (SHA-256)', () => {
      const { keyHash } = generateApiKey();
      assert.ok(/^[0-9a-f]{64}$/.test(keyHash), `expected 64-char hex, got: ${keyHash}`);
    });

    test('produces a keyPrefix of 12 chars', () => {
      const { key, keyPrefix } = generateApiKey();
      assert.equal(keyPrefix.length, 12);
      assert.equal(keyPrefix, key.slice(0, 12));
    });

    test('keyPrefix starts with ln_live_', () => {
      const { keyPrefix } = generateApiKey();
      assert.ok(keyPrefix.startsWith('ln_live_'));
    });
  });

  describe('hashApiKey', () => {
    test('produces a deterministic SHA-256 hash', () => {
      const key = 'ln_live_testkey123';
      const h1 = hashApiKey(key);
      const h2 = hashApiKey(key);
      assert.equal(h1, h2);
    });

    test('produces a 64-char hex string', () => {
      const hash = hashApiKey('ln_live_anykey');
      assert.ok(/^[0-9a-f]{64}$/.test(hash));
    });

    test('produces different hashes for different keys', () => {
      const h1 = hashApiKey('ln_live_key1');
      const h2 = hashApiKey('ln_live_key2');
      assert.notEqual(h1, h2);
    });

    test('handles empty string', () => {
      const hash = hashApiKey('');
      assert.ok(/^[0-9a-f]{64}$/.test(hash));
    });
  });

  describe('generateApiKey + hashApiKey consistency', () => {
    test('hashApiKey of generated key matches keyHash', () => {
      const { key, keyHash } = generateApiKey();
      assert.equal(hashApiKey(key), keyHash);
    });
  });
});
