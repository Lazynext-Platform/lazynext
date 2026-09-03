import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { hashToken, isSessionRevoked } from '../src/lib/session-revocation.ts';

/**
 * Tests for session revocation utilities.
 *
 * The critical invariant: hashToken() (Web Crypto API) must produce the
 * same SHA-256 hash as auth.ts's createHash('sha256') (Node.js crypto).
 * If they diverge, every session would be immediately "revoked" because
 * the Session row lookup would never match.
 */
describe('session revocation', () => {
  describe('hashToken', () => {
    test('produces a 64-character hex string (SHA-256)', async () => {
      const hash = await hashToken('test-token-123');
      assert.equal(hash.length, 64);
      assert.ok(/^[0-9a-f]+$/.test(hash), 'expected hex string');
    });

    test('matches Node.js crypto.createHash SHA-256', async () => {
      const token = 'my-session-token-abc-123';
      const webCryptoHash = await hashToken(token);
      const nodeCryptoHash = createHash('sha256').update(token).digest('hex');
      assert.equal(webCryptoHash, nodeCryptoHash);
    });

    test('matches Node.js crypto for empty string', async () => {
      const webCryptoHash = await hashToken('');
      const nodeCryptoHash = createHash('sha256').update('').digest('hex');
      assert.equal(webCryptoHash, nodeCryptoHash);
    });

    test('matches Node.js crypto for unicode characters', async () => {
      const token = 'tökën-ünïcödé-测试-🔐';
      const webCryptoHash = await hashToken(token);
      const nodeCryptoHash = createHash('sha256').update(token, 'utf8').digest('hex');
      assert.equal(webCryptoHash, nodeCryptoHash);
    });

    test('produces different hashes for different tokens', async () => {
      const h1 = await hashToken('token-one');
      const h2 = await hashToken('token-two');
      assert.notEqual(h1, h2);
    });

    test('is deterministic (same input → same output)', async () => {
      const h1 = await hashToken('deterministic-test');
      const h2 = await hashToken('deterministic-test');
      assert.equal(h1, h2);
    });

    test('produces correct hash for known input', async () => {
      // Known SHA-256 of "test"
      const hash = await hashToken('test');
      assert.equal(hash, '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });

  describe('isSessionRevoked', () => {
    test('returns false for empty token (JWT-only sessions skip check)', async () => {
      const revoked = await isSessionRevoked('');
      assert.equal(revoked, false);
    });

    test('returns false for null-ish token', async () => {
      const revoked = await isSessionRevoked('' as string);
      assert.equal(revoked, false);
    });
  });
});
