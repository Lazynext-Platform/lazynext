# Lazynext — Integration Inventory

**Date:** 2026-09-04
**Source:** Direct inspection of src/lib/, src/app/api/, prisma/schema.prisma

---

## Current Integrations

| Integration | Provider | Purpose | Auth Method | Tenancy | Status | Classification |
|---|---|---|---|---|---|---|
| Atlas Cloud | api.atlascloud.ai (prod) / mock (local) | AI generation (image, video, LLM) | API key (env: ATLASCLOUD_API_KEY) | User-scoped (credits) | Implemented, mock for local | KEEP — core AI provider |
| Dodo Payments | dodopayments npm | Billing (credit packs) | Webhook (HMAC) | User-scoped | Implemented | KEEP |
| Resend | resend npm | Email (verification, reset) | API key (env: RESEND_API_KEY) | Global | Implemented | KEEP |
| Google OAuth | NextAuth | Authentication | OAuth 2.0 | User-scoped | Implemented | KEEP |
| Meta Ads | Meta Marketing API | Ad campaign management | OAuth (PlatformConnection) | User-scoped | Implemented, dry-run mode | REFACTOR — add workspace tenancy |
| Google Ads | Google Ads API | Ad campaign management | OAuth (PlatformConnection) | User-scoped | Implemented, dry-run mode | REFACTOR — add workspace tenancy |
| TikTok | Publishing API | Social posting | OAuth (PlatformConnection) | User-scoped | Implemented | REFACTOR — encrypt tokens |
| YouTube | Publishing API | Social posting | OAuth (PlatformConnection) | User-scoped | Implemented | REFACTOR — encrypt tokens |
| Instagram | Publishing API | Social posting | OAuth (PlatformConnection) | User-scoped | Implemented | REFACTOR — encrypt tokens |
| Facebook | Publishing API | Social posting | OAuth (PlatformConnection) | User-scoped | Implemented | REFACTOR — encrypt tokens |
| LinkedIn | Publishing API | Social posting | OAuth (PlatformConnection) | User-scoped | Implemented | REFACTOR — encrypt tokens |
| GA4 | Google Analytics | Analytics | API key | User-scoped | Implemented | KEEP |
| Cloudflare D1 | Cloudflare | Database (prod) | Binding (wrangler) | Global | Implemented | KEEP |
| Cloudflare R2 | Cloudflare | Object storage (prod) | S3-compatible API | Global | Implemented | REFACTOR — bind buckets in wrangler |
| Cloudflare Workers | Cloudflare | Runtime (prod) | OpenNext | Global | Implemented | KEEP |
| Cloudflare Rate Limiter | Cloudflare | Rate limiting | Binding (wrangler) | Global | Declared but NOT invoked | REFACTOR — wire in code |

## Integration Architecture

### Current State
- Integrations are scattered across multiple lib files (src/lib/ads/, src/lib/publishing/, src/lib/atlas.ts, src/lib/payments/, src/lib/email.ts)
- No centralized integration framework
- No unified health/status tracking
- OAuth tokens stored as plain strings in PlatformConnection
- No credential rotation mechanism
- No rate-limit status tracking per integration

### Target State
- Normalized integration framework (src/lib/integrations/)
- Each integration declares: provider, connection, credential status, scopes, permissions, health, last sync, rate-limit status, errors, audit history
- Encrypted credential storage
- Centralized OAuth token management
- Health monitoring and alerting
- Rate-limit tracking per integration

## Missing Integrations (for Target OS)

| Integration | Purpose | Priority |
|---|---|---|
| GitHub | Software development loop (repos, PRs, issues, CI, deploy) | P1 |
| Calendar (Google/Outlook) | Scheduling, meetings | P2 |
| Slack/Discord | Team communication | P2 |
| Stripe | Payment processing (if expanding beyond Dodo) | P3 |
| CRM providers (HubSpot, Salesforce) | CRM sync | P3 |
| Email marketing (Mailchimp, SendGrid) | Campaigns | P2 |
| Web search | Research system | P1 |
| Browser automation | Browser execution sandbox | P1 |
