# ADR-025: Advanced Analytics Hub

## Date
2026-08-29

## Status
Accepted

## Context
The platform had analytics data scattered across multiple endpoints: `/api/credits/analytics` for credit usage, `/api/ads/metrics` for ad performance, `/api/ads/report` for campaign reports, and `/api/analytics/ga4` for Google Analytics. Users had to visit multiple pages and APIs to get a complete picture of their creative performance, credit usage, and campaign health.

A unified analytics dashboard was needed to provide a single view of all key metrics, trends, and breakdowns.

## Decision
1. Created `/api/analytics/hub` — a single API endpoint that aggregates data from all sources:
   - Creative performance (CreativePerformance model): impressions, clicks, conversions, spend, revenue, CTR, CVR, ROAS
   - Credit usage (CreditLedger model): spent, granted, by reason, 7-day average for projection
   - Creation stats (Creation model): total, by status, by template, credits used
   - Campaign stats (AdCampaign model): total, active, by platform
   - User balance and credit projection (days remaining at current spend rate)
2. Created `/analytics-hub` page with:
   - 8 KPI cards (impressions, clicks, conversions, spend, revenue, creations, credits, campaigns)
   - SVG sparkline charts for revenue and creation trends (no external charting library)
   - Mini bar charts for breakdowns by platform, template, and credit category
   - Top performing creatives table with sortable metrics
   - Credit projection section with 30-day spend, daily average, and days remaining
3. All charts are pure SVG/CSS — no external charting dependency added
4. Added to dashboard Quick Create grid
5. Localized in 13 locales

## Consequences
- Users get a complete analytics overview in one page instead of visiting multiple pages
- The API aggregates from existing models — no new database tables needed
- SVG sparklines and CSS bar charts keep the bundle small (no chart library dependency)
- Credit projection helps users plan their usage and know when to purchase more credits
- The hub is read-only — it doesn't modify any data, just aggregates and displays
- Performance scales with data volume: the 30-day window limits query size
