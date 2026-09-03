import { createHash, randomBytes } from 'crypto';

/**
 * Pure crypto utilities for API key generation and hashing.
 * Extracted from auth.ts so they can be tested in isolation
 * without importing next/server.
 */

export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const raw = randomBytes(32).toString('hex');
  const key = `ln_live_${raw}`;
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 12);
  return { key, keyHash, keyPrefix };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
