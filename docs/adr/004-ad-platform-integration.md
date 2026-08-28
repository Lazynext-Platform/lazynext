# ADR-004: Ad Platform Integration

## Status
Accepted

## Context
LazyNext could generate creatives but had no way to publish them to ad platforms or retrieve
performance metrics. Users had to manually export assets and create campaigns in Meta Ads Manager
or Google Ads. The directive requires native ad-platform integration with safety guardrails.

## Decision
Create a provider-based ad platform abstraction in `src/lib/ads/`:

```
src/lib/ads/
  types.ts       — AdPlatformProvider interface, AdCampaign, AdMetrics, AdCreative types
  meta.ts        — Meta Ads provider implementation
  google.ts      — Google Ads provider implementation
  registry.ts    — provider registry (lookup by platform name)
```

### Provider Interface
Each provider implements the `AdPlatformProvider` interface:
- `createCampaign(...)` — creates a campaign with creatives, targeting, and budget
- `getMetrics(...)` — fetches spend, impressions, clicks, conversions, CTR, CPC, ROAS
- `pauseCampaign(...)` / `resumeCampaign(...)` — lifecycle control

### Dry-Run Mode
All providers support a `dryRun` flag. When enabled:
- No live API calls are made to the ad platform
- Realistic mock responses are returned (synthetic campaign IDs, plausible metrics)
- Enables safe testing in CI and local development without real ad accounts

This is the default mode. Explicit opt-in (via env var or API parameter) is required for live mode.

### Approval Gates
The `/api/ads/create` route enforces an approval gate before publishing:
1. A campaign draft is created and stored in the `AdCampaign` table with `status = "pending"`
2. The user must explicitly approve the draft before it is pushed to the live platform
3. Approval can be revoked, which pauses the live campaign

### Spend Caps
Each campaign creation enforces spend caps:
- Per-campaign daily budget cap (configurable, defaults to a safe minimum)
- Aggregate monthly spend cap per workspace (prevents runaway spend)
- Caps are checked before any live API call; violations return a 402 Payment Required

### AdCampaign Model
The `AdCampaign` Prisma model (`prisma/schema.prisma`) stores:
- Platform (meta | google), external campaign ID, status (pending | active | paused | completed)
- Budget, daily cap, creative references
- Links to `WorkflowRun` for traceability

## API Routes
- `POST /api/ads/create` — creates a campaign draft (dry-run by default)
- `POST /api/ads/metrics` — retrieves performance metrics for a campaign or date range

## Consequences
- Ad publishing is decoupled from creative generation — creatives can be published later
- Dry-run mode ensures zero risk during development and testing
- Approval gates prevent accidental spend
- Spend caps provide a hard safety net
- New providers (TikTok, LinkedIn, etc.) can be added by implementing the interface

## Implementation Notes
- `src/lib/ads/meta.ts` — Meta Marketing API integration (dry-run + live modes)
- `src/lib/ads/google.ts` — Google Ads API integration (dry-run + live modes)
- `src/lib/ads/registry.ts` — `getAdProvider(platform)` lookup
- `src/app/api/ads/create/route.ts` — campaign creation with approval gate
- `src/app/api/ads/metrics/route.ts` — metrics retrieval
- `prisma/schema.prisma` — `AdCampaign` model
