/**
 * Security utilities for password hashing and URL validation.
 *
 * Uses Web Crypto API (SHA-256) which is available in both Node.js and
 * Cloudflare Workers environments. SHA-256 with a salt is used instead of
 * bcrypt because bcrypt is not available in the Workers runtime.
 */

/**
 * Hash a password using SHA-256 with a random salt.
 * Returns "salt:hash" format for storage.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored "salt:hash" value.
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHash] = stored.split(':');
  if (!saltHex || !expectedHash) return false;
  const encoder = new TextEncoder();
  const data = encoder.encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHash;
}

/** Private/internal IP ranges that should be blocked for SSRF protection. */
const BLOCKED_IP_PATTERNS = [
  /^127\./,           // loopback
  /^10\./,            // private class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // private class B
  /^192\.168\./,      // private class C
  /^169\.254\./,      // link-local
  /^0\./,             // current network
  /^::1$/,            // IPv6 loopback
  /^fc00:/i,          // IPv6 unique local
  /^fe80:/i,          // IPv6 link-local
];

/** Allowed URL schemes for outbound fetches. */
const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Validate that a URL is safe to fetch (no SSRF).
 * Blocks private/internal IP ranges and non-HTTP schemes.
 * Returns true if the URL is safe.
 */
export function isUrlSafe(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (!ALLOWED_SCHEMES.includes(url.protocol)) return false;

    // Block localhost and common internal hostnames
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '0.0.0.0') return false;

    // Check against blocked IP patterns
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) return false;
    }

    // Block metadata service endpoints
    if (hostname === 'metadata.google.internal' || hostname === '169.254.169.254') return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Log an error server-side and return a sanitized error code for API responses.
 * Prevents raw exception messages from leaking to API clients.
 *
 * Usage in API catch blocks:
 *   } catch (e) {
 *     return safeError(e, 'my_route', 'operation_failed');
 *   }
 */
export function safeError(
  e: unknown,
  route: string,
  errorCode: string,
): { error: string } {
  const message = e instanceof Error ? e.message : String(e);
  console.error(`[${route}] error:`, message);
  return { error: errorCode };
}
