/**
 * Token encryption/decryption for storing OAuth tokens at rest.
 *
 * Uses AES-256-GCM via Web Crypto API (available in both Node.js and
 * Cloudflare Workers). The encryption key is derived from the
 * TOKEN_ENCRYPTION_KEY env var using SHA-256 as a KDF.
 *
 * If TOKEN_ENCRYPTION_KEY is not set:
 *   - In production: throws an error (tokens must never be stored in plaintext)
 *   - In development: falls back to plaintext with a "plain:" prefix
 */

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function isProduction(): boolean {
  // In the OpenNext Cloudflare build, NODE_ENV is set to 'production' at
  // build time. In local dev (npm run dev), it's 'development'. We also
  // check BUILD_TARGET as a secondary signal.
  return process.env.NODE_ENV === 'production' || process.env.BUILD_TARGET === 'cloudflare';
}

async function getKey(): Promise<CryptoKey> {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    if (isProduction()) {
      throw new Error('TOKEN_ENCRYPTION_KEY_NOT_SET: OAuth tokens cannot be encrypted in production without this key. Set it via `wrangler secret put TOKEN_ENCRYPTION_KEY`.');
    }
    // Development fallback — return a placeholder key derived from a
    // fixed dev-only key. This allows local testing without configuring
    // the env var, while still exercising the encryption code path.
    const devKey = 'dev-only-encryption-key-not-for-production';
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(devKey));
    return crypto.subtle.importKey('raw', hashBuffer, { name: ALGO, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
  }
  // Derive a key from the env var using SHA-256 as a KDF
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
  return crypto.subtle.importKey('raw', hashBuffer, { name: ALGO, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
}

/** Check if token encryption is properly configured (for health checks). */
export function isTokenEncryptionConfigured(): boolean {
  return !!process.env.TOKEN_ENCRYPTION_KEY;
}

/**
 * Encrypt a token string. Returns a base64 string of "iv:ciphertext".
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
  return `${ivB64}:${ctB64}`;
}

/**
 * Decrypt a token string. Reverses encryptToken.
 * If the value is prefixed with "plain:", returns the plaintext directly
 * (for backward compatibility with tokens stored before encryption was enforced).
 */
export async function decryptToken(stored: string): Promise<string> {
  if (stored.startsWith('plain:')) return stored.slice(6);

  const [ivB64, ctB64] = stored.split(':');
  if (!ivB64 || !ctB64) throw new Error('invalid_encrypted_token');

  const key = await getKey();

  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
