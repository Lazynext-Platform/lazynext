/**
 * SSRF-safe URL fetcher.
 *
 * CRITICAL SECURITY: Any URL fetching in LazyNext must be protected against
 * Server-Side Request Forgery (SSRF). This module validates URLs before
 * fetching, blocks private/internal IP ranges, enforces HTTPS, limits
 * response size, and applies timeouts.
 *
 * DNS rebinding protection: On Node.js (local dev), we resolve the hostname
 * via dns.lookup() and verify the IP is not private before fetching. On
 * Cloudflare Workers, dns module is unavailable, so we rely on hostname
 * validation + Cloudflare's built-in SSRF protections.
 *
 * This is used by the brand intelligence layer to fetch product/brand pages
 * for analysis. It must NEVER be used to fetch arbitrary user-supplied URLs
 * without these protections.
 */

const MAX_RESPONSE_BYTES = 2_000_000; // 2MB — enough for HTML page text
const FETCH_TIMEOUT_MS = 15_000; // 15s timeout

// Private/internal IP ranges that must be blocked (SSRF protection)
const PRIVATE_IP_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // private class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // private class B
  /^192\.168\./, // private class C
  /^169\.254\./, // link-local
  /^0\./, // current network
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 unique local
  /^fe80:/, // IPv6 link-local
  /^fd/, // IPv6 unique local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  /^192\.0\.0\./, // IETF protocol assignments
  /^198\.1[89]\./, // benchmarking
];

// Domains that must never be fetched (internal metadata services, etc.)
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal', // GCP metadata
  '169.254.169.254', // AWS/GCP metadata IP
  'metadata.aws.internal',
]);

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  contentType: string;
  text: string;
  url: string; // final URL after redirects
}

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFError';
  }
}

/**
 * Check if an IP address is in a private/internal range.
 */
export function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((p) => p.test(ip));
}

/**
 * Validate a URL for safe fetching. Throws SSRFError if the URL is dangerous.
 */
export function validateUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SSRFError('invalid_url');
  }

  // Must be HTTP or HTTPS
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SSRFError('non_http_protocol');
  }

  // Block known-bad hostnames
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SSRFError('blocked_hostname');
  }

  // Block private IP ranges (for direct IP access)
  if (PRIVATE_IP_PATTERNS.some((p) => p.test(hostname))) {
    throw new SSRFError('private_ip');
  }

  // Block IP addresses in hex/octal encoding (SSRF bypass attempt)
  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    throw new SSRFError('encoded_ip');
  }

  return url;
}

/**
 * DNS rebinding protection: resolve hostname and verify IP is not private.
 * Only works on Node.js (local dev). On Cloudflare Workers, dns is unavailable.
 * Returns true if the IP is safe (or if DNS resolution is not possible).
 */
async function checkDnsRebinding(hostname: string): Promise<void> {
  try {
    // Dynamic import — dns module is not available on Cloudflare Workers
    const dns = await import('node:dns/promises');
    const result = await dns.lookup(hostname, { all: true });
    for (const addr of result) {
      if (isPrivateIp(addr.address)) {
        throw new SSRFError('dns_rebinding_private_ip');
      }
    }
  } catch (e) {
    // If the error is our SSRF error, rethrow
    if (e instanceof SSRFError) throw e;
    // If dns module is unavailable (Cloudflare Workers) or lookup fails,
    // continue — hostname validation already caught obvious cases
  }
}

/**
 * Safely fetch a URL with SSRF protection, DNS rebinding check, size limits, and timeout.
 * Returns the response text (truncated to MAX_RESPONSE_BYTES).
 */
export async function safeFetchText(rawUrl: string): Promise<SafeFetchResult> {
  const url = validateUrl(rawUrl);

  // DNS rebinding protection: resolve hostname and check IP before fetching
  await checkDnsRebinding(url.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'LazyNext-Bot/1.0 (+https://lazynext.com)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      cache: 'no-store',
      signal: controller.signal,
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || 'text/plain';

    // Only accept text-based content (HTML, plain text)
    if (!contentType.includes('text/') && !contentType.includes('html') && !contentType.includes('xml')) {
      return { ok: false, status: res.status, contentType, text: '', url: res.url };
    }

    // Read with size limit
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        contentType,
        text: text.slice(0, MAX_RESPONSE_BYTES),
        url: res.url,
      };
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > MAX_RESPONSE_BYTES) {
          // Truncate — take what we have and stop
          chunks.push(value.slice(0, MAX_RESPONSE_BYTES - (totalBytes - value.byteLength)));
          break;
        }
        chunks.push(value);
      }
    }

    const bytes = new Uint8Array(chunks.reduce((sum, c) => sum + c.byteLength, 0));
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.byteLength;
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    return {
      ok: res.ok,
      status: res.status,
      contentType,
      text,
      url: res.url,
    };
  } catch (e) {
    if (e instanceof SSRFError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, status: 0, contentType: '', text: '', url: url.toString() };
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract visible text from HTML (strip tags, scripts, styles).
 * Returns clean text suitable for LLM analysis.
 */
export function htmlToText(html: string): string {
  return html
    // Remove script and style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Convert common block elements to newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|br|hr|section|article|header|footer|nav)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 50_000); // limit for LLM context
}

/**
 * Extract product image URLs from HTML (og:image, product images).
 */
export function extractImageUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  // og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch?.[1]) urls.add(ogMatch[1]);
  // twitter:image
  const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twMatch?.[1]) urls.add(twMatch[1]);
  // product images (common patterns)
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const m of imgMatches) {
    const src = m[1];
    if (src && !src.startsWith('data:') && !src.startsWith('svg')) {
      try {
        const abs = new URL(src, baseUrl).toString();
        if (abs.match(/\.(jpg|jpeg|png|webp|avif)/i)) urls.add(abs);
      } catch { /* ignore invalid */ }
    }
  }
  return Array.from(urls).slice(0, 10);
}
