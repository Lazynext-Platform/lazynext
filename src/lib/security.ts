/**
 * Security utilities for password hashing and URL validation.
 *
 * Uses bcryptjs (pure JavaScript, compatible with Cloudflare Workers) for
 * password hashing. Falls back to legacy SHA-256+salt verification for
 * hashes created before the bcrypt upgrade (backward compatibility).
 */

import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt with a cost factor of 10.
 * Returns a bcrypt hash string (starts with "$2a$" or "$2b$").
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a stored hash.
 * Supports both bcrypt hashes (starting with "$2a$"/"$2b$") and legacy
 * SHA-256+salt hashes (format "saltHex:hashHex") for backward compatibility.
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  // Bcrypt hashes start with $2a$ or $2b$
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    try {
      return bcrypt.compare(password, stored);
    } catch {
      return false;
    }
  }

  // Legacy SHA-256+salt format: "saltHex:hashHex"
  const [saltHex, expectedHash] = stored.split(':');
  if (!saltHex || !expectedHash) return false;
  const encoder = new TextEncoder();
  const data = encoder.encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  // Constant-time comparison to prevent timing attacks
  if (hashHex.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hashHex.length; i++) {
    diff |= hashHex.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

/** Private/internal IP ranges that should be blocked for SSRF protection. */
const BLOCKED_IP_PATTERNS = [
  /^127\./,           // loopback
  /^10\./,            // private class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // private class B
  /^192\.168\./,      // private class C
  /^169\.254\./,      // link-local
  /^0\./,             // current network
];

/** IPv6 ranges that should be blocked for SSRF protection. */
const BLOCKED_IPV6_PATTERNS = [
  /^::1$/,            // IPv6 loopback
  /^::$/,             // IPv6 unspecified
  /^fc00:/i,          // IPv6 unique local
  /^fd/i,             // IPv6 unique local (fd00::/8 locally assigned)
  /^fe80:/i,          // IPv6 link-local
];

/** Allowed URL schemes for outbound fetches. */
const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Convert two 16-bit hex groups of an IPv6-mapped IPv4 address
 * (e.g. "a9fe:a9fe") into a dotted-quad IPv4 string (e.g. "169.254.169.254").
 * Returns null if the input is not two colon-separated hex groups.
 */
function hexGroupsToIPv4(groups: string): string | null {
  const parts = groups.split(':');
  if (parts.length !== 2) return null;
  const g1 = parseInt(parts[0], 16);
  const g2 = parseInt(parts[1], 16);
  if (Number.isNaN(g1) || Number.isNaN(g2)) return null;
  if (g1 < 0 || g1 > 0xffff || g2 < 0 || g2 > 0xffff) return null;
  return `${(g1 >> 8) & 0xff}.${g1 & 0xff}.${(g2 >> 8) & 0xff}.${g2 & 0xff}`;
}

/**
 * Given an IPv6 hostname (brackets already stripped), if it is an
 * IPv6-mapped IPv4 address (::ffff:X.X.X.X or ::ffff:XXXX:XXXX),
 * extract and return the embedded IPv4 dotted-quad string.
 * Returns null otherwise.
 */
function extractIPv4FromIPv6Mapped(hostname: string): string | null {
  // ::ffff:a.b.c.d  (dotted-quad form)
  const dottedMatch = hostname.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (dottedMatch) return dottedMatch[1];
  // ::ffff:XXXX:XXXX  (hex-pair form, e.g. ::ffff:a9fe:a9fe)
  const hexMatch = hostname.match(/^::ffff:([0-9a-f]{1,4}:[0-9a-f]{1,4})$/i);
  if (hexMatch) return hexGroupsToIPv4(hexMatch[1]);
  return null;
}

/**
 * Validate that a URL is safe to fetch (no SSRF).
 * Blocks private/internal IP ranges, IPv6-mapped IPv4 bypasses,
 * cloud metadata endpoints, and non-HTTP schemes.
 * Returns true if the URL is safe.
 */
export function isUrlSafe(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (!ALLOWED_SCHEMES.includes(url.protocol)) return false;

    // WHATWG URL normalizes IPv4 literals (decimal/hex/octal) to dotted-decimal,
    // so the BLOCKED_IP_PATTERNS regexes catch those forms. IPv6 literals may be
    // returned with surrounding brackets depending on the runtime; strip them.
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    // Block localhost and the unspecified/any address
    if (hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '::') return false;

    // Check IPv4 against blocked patterns
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) return false;
    }

    // IPv6 handling: detect IPv6-mapped IPv4 and check the embedded IPv4,
    // then check remaining IPv6 patterns.
    if (hostname.includes(':')) {
      const mappedIPv4 = extractIPv4FromIPv6Mapped(hostname);
      if (mappedIPv4) {
        for (const pattern of BLOCKED_IP_PATTERNS) {
          if (pattern.test(mappedIPv4)) return false;
        }
        // Also block the metadata endpoint in mapped form
        if (mappedIPv4 === '169.254.169.254') return false;
        return true;
      }
      for (const pattern of BLOCKED_IPV6_PATTERNS) {
        if (pattern.test(hostname)) return false;
      }
    }

    // Block cloud metadata service endpoints
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

/**
 * Detect whether an error is an Atlas Cloud 402 (insufficient platform balance).
 * Atlas 402 errors surface as `Error("Atlas chat 402: ...")` or `Error("Atlas 402: ...")`.
 * When the platform account has $0 balance, all AI generation calls fail with this error.
 */
export function isAtlas402(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return message.includes('Atlas chat 402') || message.includes('Atlas 402') || message.includes('Atlas submit 402');
}

/**
 * Like safeError, but detects Atlas 402 (insufficient platform balance) and returns
 * a specific error code + 402 status so the frontend can show a helpful message
 * instead of a generic "generate_failed".
 *
 * Returns `{ error, status }` so the caller can use it as:
 *   const { error, status } = safeAtlasError(e, 'my_route', 'generate_failed');
 *   return NextResponse.json({ error }, { status });
 */
export function safeAtlasError(
  e: unknown,
  route: string,
  errorCode: string,
): { error: string; status: number } {
  const message = e instanceof Error ? e.message : String(e);
  console.error(`[${route}] error:`, message);
  if (isAtlas402(e)) {
    return { error: 'atlas_insufficient_balance', status: 503 };
  }
  return { error: errorCode, status: 500 };
}
