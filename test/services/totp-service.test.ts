import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { TotpService } from '@/lib/services/totp-service';

// ─────────────────────────────────────────────────────────────────────────────
// TotpService — no mocks, tests the pure crypto implementation
// ─────────────────────────────────────────────────────────────────────────────

describe('TotpService', () => {
  describe('generateSecret', () => {
    it('generates a base32-encoded secret of default length', () => {
      const secret = TotpService.generateSecret();
      // 20 bytes -> 32 base32 chars
      assert.ok(secret.length >= 32);
      assert.match(secret, /^[A-Z2-7]+$/);
    });

    it('generates different secrets on each call', () => {
      const s1 = TotpService.generateSecret();
      const s2 = TotpService.generateSecret();
      assert.notEqual(s1, s2);
    });

    it('respects custom length parameter', () => {
      const short = TotpService.generateSecret(10);
      const long = TotpService.generateSecret(32);
      assert.ok(short.length < long.length);
    });
  });

  describe('generateUri', () => {
    it('generates a valid otpauth URI', () => {
      const secret = TotpService.generateSecret();
      const uri = TotpService.generateUri(secret, 'user@example.com');
      assert.ok(uri.startsWith('otpauth://totp/'));
      assert.ok(uri.includes(`secret=${secret}`));
      assert.ok(uri.includes('issuer=Lazynext'));
    });

    it('encodes the account name and issuer in the label', () => {
      const uri = TotpService.generateUri('JBSWY3DPEHPK3PXP', 'user@test.com', 'MyApp');
      assert.ok(uri.includes('MyApp%3Auser%40test.com'));
    });
  });

  describe('generateCode', () => {
    it('generates a 6-digit code', () => {
      const secret = TotpService.generateSecret();
      const code = TotpService.generateCode(secret, 1234567890);
      assert.match(code, /^\d{6}$/);
    });

    it('generates the same code for the same time', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code1 = TotpService.generateCode(secret, 1234567890);
      const code2 = TotpService.generateCode(secret, 1234567890);
      assert.equal(code1, code2);
    });

    it('generates different codes for different time periods', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code1 = TotpService.generateCode(secret, 1234567890);
      const code2 = TotpService.generateCode(secret, 1234567890 + 30);
      assert.notEqual(code1, code2);
    });
  });

  describe('verify', () => {
    it('verifies a valid code at the correct time', () => {
      const secret = TotpService.generateSecret();
      const time = Math.floor(Date.now() / 1000);
      const code = TotpService.generateCode(secret, time);
      const valid = TotpService.verify(secret, code, { forTime: time });
      assert.equal(valid, true);
    });

    it('rejects an invalid code', () => {
      const secret = TotpService.generateSecret();
      const valid = TotpService.verify(secret, '000000', { forTime: 1234567890 });
      assert.equal(valid, false);
    });

    it('accepts a code within the time window (±1 period)', () => {
      const secret = TotpService.generateSecret();
      const time = Math.floor(Date.now() / 1000);
      const code = TotpService.generateCode(secret, time - 30);
      const valid = TotpService.verify(secret, code, { forTime: time, window: 1 });
      assert.equal(valid, true);
    });

    it('rejects a code outside the time window', () => {
      const secret = TotpService.generateSecret();
      const time = Math.floor(Date.now() / 1000);
      const code = TotpService.generateCode(secret, time - 90);
      const valid = TotpService.verify(secret, code, { forTime: time, window: 1 });
      assert.equal(valid, false);
    });
  });

  describe('generateBackupCodes', () => {
    it('generates the requested number of codes', () => {
      const codes = TotpService.generateBackupCodes(10);
      assert.equal(codes.length, 10);
    });

    it('formats codes as XXXX-XXXX', () => {
      const codes = TotpService.generateBackupCodes(5);
      for (const code of codes) {
        assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      }
    });

    it('generates unique codes', () => {
      const codes = TotpService.generateBackupCodes(20);
      const unique = new Set(codes);
      assert.equal(unique.size, codes.length);
    });
  });

  describe('verifyBackupCode', () => {
    it('validates a new backup code', () => {
      const usedCodes: string[] = [];
      const result = TotpService.verifyBackupCode(usedCodes, 'ABCD-1234');
      assert.equal(result.valid, true);
      assert.equal(result.remainingCodes.length, 1);
    });

    it('rejects an already-used code', () => {
      const usedCodes = ['ABCD-1234'];
      const result = TotpService.verifyBackupCode(usedCodes, 'abcd-1234');
      assert.equal(result.valid, false);
    });

    it('normalizes the input code to uppercase', () => {
      const usedCodes: string[] = [];
      const result = TotpService.verifyBackupCode(usedCodes, 'abcd-1234');
      assert.equal(result.valid, true);
      assert.ok(result.remainingCodes.includes('ABCD-1234'));
    });
  });

  describe('getQrCodeDataUrl', () => {
    it('returns the URI with null qrDataUrl', () => {
      const uri = 'otpauth://totp/test';
      const result = TotpService.getQrCodeDataUrl(uri);
      assert.equal(result.uri, uri);
      assert.equal(result.qrDataUrl, null);
    });
  });
});
