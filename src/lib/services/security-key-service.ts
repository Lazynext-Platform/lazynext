/**
 * Security Key Service (WebAuthn).
 *
 * Stores WebAuthn credentials and challenges in the Memory table.
 * Memory types used:
 *   - 'security_key'           — registered credential (sourceId = userId)
 *   - 'security_key_challenge' — registration/auth challenge (sourceId = userId)
 *
 * Note: Full WebAuthn cryptographic verification requires CBOR decoding and
 * signature validation which is complex. This service provides the storage
 * layer and challenge generation; verification accepts well-formed responses
 * and stores credentials. In production, use a library like @simplewebauthn.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { randomBytes } from 'crypto';

// ── Constants ──

const KEY_TYPE = 'security_key';
const CHALLENGE_TYPE = 'security_key_challenge';
const SENTINEL_WORKSPACE = 'user-scoped';
const SENTINEL_ORG = 'user-scoped';
const CHALLENGE_TIMEOUT = 60000;

// ── Types ──

export interface RegistrationChallenge {
  challenge: string;
  rpId: string;
  rpName: string;
  userId: string;
  timeout: number;
}

export interface AuthChallenge {
  challenge: string;
  rpId: string;
  userId: string;
  timeout: number;
}

export interface RegistrationResponse {
  credentialId: string;
  publicKey: string;
  attestationObject?: string;
  clientDataJSON?: string;
  name?: string;
}

export interface AuthResponse {
  credentialId: string;
  authenticatorData?: string;
  clientDataJSON?: string;
  signature?: string;
}

export interface SecurityKeyRecord {
  id: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  name: string;
  createdAt: string;
}

export interface VerifyResult {
  verified: boolean;
  credentialId?: string;
}

// ── Security Key Service ──

export const SecurityKeyService = {
  /**
   * Generate a WebAuthn registration challenge.
   */
  async generateRegistrationChallenge(userId: string): Promise<RegistrationChallenge> {
    const challenge = randomBytes(32).toString('base64url');

    // Remove any existing challenge
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: CHALLENGE_TYPE, sourceId: userId },
        }),
      { count: 0 },
    );

    await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId: SENTINEL_ORG,
        type: CHALLENGE_TYPE,
        content: JSON.stringify({
          challenge,
          createdAt: new Date().toISOString(),
          purpose: 'registration',
        }),
        source: 'system',
        sourceId: userId,
        confidence: 1.0,
        owner: userId,
        lifecycle: 'short',
        tags: JSON.stringify(['webauthn', 'challenge']),
        createdBy: userId,
      },
    });

    return {
      challenge,
      rpId: 'lazynext.app',
      rpName: 'Lazynext',
      userId,
      timeout: CHALLENGE_TIMEOUT,
    };
  },

  /**
   * Verify a WebAuthn registration response and store the credential.
   */
  async verifyRegistration(userId: string, response: RegistrationResponse): Promise<VerifyResult> {
    // Verify the challenge exists
    const challengeMem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: CHALLENGE_TYPE, sourceId: userId },
        }),
      null,
    );

    if (!challengeMem) {
      throw new Error('No active registration challenge');
    }

    // Check challenge expiry (5 min window)
    try {
      const challengeData = JSON.parse(challengeMem.content) as { createdAt: string };
      const createdAt = new Date(challengeData.createdAt);
      if (Date.now() - createdAt.getTime() > 5 * 60 * 1000) {
        await safePrisma(
          () =>
            prisma.memory.deleteMany({
              where: { type: CHALLENGE_TYPE, sourceId: userId },
            }),
          { count: 0 },
        );
        throw new Error('Registration challenge expired');
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('expired')) throw e;
      // continue
    }

    if (!response.credentialId || !response.publicKey) {
      throw new Error('Missing credential ID or public key');
    }

    // Store the credential
    const credentialRecord = {
      credentialId: response.credentialId,
      publicKey: response.publicKey,
      counter: 0,
      name: response.name || `Security Key ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
    };

    await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId: SENTINEL_ORG,
        type: KEY_TYPE,
        content: JSON.stringify(credentialRecord),
        source: 'system',
        sourceId: userId,
        confidence: 1.0,
        owner: userId,
        lifecycle: 'permanent',
        tags: JSON.stringify(['webauthn', 'security-key']),
        createdBy: userId,
      },
    });

    // Clean up the challenge
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: CHALLENGE_TYPE, sourceId: userId },
        }),
      { count: 0 },
    );

    return { verified: true, credentialId: response.credentialId };
  },

  /**
   * Generate a WebAuthn authentication challenge.
   */
  async generateAuthChallenge(userId: string): Promise<AuthChallenge> {
    const challenge = randomBytes(32).toString('base64url');

    // Remove any existing challenge
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: CHALLENGE_TYPE, sourceId: userId },
        }),
      { count: 0 },
    );

    await prisma.memory.create({
      data: {
        workspaceId: SENTINEL_WORKSPACE,
        organizationId: SENTINEL_ORG,
        type: CHALLENGE_TYPE,
        content: JSON.stringify({
          challenge,
          createdAt: new Date().toISOString(),
          purpose: 'authentication',
        }),
        source: 'system',
        sourceId: userId,
        confidence: 1.0,
        owner: userId,
        lifecycle: 'short',
        tags: JSON.stringify(['webauthn', 'challenge']),
        createdBy: userId,
      },
    });

    return {
      challenge,
      rpId: 'lazynext.app',
      userId,
      timeout: CHALLENGE_TIMEOUT,
    };
  },

  /**
   * Verify a WebAuthn authentication response.
   */
  async verifyAuth(userId: string, response: AuthResponse): Promise<VerifyResult> {
    // Verify the challenge exists
    const challengeMem = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: CHALLENGE_TYPE, sourceId: userId },
        }),
      null,
    );

    if (!challengeMem) {
      throw new Error('No active authentication challenge');
    }

    // Check challenge expiry
    try {
      const challengeData = JSON.parse(challengeMem.content) as { createdAt: string; purpose: string };
      const createdAt = new Date(challengeData.createdAt);
      if (Date.now() - createdAt.getTime() > 5 * 60 * 1000) {
        await safePrisma(
          () =>
            prisma.memory.deleteMany({
              where: { type: CHALLENGE_TYPE, sourceId: userId },
            }),
          { count: 0 },
        );
        throw new Error('Authentication challenge expired');
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('expired')) throw e;
      // continue
    }

    if (!response.credentialId) {
      throw new Error('Missing credential ID');
    }

    // Find the credential
    const keys = await this.listKeys(userId);
    const key = keys.find((k) => k.credentialId === response.credentialId);
    if (!key) {
      throw new Error('Credential not found');
    }

    // Increment counter
    await prisma.memory.updateMany({
      where: { type: KEY_TYPE, sourceId: userId },
      data: {
        content: JSON.stringify({
          ...key,
          counter: key.counter + 1,
        }),
      },
    });

    // Clean up the challenge
    await safePrisma(
      () =>
        prisma.memory.deleteMany({
          where: { type: CHALLENGE_TYPE, sourceId: userId },
        }),
      { count: 0 },
    );

    return { verified: true, credentialId: response.credentialId };
  },

  /**
   * List all registered security keys for a user.
   */
  async listKeys(userId: string): Promise<SecurityKeyRecord[]> {
    const mems = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: KEY_TYPE, sourceId: userId },
          orderBy: { createdAt: 'asc' },
        }),
      [],
    );
    return mems.map((m) => {
      const data = JSON.parse(m.content) as Omit<SecurityKeyRecord, 'id'>;
      return {
        id: m.id,
        credentialId: data.credentialId,
        publicKey: data.publicKey,
        counter: data.counter,
        name: data.name,
        createdAt: m.createdAt.toISOString(),
      };
    });
  },

  /**
   * Remove a security key by credential ID.
   */
  async removeKey(userId: string, credentialId: string): Promise<{ removed: boolean }> {
    // Find the memory record containing this credentialId
    const keys = await this.listKeys(userId);
    const key = keys.find((k) => k.credentialId === credentialId);
    if (!key) {
      return { removed: false };
    }

    await safePrisma(
      () => prisma.memory.delete({ where: { id: key.id } }),
      null,
    );

    return { removed: true };
  },

  /**
   * Rename a security key.
   */
  async renameKey(userId: string, credentialId: string, name: string): Promise<{ renamed: boolean }> {
    const keys = await this.listKeys(userId);
    const key = keys.find((k) => k.credentialId === credentialId);
    if (!key) {
      return { renamed: false };
    }

    const updated = {
      credentialId: key.credentialId,
      publicKey: key.publicKey,
      counter: key.counter,
      name,
      createdAt: key.createdAt,
    };

    await prisma.memory.update({
      where: { id: key.id },
      data: { content: JSON.stringify(updated) },
    });

    return { renamed: true };
  },

  /**
   * Count registered security keys for a user.
   */
  async getKeyCount(userId: string): Promise<number> {
    const keys = await this.listKeys(userId);
    return keys.length;
  },
};
