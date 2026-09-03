import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, isUrlSafe } from '../src/lib/security.ts';

describe('Security utilities', () => {
  describe('hashPassword / verifyPassword', () => {
    test('hashes a password and verifies it correctly', async () => {
      const hash = await hashPassword('mySecret123');
      // bcrypt hashes start with $2a$ or $2b$
      assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
      const ok = await verifyPassword('mySecret123', hash);
      assert.ok(ok);
    });

    test('rejects wrong password', async () => {
      const hash = await hashPassword('correctPassword');
      const ok = await verifyPassword('wrongPassword', hash);
      assert.equal(ok, false);
    });

    test('different salts produce different hashes', async () => {
      const h1 = await hashPassword('samePassword');
      const h2 = await hashPassword('samePassword');
      assert.notEqual(h1, h2);
    });

    test('rejects malformed stored hash', async () => {
      const ok = await verifyPassword('test', 'malformed');
      assert.equal(ok, false);
    });

    test('rejects empty stored hash', async () => {
      const ok = await verifyPassword('test', '');
      assert.equal(ok, false);
    });

    test('bcrypt hash round-trip', async () => {
      const hash = await hashPassword('testBcrypt123!');
      assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
      assert.ok(await verifyPassword('testBcrypt123!', hash));
      assert.equal(await verifyPassword('wrong', hash), false);
    });

    test('legacy SHA-256+salt hashes are still verifiable', async () => {
      // Recreate a legacy SHA-256+salt hash for backward compatibility
      const saltHex = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
      const encoder = new TextEncoder();
      const data = encoder.encode(saltHex + 'legacyPassword');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const legacyHash = `${saltHex}:${hashHex}`;
      // Should verify with the correct password
      assert.ok(await verifyPassword('legacyPassword', legacyHash));
      // Should reject wrong password
      assert.equal(await verifyPassword('wrongPassword', legacyHash), false);
    });
  });

  describe('isUrlSafe', () => {
    test('allows standard HTTPS URLs', () => {
      assert.ok(isUrlSafe('https://example.com/webhook'));
      assert.ok(isUrlSafe('http://example.com/webhook'));
    });

    test('blocks localhost', () => {
      assert.equal(isUrlSafe('http://localhost:3000/api'), false);
      assert.equal(isUrlSafe('http://127.0.0.1/api'), false);
    });

    test('blocks private IP ranges', () => {
      assert.equal(isUrlSafe('http://10.0.0.1/internal'), false);
      assert.equal(isUrlSafe('http://192.168.1.1/internal'), false);
      assert.equal(isUrlSafe('http://172.16.0.1/internal'), false);
    });

    test('blocks link-local addresses', () => {
      assert.equal(isUrlSafe('http://169.254.169.254/metadata'), false);
    });

    test('blocks non-HTTP schemes', () => {
      assert.equal(isUrlSafe('file:///etc/passwd'), false);
      assert.equal(isUrlSafe('ftp://example.com/file'), false);
    });

    test('blocks invalid URLs', () => {
      assert.equal(isUrlSafe('not-a-url'), false);
      assert.equal(isUrlSafe(''), false);
    });

    test('blocks IPv6-mapped IPv4 loopback (SSRF DNS-rebinding bypass)', () => {
      assert.equal(isUrlSafe('http://[::ffff:127.0.0.1]/'), false);
      assert.equal(isUrlSafe('http://[::ffff:7f00:1]/'), false);
    });

    test('blocks IPv6-mapped IPv4 cloud metadata endpoint', () => {
      assert.equal(isUrlSafe('http://[::ffff:169.254.169.254]/'), false);
      assert.equal(isUrlSafe('http://[::ffff:a9fe:a9fe]/'), false);
    });

    test('blocks IPv6-mapped private IPv4 ranges', () => {
      assert.equal(isUrlSafe('http://[::ffff:10.0.0.1]/'), false);
      assert.equal(isUrlSafe('http://[::ffff:192.168.1.1]/'), false);
      assert.equal(isUrlSafe('http://[::ffff:172.16.0.1]/'), false);
    });

    test('blocks IPv6 loopback and link-local', () => {
      assert.equal(isUrlSafe('http://[::1]/'), false);
      assert.equal(isUrlSafe('http://[fe80::1]/'), false);
      assert.equal(isUrlSafe('http://[fc00::1]/'), false);
    });

    test('blocks IPv4 IP-encoding bypasses (decimal/hex/octal)', () => {
      // WHATWG URL normalizes these to dotted-decimal, which the patterns catch
      assert.equal(isUrlSafe('http://2130706433/'), false);  // 127.0.0.1
      assert.equal(isUrlSafe('http://0x7f000001/'), false);   // 127.0.0.1
      assert.equal(isUrlSafe('http://0177.0.0.1/'), false);   // 127.0.0.1
      assert.equal(isUrlSafe('http://0/'), false);            // 0.0.0.0
    });
  });
});
