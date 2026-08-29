# ADR-026: AI A/B Test Automation

## Date
2026-08-29

## Status
Accepted

## Context
The platform had manual A/B testing capabilities: users could generate test plans, create campaigns with multiple variants, and check results. However, the entire lifecycle required manual intervention at every step — generating hypotheses, launching campaigns, monitoring results, and promoting the winner.

An automated closed-loop system was needed to reduce manual work and let users set up tests that run autonomously until a statistically significant winner emerges.

## Decision
1. Created `src/lib/creative/ab-automation.ts` — domain library with:
   - `AutomationJob` type tracking the full lifecycle (planning → launching → monitoring → completed/failed)
   - `determineWinner()` — statistical significance test using z-score approximation with normal CDF
   - `calculateSignificance()` — two-tailed z-test comparing conversion rates between variants
   - `summarizeJob()` — human-readable job summary
   - Winner declared when: all variants have ≥1000 impressions AND top variant has ≥90% significance vs second-best
2. Created `/api/creative/ab-automation` — three HTTP methods:
   - GET: list all automation jobs (stored as AdCampaign records with `__automation` metadata)
   - POST: start a new automation job (AI generates hypothesis, creates campaigns, deducts 10 credits)
   - PATCH: check and update a job (fetches latest metrics, checks for winner, pauses losers, boosts winner budget)
3. Created `/ab-automation` page with:
   - Job creation form (test name, platform, metric, budget, creative IDs, dry-run toggle)
   - Job list with status indicators, variant comparison table, winner badge
   - Manual "Check Results" button to trigger metric refresh and winner detection
4. Automation state stored in AdCampaign.metrics JSON field with `__automation` key — no new Prisma model needed
5. Winner promotion: losing campaigns are paused, winner's daily budget is doubled
6. Dry-run mode is the default — no real ad spend unless explicitly disabled
7. Localized in 13 locales, ADR-026, E2E smoke tests

## Consequences
- Users can set up autonomous A/B tests that run until a winner is determined
- No new database tables — automation state is embedded in existing AdCampaign records
- The z-test approximation is sufficient for e-commerce ad testing but not rigorous enough for scientific use
- The 1000-impression minimum and 90% confidence threshold prevent premature winner declaration
- Dry-run default ensures users don't accidentally spend real ad budget
- The PATCH endpoint is idempotent — calling it multiple times is safe
- Credit cost (10) covers the AI hypothesis generation and campaign setup
