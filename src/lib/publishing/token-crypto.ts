/**
 * Token encryption/decryption for storing OAuth tokens at rest.
 *
 * Uses AES-256-GCM via Web Crypto API (available in both Node.js and
 * Cloudflare Workers). The encryption key is derived from the
 * TOKEN_ENCRYPTION_KEY env var using HKDF.
 *
 * If TOKEN_ENCRYPTION_KEY is not set, tokens are stored in plaintext
 * with a warning (development only).
 */

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getKey(): Promise<CryptoKey | null> {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[token-crypto] TOKEN_ENCRYPTION_KEY not set — tokens stored in plaintext in production!');
    }
    return null;
  }
  // Derive a key from the env var using SHA-256 as a KDF
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
  return crypto.subtle.importKey('raw', hashBuffer, { name: ALGO, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt a token string. Returns a base64 string of "iv:ciphertext".
 * If no encryption key is configured, returns the plaintext prefixed with "plain:".
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  if (!key) return `plain:${plaintext}`;

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoder.encode(plaintext));

  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

/**
 * Decrypt a token string. Reverses encryptToken.
 * If the value is prefixed with "plain:", returns the plaintext directly.
 */
export async function decryptToken(stored: string): Promise<string> {
  if (stored.startsWith('plain:')) return stored.slice(6);

  const [ivB64, ctB64] = stored.split(':');
  if (!ivB64 || !ctB64) throw new Error('invalid_encrypted_token');

  const key = await getKey();
  if (!key) throw new Error('encryption_key_not_configured');

  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
