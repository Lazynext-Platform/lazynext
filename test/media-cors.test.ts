import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');
const docsDir = join(__dirname, '..', 'docs');

/**
 * Tests for media storage CORS and security behavior.
 *
 * The media-serving endpoint intentionally returns
 * `Access-Control-Allow-Origin: *` so that shared links can embed media
 * from any origin. This is safe because:
 * 1. Media keys are unguessable UUID-like capability tokens
 * 2. The endpoint only serves media assets (no sensitive data)
 * 3. Upload is auth-gated; only serving is public
 * 4. Rate limiting prevents key enumeration attacks
 *
 * See ADR-216 for the full rationale.
 */

describe('Media CORS — ADR-216', () => {
  it('media-storage.cloudflare.ts sets Access-Control-Allow-Origin: *', () => {
    const src = readFileSync(
      join(srcDir, 'lib', 'media-storage.cloudflare.ts'),
      'utf8',
    );
    assert.ok(
      src.includes("'Access-Control-Allow-Origin': '*'"),
      'media-storage.cloudflare.ts must set Access-Control-Allow-Origin: *',
    );
  });

  it('media-storage.local.ts sets Access-Control-Allow-Origin: *', () => {
    const src = readFileSync(
      join(srcDir, 'lib', 'media-storage.local.ts'),
      'utf8',
    );
    assert.ok(
      src.includes("'Access-Control-Allow-Origin': '*'"),
      'media-storage.local.ts must set Access-Control-Allow-Origin: *',
    );
  });

  it('media route does not require authentication (public by design)', () => {
    const src = readFileSync(
      join(srcDir, 'app', 'api', 'lazynext-studio', 'media', '[key]', 'route.ts'),
      'utf8',
    );
    assert.ok(
      !src.includes('getServerSession') && !src.includes('requireAuth'),
      'Media route should not require authentication',
    );
    assert.ok(
      src.includes('checkAuthRateLimit'),
      'Media route must rate-limit to prevent key enumeration',
    );
  });

  it('ADR-216 documents the wildcard CORS decision', () => {
    const adr = readFileSync(
      join(docsDir, 'adr', '216-cors-media-storage.md'),
      'utf8',
    );
    assert.ok(adr.includes('Access-Control-Allow-Origin'), 'ADR-216 must mention CORS header');
    assert.ok(adr.includes('wildcard') || adr.includes('*'), 'ADR-216 must mention wildcard');
  });
});

describe('E2E rate-limit skips — ADR-218', () => {
  it('ADR-218 documents the rate-limit skip decision', () => {
    const adr = readFileSync(
      join(docsDir, 'adr', '218-e2e-rate-limit-skips.md'),
      'utf8',
    );
    assert.ok(adr.includes('429'), 'ADR-218 must mention HTTP 429');
    assert.ok(adr.includes('skip'), 'ADR-218 must mention test.skip');
  });
});
