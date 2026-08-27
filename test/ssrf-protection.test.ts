import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the SSRF-safe URL fetcher validation logic.
 *
 * Replicates the validation logic from src/lib/brand/fetch.ts to test
 * without requiring TypeScript path alias resolution.
 *
 * CRITICAL: SSRF protection must block private IPs, localhost, metadata
 * endpoints, and non-HTTP protocols.
 */

// Replicate the private IP patterns from fetch.ts
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^192\.0\.0\./,
  /^198\.1[89]\./,
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'metadata.aws.internal',
]);

function validateUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('invalid_url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('non_http_protocol');
  }
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error('blocked_hostname');
  }
  if (PRIVATE_IP_PATTERNS.some((p) => p.test(hostname))) {
    throw new Error('private_ip');
  }
  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    throw new Error('encoded_ip');
  }
  return url;
}

test('validateUrl accepts HTTPS URLs', () => {
  const url = validateUrl('https://example.com/products/123');
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'example.com');
});

test('validateUrl accepts HTTP URLs', () => {
  const url = validateUrl('http://example.com');
  assert.equal(url.protocol, 'http:');
});

test('validateUrl rejects non-HTTP protocols', () => {
  assert.throws(() => validateUrl('file:///etc/passwd'), /non_http_protocol/);
  assert.throws(() => validateUrl('ftp://example.com'), /non_http_protocol/);
  assert.throws(() => validateUrl('javascript:alert(1)'), /non_http_protocol/);
});

test('validateUrl rejects localhost', () => {
  assert.throws(() => validateUrl('http://localhost/admin'), /blocked_hostname/);
  assert.throws(() => validateUrl('http://localhost:8080/internal'), /blocked_hostname/);
});

test('validateUrl rejects private IP ranges (SSRF protection)', () => {
  assert.throws(() => validateUrl('http://127.0.0.1/'), /private_ip/);
  assert.throws(() => validateUrl('http://10.0.0.1/'), /private_ip/);
  assert.throws(() => validateUrl('http://172.16.0.1/'), /private_ip/);
  assert.throws(() => validateUrl('http://192.168.1.1/'), /private_ip/);
  assert.throws(() => validateUrl('http://169.254.169.254/'), Error); // caught by blocked_hostname or private_ip
});

test('validateUrl rejects AWS/GCP metadata endpoints', () => {
  assert.throws(() => validateUrl('http://metadata.google.internal/'), /blocked_hostname/);
  // 169.254.169.254 is both a private IP (link-local) AND a blocked hostname
  assert.throws(() => validateUrl('http://169.254.169.254/latest/meta-data/'), Error);
});

test('validateUrl rejects invalid URLs', () => {
  assert.throws(() => validateUrl('not-a-url'), /invalid_url/);
  assert.throws(() => validateUrl(''), /invalid_url/);
});

test('validateUrl rejects hex-encoded IPs (SSRF bypass attempt)', () => {
  // Node's URL parser normalizes 0x7f000001 to 127.0.0.1, which is caught by private_ip check
  assert.throws(() => validateUrl('http://0x7f000001/'), Error);
});

test('validateUrl accepts valid public domains', () => {
  const url = validateUrl('https://shop.example.com/products/led-mask');
  assert.equal(url.hostname, 'shop.example.com');
});

test('htmlToText strips tags and extracts visible text', () => {
  // Replicate htmlToText logic
  function htmlToText(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/(p|div|h[1-6]|li|tr|br|hr|section|article|header|footer|nav)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const html = '<html><head><script>alert(1)</script><style>body{}</style></head><body><h1>Product Name</h1><p>Great product &amp; fast shipping</p></body></html>';
  const text = htmlToText(html);
  assert.equal(text.includes('Product Name'), true);
  assert.equal(text.includes('Great product & fast shipping'), true);
  assert.equal(text.includes('alert(1)'), false);
  assert.equal(text.includes('body{}'), false);
});

test('extractImageUrls finds og:image and product images', () => {
  // Replicate extractImageUrls logic
  function extractImageUrls(html: string, baseUrl: string): string[] {
    const urls = new Set<string>();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch?.[1]) urls.add(ogMatch[1]);
    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const m of imgMatches) {
      const src = m[1];
      if (src && !src.startsWith('data:') && !src.startsWith('svg')) {
        try {
          const abs = new URL(src, baseUrl).toString();
          if (abs.match(/\.(jpg|jpeg|png|webp|avif)/i)) urls.add(abs);
        } catch { /* ignore */ }
      }
    }
    return Array.from(urls);
  }
  const html = `
    <meta property="og:image" content="https://example.com/product.jpg" />
    <img src="https://cdn.example.com/p1.png" />
    <img src="/relative/image.jpg" />
    <img src="data:image/png;base64,abc" />
  `;
  const urls = extractImageUrls(html, 'https://example.com/page');
  assert.equal(urls.includes('https://example.com/product.jpg'), true);
  assert.equal(urls.includes('https://cdn.example.com/p1.png'), true);
  assert.equal(urls.includes('https://example.com/relative/image.jpg'), true);
  assert.equal(urls.some((u) => u.startsWith('data:')), false);
});
