import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for token-crypto.ts — encryption/decryption and plaintext fallback.
 * These tests set/unset the TOKEN_ENCRYPTION_KEY env var to test both paths.
 */

describe('token-crypto — encryption and decryption', () => {
  test('encryptToken returns plain: prefix when no key is set', async () => {
    const origKey = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    try {
      const { encryptToken } = await import('../src/lib/publishing/token-crypto');
      const result = await encryptToken('my-secret-token');
      assert.ok(result.startsWith('plain:'));
      assert.equal(result, 'plain:my-secret-token');
    } finally {
      if (origKey) process.env.TOKEN_ENCRYPTION_KEY = origKey;
    }
  });

  test('decryptToken returns plaintext for plain: prefix', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    try {
      const { decryptToken } = await import('../src/lib/publishing/token-crypto');
      const result = await decryptToken('plain:my-secret-token');
      assert.equal(result, 'my-secret-token');
    } finally {
      if (process.env.TOKEN_ENCRYPTION_KEY === undefined) {
        // restore nothing — was already unset
      }
    }
  });

  test('encryptToken and decryptToken round-trip with encryption key', async () => {
    const origKey = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-12345';
    try {
      // Clear module cache to pick up new env var
      const mod = await import('../src/lib/publishing/token-crypto');
      const { encryptToken, decryptToken } = mod;
      const plaintext = 'my-oauth-access-token-abc123';
      const encrypted = await encryptToken(plaintext);
      // Should NOT be plain: prefix
      assert.ok(!encrypted.startsWith('plain:'));
      // Should contain IV:ciphertext format
      assert.ok(encrypted.includes(':'));
      const decrypted = await decryptToken(encrypted);
      assert.equal(decrypted, plaintext);
    } finally {
      if (origKey) {
        process.env.TOKEN_ENCRYPTION_KEY = origKey;
      } else {
        delete process.env.TOKEN_ENCRYPTION_KEY;
      }
    }
  });

  test('decryptToken throws on invalid encrypted format', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-12345';
    try {
      const { decryptToken } = await import('../src/lib/publishing/token-crypto');
      await assert.rejects(
        () => decryptToken('not-a-valid-format'),
        /invalid_encrypted_token/,
      );
    } finally {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    }
  });

  test('different encryptions produce different ciphertexts (random IV)', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-12345';
    try {
      const { encryptToken } = await import('../src/lib/publishing/token-crypto');
      const plaintext = 'same-token';
      const enc1 = await encryptToken(plaintext);
      const enc2 = await encryptToken(plaintext);
      // Different IVs should produce different ciphertexts
      assert.notEqual(enc1, enc2);
    } finally {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    }
  });
});

describe('token-refresh — isTokenExpired helper', () => {
  test('returns false for null expiry (no expiry known)', async () => {
    const { isTokenExpired } = await import('../src/lib/publishing/token-refresh');
    assert.equal(isTokenExpired(null), false);
  });

  test('returns false for future expiry', async () => {
    const { isTokenExpired } = await import('../src/lib/publishing/token-refresh');
    const future = new Date(Date.now() + 3600_000); // 1 hour from now
    assert.equal(isTokenExpired(future), false);
  });

  test('returns true for past expiry', async () => {
    const { isTokenExpired } = await import('../src/lib/publishing/token-refresh');
    const past = new Date(Date.now() - 1000); // 1 second ago
    assert.equal(isTokenExpired(past), true);
  });

  test('returns true for expiry within buffer window', async () => {
    const { isTokenExpired } = await import('../src/lib/publishing/token-refresh');
    // 30 seconds from now — within the default 60s buffer
    const soon = new Date(Date.now() + 30_000);
    assert.equal(isTokenExpired(soon), true);
  });

  test('returns false for expiry outside buffer window', async () => {
    const { isTokenExpired } = await import('../src/lib/publishing/token-refresh');
    // 2 minutes from now — outside the default 60s buffer
    const later = new Date(Date.now() + 120_000);
    assert.equal(isTokenExpired(later), false);
  });
});

describe('token-refresh — refreshPlatformToken', () => {
  test('returns null for unsupported platform', async () => {
    const { refreshPlatformToken } = await import('../src/lib/publishing/token-refresh');
    const fakeConn = {
      id: 'test-id',
      userId: 'test-user',
      platform: 'unsupported_platform',
      accessToken: 'plain:token',
      refreshToken: 'plain:refresh',
      tokenExpiresAt: null,
      platformUserId: null,
      platformUsername: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await refreshPlatformToken(fakeConn as any);
    assert.equal(result, null);
  });

  test('returns null when no refresh token is stored', async () => {
    const { refreshPlatformToken } = await import('../src/lib/publishing/token-refresh');
    const fakeConn = {
      id: 'test-id',
      userId: 'test-user',
      platform: 'youtube',
      accessToken: 'plain:token',
      refreshToken: null,
      tokenExpiresAt: null,
      platformUserId: null,
      platformUsername: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await refreshPlatformToken(fakeConn as any);
    assert.equal(result, null);
  });

  test('returns null when client credentials are not configured', async () => {
    const origClientId = process.env.YOUTUBE_CLIENT_ID;
    const origClientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;
    try {
      const { refreshPlatformToken } = await import('../src/lib/publishing/token-refresh');
      const fakeConn = {
        id: 'test-id',
        userId: 'test-user',
        platform: 'youtube',
        accessToken: 'plain:token',
        refreshToken: 'plain:refresh-token',
        tokenExpiresAt: null,
        platformUserId: null,
        platformUsername: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await refreshPlatformToken(fakeConn as any);
      assert.equal(result, null);
    } finally {
      if (origClientId) process.env.YOUTUBE_CLIENT_ID = origClientId;
      if (origClientSecret) process.env.YOUTUBE_CLIENT_SECRET = origClientSecret;
    }
  });
});
