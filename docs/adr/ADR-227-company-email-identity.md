# ADR-227: Company Email Identity

**Date:** 2026-09-15
**Status:** Accepted
**Supersedes:** None

## Context

Companies had no email identity. The `openpolsia` reference provided
per-company email sending and receiving via `{slug}@mail.lazynext.com`.

## Decision

**Add company email identity** with three components:

1. **Company Email Service** (`src/lib/services/company-email.ts`) —
   - **Outbound**: sends email via Resend API when `RESEND_API_KEY` is
     configured. In dry-run mode (no key), emits an event instead.
   - **Inbound**: processes inbound emails via webhook. Verifies Svix
     signatures when `SVIX_SECRET` is configured. Extracts the org slug
     from the `to` address (`{slug}@mail.lazynext.com`). Screens for
     prompt injection. Creates a triage task.

2. **Prompt injection detector** (`detectPromptInjection` in `security.ts`) —
   deterministic, rule-based scanner with 19 patterns (ignore-previous,
   you-are-now, jailbreak, DAN mode, eval(), base64 payloads, etc.).
   No LLM calls.

3. **API routes**:
   - `POST /api/email/send` — authenticated outbound email
   - `POST /api/email/inbound` — unauthenticated inbound webhook (Svix-verified)

All external-credential features are **flag-gated and locally testable**.
Production email delivery requires `RESEND_API_KEY`. Inbound webhook
verification requires `SVIX_SECRET`. Neither is claimed as production-verified
without actual credentials.

## Consequences

- Companies can send and receive email from their own identity.
- Inbound emails are screened for prompt injection before triage.
- Triage tasks are created automatically from inbound emails.
- 26 new tests (prompt injection + Svix verification).
