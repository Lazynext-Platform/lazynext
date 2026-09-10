/**
 * Two-Factor Authentication (2FA) Service.
 *
 * Stores 2FA secrets, backup codes, and enabled state in the Memory table.
 * Memory types used:
 *   - 'two_factor_secret'  — TOTP secret + enabled flag (key = userId)
 *   - 'two_factor_backup'  — backup codes (key = userId)
 *   - 'two_factor_enabled' — marker record for fast enabled-checks (key = userId)
 *
 * The Memory model requires workspaceId + organizationId. For user-scoped
 * security data we use the user's first workspace/org, or a sentinel
 * ('user-scoped') when none exists yet.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { TotpService } from '@/lib/services/totp-service';

// ── Constants ──

const SENTINEL_WORKSPACE = 'user-scoped';
const SENTINEL_ORG = 'user-scoped';
const SECRET_TYPE = 'two_factor_secret';
const BACKUP_TYPE = 'two_factor_backup';
const ENABLED_TYPE = 'two_factor_enabled';

// ── Types ──

export interface TwoFactorSetupResult {
  secret: string;
  uri: string;
  qrDataUrl: string | null;
}

export interface TwoFactorVerifyResult {
  enabled: boolean;
  backupCodes: string[];
}

export interface TwoFactorLoginResult {
  verified: boolean;
  usedBackupCode?: boolean;
}

export interface TwoFactorStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  setupAt: string | null;
}

interface SecretRecord {
  secret: string;
  enabled: boolean;
  setupAt?: string;
}

interface BackupRecord {
  codes: string[];
  usedCodes: string[];
}

// ── Two-Factor Service ──

export const TwoFactorService = {
  /**
   * Initiate 2FA setup — generate a secret and store it (not yet enabled).
   */
  async setup(userId: string, accountName?: string): Promise<TwoFactorSetupResult> {
    const secret = TotpService.generateSecret();
    const uri = TotpService.generateUri(secret, accountName || userId, 'Lazynext');
    const { qrDataUrl } = TotpService.getQrCodeDataUrl(uri);

    const record: SecretRecord = {
      secret,
      enabled: false,
      setupAt: new Date().toISOString(),
    };

    // Remove any existing pending setup, then store the new one
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: SECRET_TYPE, sourceId: userId },
        }),
      { count: 0 },
    );

    await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId: SENTINEL_ORG,
        type: SECRET_TYPE,
        content: JSON.stringify(record),
        source: 'system',
        sourceId: userId,
        confidence: 1.0,
        owner: userId,
        lifecycle: 'permanent',
        tags: JSON.stringify(['2fa', 'totp']),
        createdBy: userId,
      },
    });

    return { secret, uri, qrDataUrl };
  },

  /**
   * Verify a setup code and enable 2FA.
   * Generates backup codes on success.
   */
  async verify(userId: string, code: string): Promise<TwoFactorVerifyResult> {
    const record = await this.getSecretRecord(userId);
    if (!record) {
      throw new Error('2FA setup not initiated');
    }

    const valid = TotpService.verify(record.secret, code);
    if (!valid) {
      throw new Error('Invalid verification code');
    }

    // Enable 2FA
    record.enabled = true;
    record.setupAt = record.setupAt || new Date().toISOString();

    await prisma.memory.updateMany({
      where: { type: SECRET_TYPE, sourceId: userId },
      data: { content: JSON.stringify(record) },
    });

    // Generate and store backup codes
    const backupCodes = TotpService.generateBackupCodes();
    const backupRecord: BackupRecord = { codes: backupCodes, usedCodes: [] };

    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: BACKUP_TYPE, sourceId: userId },
        }),
      { count: 0 },
    );

    await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId: SENTINEL_ORG,
        type: BACKUP_TYPE,
        content: JSON.stringify(backupRecord),
        source: 'system',
        sourceId: userId,
        confidence: 1.0,
        owner: userId,
        lifecycle: 'permanent',
        tags: JSON.stringify(['2fa', 'backup']),
        createdBy: userId,
      },
    });

    // Create enabled marker
    await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId: SENTINEL_ORG,
        type: ENABLED_TYPE,
        content: JSON.stringify({ enabled: true, setupAt: record.setupAt }),
        source: 'system',
        sourceId: userId,
        confidence: 1.0,
        owner: userId,
        lifecycle: 'permanent',
        tags: JSON.stringify(['2fa', 'enabled']),
        createdBy: userId,
      },
    }).catch(() => {
      // Marker is a convenience; non-fatal if it fails
    });

    return { enabled: true, backupCodes };
  },

  /**
   * Disable 2FA (optionally requiring a verification code).
   */
  async disable(userId: string, code?: string): Promise<{ disabled: boolean }> {
    if (code) {
      const record = await this.getSecretRecord(userId);
      if (record) {
        const valid = TotpService.verify(record.secret, code);
        if (!valid) {
          throw new Error('Invalid verification code');
        }
      }
    }

    // Remove all 2FA-related memory entries
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: {
            type: { in: [SECRET_TYPE, BACKUP_TYPE, ENABLED_TYPE] },
            sourceId: userId,
          },
        }),
      { count: 0 },
    );

    return { disabled: true };
  },

  /**
   * Check if 2FA is enabled for a user.
   */
  async isEnabled(userId: string): Promise<boolean> {
    const record = await this.getSecretRecord(userId);
    return !!record?.enabled;
  },

  /**
   * Verify a login attempt with 2FA (TOTP code or backup code).
   */
  async verifyLogin(userId: string, code: string): Promise<TwoFactorLoginResult> {
    const enabled = await this.isEnabled(userId);
    if (!enabled) {
      return { verified: false };
    }

    const record = await this.getSecretRecord(userId);
    if (!record) {
      return { verified: false };
    }

    // Try TOTP code first
    if (TotpService.verify(record.secret, code)) {
      return { verified: true, usedBackupCode: false };
    }

    // Try backup code
    const backupRecord = await this.getBackupRecord(userId);
    if (backupRecord) {
      const normalized = code.trim().toUpperCase();
      if (
        backupRecord.codes.includes(normalized) &&
        !backupRecord.usedCodes.includes(normalized)
      ) {
        // Mark the backup code as used
        backupRecord.usedCodes.push(normalized);
        await prisma.memory.updateMany({
          where: { type: BACKUP_TYPE, sourceId: userId },
          data: { content: JSON.stringify(backupRecord) },
        });
        return { verified: true, usedBackupCode: true };
      }
    }

    return { verified: false };
  },

  /**
   * Get remaining (unused) backup codes.
   */
  async getBackupCodes(userId: string): Promise<string[]> {
    const backupRecord = await this.getBackupRecord(userId);
    if (!backupRecord) return [];
    return backupRecord.codes.filter((c) => !backupRecord.usedCodes.includes(c));
  },

  /**
   * Regenerate backup codes (requires 2FA verification).
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    const record = await this.getSecretRecord(userId);
    if (!record || !record.enabled) {
      throw new Error('2FA not enabled');
    }

    const valid = TotpService.verify(record.secret, code);
    if (!valid) {
      throw new Error('Invalid verification code');
    }

    const newCodes = TotpService.generateBackupCodes();
    const backupRecord: BackupRecord = { codes: newCodes, usedCodes: [] };

    await prisma.memory.updateMany({
      where: { type: BACKUP_TYPE, sourceId: userId },
      data: { content: JSON.stringify(backupRecord) },
    });

    return newCodes;
  },

  /**
   * Get 2FA status for a user.
   */
  async getStatus(userId: string): Promise<TwoFactorStatus> {
    const record = await this.getSecretRecord(userId);
    const backupRecord = await this.getBackupRecord(userId);
    return {
      enabled: !!record?.enabled,
      hasBackupCodes: !!backupRecord && backupRecord.codes.length > 0,
      setupAt: record?.setupAt || null,
    };
  },

  // ── Internal helpers ──

  async getSecretRecord(userId: string): Promise<SecretRecord | null> {
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: SECRET_TYPE, sourceId: userId },
        }),
      null,
    );
    if (!mem) return null;
    try {
      return JSON.parse(mem.content) as SecretRecord;
    } catch {
      return null;
    }
  },

  async getBackupRecord(userId: string): Promise<BackupRecord | null> {
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: BACKUP_TYPE, sourceId: userId },
        }),
      null,
    );
    if (!mem) return null;
    try {
      return JSON.parse(mem.content) as BackupRecord;
    } catch {
      return null;
    }
  },
};
