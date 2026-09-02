/**
 * Token encryption/decryption for storing OAuth tokens at rest.
 *
 * Uses AES-256-GCM via Web Crypto API (available in both Node.js and
 * Cloudflare Workers). The encryption key is derived from the
 * TOKEN_ENCRYPTION_KEY env var using PBKDF2 (100,000 iterations).
 *
 * Backward compatibility:
 *   - "plain:" prefix → plaintext (oldest tokens, pre-encryption)
 *   - "v2:iv:ct" format → PBKDF2-derived key (current)
 *   - "iv:ct" format → SHA-256-derived key (legacy, still decryptable)
 *
 * If TOKEN_ENCRYPTION_KEY is not set:
 *   - In production: throws an error (tokens must never be stored in plaintext)
 *   - In development: falls back to a dev-only key (still encrypted)
 */

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100_000;
const SALT = 'lazynext-token-encryption-v2'; // Fixed salt for deterministic key derivation

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.BUILD_TARGET === 'cloudflare';
}

/** Derive an AES-256 key using PBKDF2 (current method). */
async function getKeyPbkdf2(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Derive an AES-256 key using single SHA-256 (legacy method for backward compat). */
async function getKeySha256(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', hashBuffer, { name: ALGO, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
}

/** Get the current key (PBKDF2-derived) for encryption. */
async function getKey(): Promise<CryptoKey> {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    if (isProduction()) {
      throw new Error('TOKEN_ENCRYPTION_KEY_NOT_SET: OAuth tokens cannot be encrypted in production without this key. Set it via `wrangler secret put TOKEN_ENCRYPTION_KEY`.');
    }
    // Development fallback — use a fixed dev-only key with PBKDF2.
    const devKey = 'dev-only-encryption-key-not-for-production';
    return getKeyPbkdf2(devKey);
  }
  return getKeyPbkdf2(rawKey);
}

/** Check if token encryption is properly configured (for health checks). */
export function isTokenEncryptionConfigured(): boolean {
  return !!process.env.TOKEN_ENCRYPTION_KEY;
}

/**
 * Encrypt a token string. Returns "v2:iv:ciphertext" (base64).
 * In development with no key configured, uses a dev-only key (still encrypted).
 * In production with no key, throws an error.
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoder.encode(plaintext));

  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `v2:${ivB64}:${ctB64}`;
}

/**
 * Decrypt a token string. Reverses encryptToken.
 * Supports three formats for backward compatibility:
 *   - "plain:..." → plaintext (oldest tokens)
 *   - "v2:iv:ct" → PBKDF2-derived key (current)
 *   - "iv:ct" → SHA-256-derived key (legacy)
 */
export async function decryptToken(stored: string): Promise<string> {
  if (stored.startsWith('plain:')) return stored.slice(6);

  const rawKey = process.env.TOKEN_ENCRYPTION_KEY || (isProduction() ? '' : 'dev-only-encryption-key-not-for-production');
  if (!rawKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY_NOT_SET');
  }

  // v2 format: PBKDF2-derived key
  if (stored.startsWith('v2:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) throw new Error('invalid_encrypted_token');
    const [, ivB64, ctB64] = parts;
    const key = await getKeyPbkdf2(rawKey);
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
    const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  }

  // Legacy format: SHA-256-derived key (no prefix)
  const [ivB64, ctB64] = stored.split(':');
  if (!ivB64 || !ctB64) throw new Error('invalid_encrypted_token');
  const key = await getKeySha256(rawKey);
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
