/**
 * Password Policy Service.
 *
 * Validates passwords against configurable policies, checks password strength,
 * maintains password history (stored as SHA-256 hashes in Memory), and tracks
 * password expiry.
 *
 * Memory types used:
 *   - 'password_policy'   — custom org policy (key/sourceId = organizationId)
 *   - 'password_history'  — password hash history (key/sourceId = userId)
 *   - 'password_changed'  — last password change timestamp (key/sourceId = userId)
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { createHash } from 'crypto';

// ── Constants ──

const POLICY_TYPE = 'password_policy';
const HISTORY_TYPE = 'password_history';
const CHANGED_TYPE = 'password_changed';
const SENTINEL_WORKSPACE = 'user-scoped';
const SENTINEL_ORG = 'user-scoped';
const MAX_HISTORY = 5;

// ── Types ──

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  preventReuse: number;
  expiryDays: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

// ── Default policy ──

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  preventReuse: 5,
  expiryDays: 90,
};

// ── Common passwords (top 50) ──

const COMMON_PASSWORDS: string[] = [
  'password', '123456', '123456789', 'qwerty', 'abc123', '111111', '12345678',
  'password123', 'admin', 'letmein', 'welcome', 'monkey', '1234567', 'dragon',
  'password1', 'sunshine', 'princess', 'football', 'iloveyou', '1234567890',
  'shadow', 'superman', 'michael', 'master', '696969', 'mustang', 'access',
  'batman', 'trustno1', 'passw0rd', 'hello', 'charlie', 'donald', 'password2',
  'qwerty123', '654321', 'lovely', 'michael1', 'jennifer', '1q2w3e4r', '1234',
  'qwertyuiop', 'baseball', 'jordan', 'whatever', 'hunter2', 'ninja', 'freedom',
  'pass123', 'zaq1zaq1',
];

// ── Password Policy Service ──

export const PasswordPolicyService = {
  /**
   * Validate a password against the default policy.
   */
  validate(password: string): ValidationResult {
    const policy = this.getPolicy();
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (policy.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (policy.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check common passwords
    const common = this.getCommonPasswords();
    if (common.some((p) => p.toLowerCase() === password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }

    const strength = this.scoreToLabel(this.checkStrength(password));

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  },

  /**
   * Calculate password strength score (0-100).
   */
  checkStrength(password: string): number {
    let score = 0;

    // Length contribution (up to 40 points)
    if (password.length >= 16) score += 40;
    else if (password.length >= 12) score += 30;
    else if (password.length >= 8) score += 15;
    else if (password.length >= 4) score += 5;

    // Character variety (up to 40 points)
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    score += varietyCount * 10;

    // Entropy estimate (up to 20 points)
    let charsetSize = 0;
    if (hasLower) charsetSize += 26;
    if (hasUpper) charsetSize += 26;
    if (hasNumber) charsetSize += 10;
    if (hasSpecial) charsetSize += 32;

    const entropy = password.length * Math.log2(charsetSize || 1);
    if (entropy >= 60) score += 20;
    else if (entropy >= 40) score += 15;
    else if (entropy >= 25) score += 10;
    else if (entropy >= 15) score += 5;

    // Penalize common passwords
    if (COMMON_PASSWORDS.some((p) => p.toLowerCase() === password.toLowerCase())) {
      score = Math.min(score, 20);
    }

    // Penalize repeated characters
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 15);
    }

    // Penalize sequential characters
    if (/(?:abc|bcd|cde|def|123|234|345|456|567|678|789|890|qwe|wer|ert|rty)/i.test(password)) {
      score = Math.max(0, score - 10);
    }

    return Math.max(0, Math.min(100, score));
  },

  /**
   * Return the default password policy.
   */
  getPolicy(): PasswordPolicy {
    return { ...DEFAULT_POLICY };
  },

  /**
   * Store a custom password policy for an organization.
   */
  async setPolicy(organizationId: string, policy: Partial<PasswordPolicy>): Promise<PasswordPolicy> {
    const merged: PasswordPolicy = { ...DEFAULT_POLICY, ...policy };

    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: POLICY_TYPE, sourceId: organizationId },
        }),
      { count: 0 },
    );

    await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId: SENTINEL_ORG,
        type: POLICY_TYPE,
        content: JSON.stringify(merged),
        source: 'system',
        sourceId: organizationId,
        confidence: 1.0,
        owner: organizationId,
        lifecycle: 'permanent',
        tags: JSON.stringify(['password', 'policy']),
        createdBy: organizationId,
      },
    });

    return merged;
  },

  /**
   * Get the password policy for an organization (custom or default).
   */
  async getPolicyForOrg(organizationId: string): Promise<PasswordPolicy> {
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: POLICY_TYPE, sourceId: organizationId },
        }),
      null,
    );
    if (!mem) return { ...DEFAULT_POLICY };
    try {
      return { ...DEFAULT_POLICY, ...(JSON.parse(mem.content) as Partial<PasswordPolicy>) };
    } catch {
      return { ...DEFAULT_POLICY };
    }
  },

  /**
   * Return the top 50 common passwords.
   */
  getCommonPasswords(): string[] {
    return [...COMMON_PASSWORDS];
  },

  /**
   * Check if a password has been used before (against stored history).
   */
  async checkHistory(userId: string, password: string): Promise<boolean> {
    const hash = hashPassword(password);
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: HISTORY_TYPE, sourceId: userId },
        }),
      null,
    );
    if (!mem) return false;
    try {
      const data = JSON.parse(mem.content) as { hashes: string[] };
      return data.hashes.includes(hash);
    } catch {
      return false;
    }
  },

  /**
   * Record a password hash in history.
   */
  async recordPassword(userId: string, passwordHash: string): Promise<{ recorded: boolean }> {
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: HISTORY_TYPE, sourceId: userId },
        }),
      null,
    );

    let hashes: string[] = [];
    if (mem) {
      try {
        const data = JSON.parse(mem.content) as { hashes: string[] };
        hashes = data.hashes;
      } catch {
        hashes = [];
      }
    }

    hashes.push(passwordHash);
    // Keep only the most recent N hashes
    if (hashes.length > MAX_HISTORY) {
      hashes = hashes.slice(-MAX_HISTORY);
    }

    if (mem) {
      await prisma.memory.updateMany({
        where: { type: HISTORY_TYPE, sourceId: userId },
        data: { content: JSON.stringify({ hashes }) },
      });
    } else {
      await prisma.memory.create({
        data: {
          workspaceId: SENTINEL_WORKSPACE,
          organizationId: SENTINEL_ORG,
          type: HISTORY_TYPE,
          content: JSON.stringify({ hashes }),
          source: 'system',
          sourceId: userId,
          confidence: 1.0,
          owner: userId,
          lifecycle: 'permanent',
          tags: JSON.stringify(['password', 'history']),
          createdBy: userId,
        },
      });
    }

    // Also record the password change timestamp
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: CHANGED_TYPE, sourceId: userId },
        }),
      { count: 0 },
    );

    await safePrisma(
      () =>
        prisma.memory.create({
          data: {
            workspaceId: SENTINEL_WORKSPACE,
            organizationId: SENTINEL_ORG,
            type: CHANGED_TYPE,
            content: JSON.stringify({ changedAt: new Date().toISOString() }),
            source: 'system',
            sourceId: userId,
            confidence: 1.0,
            owner: userId,
            lifecycle: 'permanent',
            tags: JSON.stringify(['password', 'changed']),
            createdBy: userId,
          },
        }),
      null,
    );

    return { recorded: true };
  },

  /**
   * Check if a user's password is expired.
   */
  async isExpired(userId: string, organizationId: string): Promise<boolean> {
    const policy = await this.getPolicyForOrg(organizationId);
    const mem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: CHANGED_TYPE, sourceId: userId },
        }),
      null,
    );
    if (!mem) {
      // No password change record — assume not expired (new user)
      return false;
    }
    try {
      const data = JSON.parse(mem.content) as { changedAt: string };
      const changedAt = new Date(data.changedAt);
      const expiryMs = policy.expiryDays * 24 * 60 * 60 * 1000;
      return Date.now() - changedAt.getTime() > expiryMs;
    } catch {
      return false;
    }
  },

  // ── Internal helpers ──

  scoreToLabel(score: number): 'weak' | 'fair' | 'good' | 'strong' {
    if (score >= 80) return 'strong';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'weak';
  },
};

// ── Internal helpers ──

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
