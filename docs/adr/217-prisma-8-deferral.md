# ADR-217: Defer Prisma 8 Upgrade

**Date:** 2026-09-02
**Status:** Accepted
**Supersedes:** None

## Context

Prisma 8 was promoted to `prisma@latest` on 2026-08-28, but the version string
remains `8.0.0-rc.12` — it is a release candidate, not a stable release.

The Prisma team's roadmap states:

> Prisma 8 carries PostgreSQL to general availability — and that is all:
> MongoDB ships in early access, and SQLite is a proof of concept at this stage.

LazyNext uses:
- **Cloudflare D1** (SQLite-based) in production via `@prisma/adapter-d1`
- **SQLite** with `better-sqlite3` locally via `PrismaBetterSqlite3`
- **SQLite** in CI via `PrismaBetterSqlite3`

## Decision

**Defer the Prisma 8 upgrade until:**
1. Prisma 8.0.0 stable (non-RC) is released, AND
2. SQLite/D1 support reaches general availability in Prisma 8

Prisma 7.10.0 remains the correct choice. Prisma 7 is fully supported with bug
fixes for 12 months after Prisma 8.0.0 final ships.

## Consequences

- No action required — stay on `prisma@7.10.0` and `@prisma/client@7.10.0`
- Pin to `prisma@prev` if any dependency uses a floating `latest` tag
- Revisit when Prisma 8 stable ships with SQLite GA support
- The `prisma@latest` tag now points to `8.0.0-rc.12`, so `package.json` must
  use explicit version pins (already done: `"prisma": "7.10.0"`)
