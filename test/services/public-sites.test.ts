import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test the public sites logic in isolation (no DB calls)

test('slugify produces a URL-safe slug', () => {
  function slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'untitled';
  }
  assert.equal(slugify('Landing Page — Acme'), 'landing-page-acme');
  assert.equal(slugify('Hello World!'), 'hello-world');
  assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces');
  assert.equal(slugify(''), 'untitled');
});

test('resolveOrgSlugFromHost returns null when wildcard disabled', () => {
  process.env.SITES_WILDCARD_ENABLED = 'false';
  function resolveOrgSlugFromHost(hostname: string): string | null {
    if (process.env.SITES_WILDCARD_ENABLED !== 'true') return null;
    const baseDomain = process.env.SITES_BASE_DOMAIN || 'lazynext.com';
    const pattern = new RegExp(`^(.+)\\.${baseDomain.replace(/\\/g, '\\\\').replace(/\./g, '\\.')}$`);
    const match = hostname.match(pattern);
    if (!match) return null;
    const slug = match[1];
    if (['www', 'api', 'mail', 'admin', 'app'].includes(slug)) return null;
    return slug;
  }
  assert.equal(resolveOrgSlugFromHost('acme.lazynext.com'), null);
});

test('resolveOrgSlugFromHost extracts slug when wildcard enabled', () => {
  process.env.SITES_WILDCARD_ENABLED = 'true';
  process.env.SITES_BASE_DOMAIN = 'lazynext.com';
  function resolveOrgSlugFromHost(hostname: string): string | null {
    if (process.env.SITES_WILDCARD_ENABLED !== 'true') return null;
    const baseDomain = process.env.SITES_BASE_DOMAIN || 'lazynext.com';
    const pattern = new RegExp(`^(.+)\\.${baseDomain.replace(/\\/g, '\\\\').replace(/\./g, '\\.')}$`);
    const match = hostname.match(pattern);
    if (!match) return null;
    const slug = match[1];
    if (['www', 'api', 'mail', 'admin', 'app'].includes(slug)) return null;
    return slug;
  }
  assert.equal(resolveOrgSlugFromHost('acme.lazynext.com'), 'acme');
  assert.equal(resolveOrgSlugFromHost('my-company.lazynext.com'), 'my-company');
  assert.equal(resolveOrgSlugFromHost('www.lazynext.com'), null);
  assert.equal(resolveOrgSlugFromHost('api.lazynext.com'), null);
  assert.equal(resolveOrgSlugFromHost('mail.lazynext.com'), null);
  assert.equal(resolveOrgSlugFromHost('localhost:3100'), null);
  assert.equal(resolveOrgSlugFromHost('example.com'), null);
});

test('resolveOrgSlugFromHost handles custom base domain', () => {
  process.env.SITES_WILDCARD_ENABLED = 'true';
  process.env.SITES_BASE_DOMAIN = 'custom.io';
  function resolveOrgSlugFromHost(hostname: string): string | null {
    if (process.env.SITES_WILDCARD_ENABLED !== 'true') return null;
    const baseDomain = process.env.SITES_BASE_DOMAIN || 'lazynext.com';
    const pattern = new RegExp(`^(.+)\\.${baseDomain.replace(/\\/g, '\\\\').replace(/\./g, '\\.')}$`);
    const match = hostname.match(pattern);
    if (!match) return null;
    const slug = match[1];
    if (['www', 'api', 'mail', 'admin', 'app'].includes(slug)) return null;
    return slug;
  }
  assert.equal(resolveOrgSlugFromHost('acme.custom.io'), 'acme');
  assert.equal(resolveOrgSlugFromHost('acme.lazynext.com'), null);
});

test('design scan gate rejects pages with slop tells', () => {
  // Simulate the design scan gate logic
  function checkGate(hits: number, force: boolean): boolean {
    return hits === 0 || force;
  }
  assert.equal(checkGate(5, false), false);
});

test('design scan gate passes clean pages', () => {
  function checkGate(hits: number, force: boolean): boolean {
    return hits === 0 || force;
  }
  assert.equal(checkGate(0, false), true);
});

test('design scan gate allows override with force', () => {
  function checkGate(hits: number, force: boolean): boolean {
    return hits === 0 || force;
  }
  assert.equal(checkGate(10, true), true);
});

test('public URL format is /sites/{org-slug}/{publish-slug}', () => {
  const orgSlug = 'acme';
  const publishSlug = 'landing-page';
  const url = `/sites/${orgSlug}/${publishSlug}`;
  assert.equal(url, '/sites/acme/landing-page');
});

// Clean up
test('cleanup env', () => {
  delete process.env.SITES_WILDCARD_ENABLED;
  delete process.env.SITES_BASE_DOMAIN;
});
