# ADR-226: Per-Company Public Websites

**Date:** 2026-09-15
**Status:** Accepted
**Supersedes:** None

## Context

Companies had no public web presence. Documents were private to the
workspace. The `openpolsia` reference served per-company public websites
on subdomains.

## Decision

**Add per-company public website publishing** with three components:

1. **Public Sites Service** (`src/lib/services/public-sites.ts`) —
   publishes documents publicly at `/sites/{org-slug}/{doc-slug}`.
   Publishing is gated through the design-quality scanner (ADR-223):
   pages with too many slop tells are rejected unless `force=true`.

2. **Public routes** (`/sites/[slug]` and `/sites/[slug]/[...path]`) —
   serve published documents as HTML. No authentication required.
   Supports wildcard subdomain routing (`{slug}.lazynext.com`) when
   `SITES_WILDCARD_ENABLED=true`.

3. **Publish API** (`POST /api/sites/publish`, `DELETE /api/sites/publish`) —
   authenticated endpoints for publishing/unpublishing documents.

Schema change: `published`, `publishedAt`, `publishSlug` columns on `Document`.

Wildcard subdomain routing is **flag-gated and locally testable** — production
verification requires actual DNS configuration and is not claimed without it.

## Consequences

- Companies can publish documents as public web pages.
- AI-slop pages are blocked from publishing by default.
- Wildcard subdomain routing is available but not enabled by default.
- 9 new tests.
