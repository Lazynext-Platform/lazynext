import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, isUrlSafe } from '../src/lib/security.ts';

describe('Security utilities', () => {
  describe('hashPassword / verifyPassword', () => {
    test('hashes a password and verifies it correctly', async () => {
      const hash = await hashPassword('mySecret123');
      assert.ok(hash.includes(':'));
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
  });
});
