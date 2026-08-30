# ADR-038: Viral Content Analyzer UI

**Date:** 2026-08-30
**Status:** Accepted

## Context

LazyNext already had a viral content analysis library (`src/lib/creative/viral-analysis.ts`) and
a backing API route (`/api/creative/viral-analysis`) that analyze a piece of content for viral
potential — virality score, grade, contributing factors, shareability, hook analysis, emotional
journey, pacing, trend alignment, viral mechanics, and audience psychology. The library and API
were built in ADR-008 as part of the viral2viral remix flow, but they were only accessible
programmatically. There was no UI page, so users could not access the feature in the browser.

A feature that exists only as an API is effectively invisible to non-technical users. The viral
analysis output is rich and multi-dimensional, and rendering it in a structured UI would let
marketers interpret the results without parsing JSON. The analysis is also a natural standalone
tool: a marketer can paste any content (a script, a hook, a full ad) and get a viral potential
readout before committing to production.

The patterns were drawn from `viral2viral` (which produced the original analysis library) and
`RemixKit` (which demonstrated a studio-style UI for content analysis tools).

## Decision

### 1. New UI component `src/components/ViralAnalyzerStudio.tsx`

A dedicated React component that renders the full viral analysis output in a structured layout.
The component handles form input (the content to analyze), triggers the API call, and renders the
multi-dimensional results in clearly labeled sections.

### 2. New page at `src/app/viral-analyzer/page.tsx`

A new Next.js page mounts the `ViralAnalyzerStudio` component and provides the page-level chrome
(heading, auth gating, credit display). The page is registered in the nav header so users can
discover it.

### 3. Uses existing `/api/creative/viral-analysis` endpoint

No new API route or library is introduced. The UI calls the existing endpoint, which already
deducts credits, calls the analysis library, and returns the structured result. This keeps the
change purely in the UI layer.

### 4. 6-credit cost (`VIRAL_ANALYSIS_COST`)

Each analysis costs 6 credits, matching the existing `VIRAL_ANALYSIS_COST` constant. The UI
displays the cost before execution so users can make an informed decision, consistent with other
credit-consuming features.

### 5. Renders full analysis output

The component renders every dimension returned by the API: virality score, grade, contributing
factors, shareability assessment, hook analysis, emotional journey, pacing, trend alignment,
viral mechanics, audience psychology, and improvement recommendations. Each dimension gets its
own labeled section so the output is scannable rather than a wall of text.

### 6. Auth-gated with `AuthModal` pattern

The page uses the existing `AuthModal` pattern: unauthenticated users see a preview of the tool
with a prompt to sign in, and the analysis action requires an authenticated session. This
matches the auth gating used across other creative studio pages.

## Consequences

- **Positive:** Makes the viral analysis feature discoverable and usable in the browser, where it
  was previously API-only.
- **Positive:** No new API or library changes are required; the change is purely a UI layer on
  existing functionality, keeping the surface area small and the risk low.
- **Positive:** The structured rendering makes the multi-dimensional output interpretable for
  non-technical marketers.
- **Negative:** The UI is read-only with respect to the analysis — it does not let users edit or
  re-run individual dimensions. A marketer who wants to tweak the analysis must re-run the full
  analysis.
- **Negative:** 6 credits per analysis may be steep for exploratory use where a marketer only
  wants a quick virality read.

## Research Sources

Inspired by `viral2viral` (MIT license, issue #42), which produced the original viral analysis
library and API, and `RemixKit` (MIT license, issue #16), which demonstrated a studio-style UI
for content analysis tools. Took the studio-UI pattern — structured, sectioned rendering of
multi-dimensional analysis output with auth gating and credit display. Adapted to LazyNext's
Next.js / React stack and existing viral-analysis API. Did NOT copy the original UI code; the
component is a clean React implementation against LazyNext's existing viral-analysis endpoint.
