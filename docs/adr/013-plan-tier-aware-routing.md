# ADR-013: Plan-Tier Aware Provider Routing

## Date
2026-08-28

## Status
Accepted

## Context
The provider router (`src/lib/providers/router.ts`) supports filtering models by plan tier (free/starter/pro/elite), but the creative intelligence functions were calling `getLLMModel()` without a plan tier, defaulting all users to free-tier model selection. This meant users who purchased larger credit packs (pro/elite) were not getting access to higher-quality models they were entitled to.

LazyNext uses a credit-pack system (not recurring subscriptions):
- Starter: 100 credits ($9)
- Pro: 600 credits ($39)
- Elite: 2000 credits ($99)

There is no `planTier` field on the User model — the tier must be inferred from purchase history.

## Decision
1. Created `src/lib/plan-tier.ts` with `getUserPlanTier(userId)` that infers the tier from the user's largest credit purchase in the CreditLedger
2. All 10 creative intelligence functions in `src/lib/creative/intelligence.ts` now accept an optional `planTier` parameter
3. A `resolveCreativeModel(planTier)` helper calls `getLLMModel(planTier)` when no `CREATIVE_MODEL` env override is set
4. All 10 creative API routes call `getUserPlanTier(uid)` after auth and pass the tier through

## Consequences
- Users who purchased pro/elite credit packs now get higher-quality LLM models
- The `CREATIVE_MODEL` env override still takes precedence for explicit configuration
- One additional DB query per creative API call to look up purchase history
- The tier is based on the largest single purchase, not cumulative spending — a user who bought Starter twice is still "starter" tier, not "pro"
- Image, video, and audio model routing still need to be integrated (future work)
