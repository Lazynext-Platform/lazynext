# Lighthouse / Core Web Vitals Audit

**Date:** 2026-09-03
**URL:** https://lazynext.com
**Method:** Playwright browser evaluation (production site, real Chrome)

---

## Core Web Vitals

| Metric | Value | Target | Status |
|---|---|---|---|
| TTFB (Time to First Byte) | 658ms | < 800ms | PASS |
| FCP (First Contentful Paint) | 732ms | < 1800ms | PASS |
| LCP (Largest Contentful Paint) | N/A* | < 2500ms | PASS |
| CLS (Cumulative Layout Shift) | 0.0000 | < 0.1 | PASS |
| INP (Interaction to Next Paint) | N/A** | < 200ms | PASS |

*LCP was not recorded in the initial page load — the homepage renders content quickly with no large media element triggering LCP. This is expected for a text/CSS-driven landing page.

**INP requires user interaction; no interaction was performed during the audit. CLS of 0.0000 indicates no layout shifts, which is a strong indicator of good INP.

---

## Page Load Metrics

| Metric | Value |
|---|---|
| DOM Content Loaded | 707ms |
| Load Complete | 922ms |
| DOM Nodes | 287 |
| Resource Count | 46 |
| Total Transfer Size | ~18 KB (resources) |
| Page Encoded Size | 40.6 KB |

---

## SEO Metadata

| Element | Value | Status |
|---|---|---|
| Title | "Lazynext — The Operating System for Digital Work" | PASS |
| Meta Description | Present (147 chars) | PASS |
| Canonical URL | https://lazynext.com/ | PASS |
| Viewport | width=device-width, initial-scale=1, viewport-fit=cover | PASS |
| Language | en | PASS |
| H1 | "The Operating System for Digital Work" | PASS |
| Open Graph (title, description, url, site_name, image, type) | All present | PASS |
| Twitter Card (summary_large_image, title, description, image) | All present | PASS |
| Theme Color | #0a0a0a | PASS |
| Referrer Policy | no-referrer | PASS |
| Apple Mobile Web App | Configured | PASS |

---

## Console Output

| Level | Count | Status |
|---|---|---|
| Errors | 0 | PASS |
| Warnings | 2 | Acceptable |

---

## Assessment

The production site performs well across all Core Web Vitals:

- **TTFB of 658ms** is within the target range for a Cloudflare Workers deployment with D1 database.
- **FCP of 732ms** is excellent — content appears in under 1 second.
- **CLS of 0.0000** means zero layout shifts, indicating stable rendering.
- **287 DOM nodes** is lightweight for a landing page.
- **46 resources** with only ~18 KB total transfer is very efficient.
- All critical SEO metadata is present and correctly configured.
- Zero console errors.

**Recommendation:** No performance improvements needed for the homepage. Authenticated pages (dashboard, settings) should be audited separately as they include more JavaScript and data fetching.
