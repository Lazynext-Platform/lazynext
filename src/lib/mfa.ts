/**
 * MFA (TOTP) utilities — RFC 6238 compliant.
 *
 * Uses Web Crypto API (available in Cloudflare Workers and Node.js 18+).
 * No external dependencies — implements TOTP generation and verification
 * using HMAC-SHA1 per RFC 4226 (HOTP) with time-based counter per RFC 6238.
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random TOTP secret (base32 encoded, 20 bytes = 160 bits).
 */
export function generateTOTPSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/**
 * Generate a TOTP code for the current time (or a specific counter).
 * @param secret Base32-encoded secret
 * @param window Time window in seconds (default 30)
 * @param forTime Unix timestamp (default: now)
 * @returns 6-digit code as string
 */
export async function generateTOTP(
  secret: string,
  window: number = 30,
  forTime: number = Date.now() / 1000,
): Promise<string> {
  const counter = Math.floor(forTime / window);
  return generateHOTP(secret, counter);
}

/**
 * Verify a TOTP code against the secret, allowing ±1 time window drift.
 * @param secret Base32-encoded secret
 * @param code 6-digit code provided by the user
 * @param window Time window in seconds (default 30)
 * @returns true if the code is valid within the current or adjacent windows
 */
export async function verifyTOTP(
  secret: string,
  code: string,
  window: number = 30,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  // Check current window and ±1 for clock drift
  for (let offset = -1; offset <= 1; offset++) {
    const expectedCode = await generateTOTP(secret, window, now + offset * window);
    if (timingSafeEqual(expectedCode, code)) return true;
  }
  return false;
}

/**
 * Generate an otpauth:// URI for QR code generation.
 */
export function generateOTPAuthURI(
  secret: string,
  email: string,
  issuer: string = 'Lazynext',
): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Internal helpers ──

async function generateHOTP(secret: string, counter: number): Promise<string> {
  const key = base32Decode(secret);
  const counterBytes = new ArrayBuffer(8);
  const view = new DataView(counterBytes);
  // Counter is 64-bit big-endian; JS numbers are 53-bit safe
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter & 0xffffffff);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const hmac = new Uint8Array(
    await crypto.subtle.sign('HMAC', cryptoKey, counterBytes),
  );

  // Dynamic truncation per RFC 4226
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 10 ** 6).toString().padStart(6, '0');
}

function base32Encode(bytes: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
