# SEO Strategy — Lazynext Operating System

**Status:** Living document. Last updated 2026-09-03.
**Scope:** Technical and on-page SEO for the Lazynext platform. Grounded in source inspection of `src/proxy.ts` (locale routing, redirects), `src/i18n/messages.ts` (13 locales), and the Phase 0 Discovery Report (§C, §I).

> SEO applies only to **public, crawlable pages**. Authenticated/private pages must be excluded from indexing (see §11).

---

## 1. SEO Objectives

1. **Discoverability** — public pages (landing, pricing, legal, feature landing pages, blog/docs) are crawlable and rank for relevant queries.
2. **International coverage** — 13 locales served via path-based routing + hreflang.
3. **Clean URL architecture** — stable, semantic, lowercase, no query-param routing for content.
4. **Performance** — Core Web Vitals in the "good" band for all primary pages.
5. **No index leakage** — authenticated routes, internal/dev surfaces, and duplicate paths are noindex.

---

## 2. URL Architecture

### 2.1 Clean URLs
- Lowercase, hyphen-separated, no trailing slashes (configurable), no `.html`.
- Locale prefix for non-default: `/zh/pricing`, `/ja/terms`. Default locale (`en`) has no prefix.
- Feature pages: `/creative/generators` (consolidated), not 178 separate top-level routes.
- Legal: `/terms`, `/privacy`, `/cookies`, `/acceptable-use`, `/refund-policy`, `/dpa`, `/security`, `/vulnerability-disclosure`.
- Developer: `/docs`, `/api`, `/api/docs`, `/mcp`.
- Blog/docs: `/blog/[slug]`, `/docs/[slug]`.

### 2.2 Redirects (from `src/proxy.ts`)
- Legacy ad-creative routes (`/ad-*`, `/creative-ad-*`, `/brand-*`, `/brief-*`, `/hook-*`, and ~40 named pages) **308-redirect** to `/creative/generators`. These are permanent consolidations; the 308 preserves method and SEO equity.
- **Action:** ensure the redirect map is complete and that the target page is indexable.

### 2.3 Canonical URLs
- Every public page emits `<link rel="canonical">` pointing to the absolute, locale-prefixed URL.
- For locale variants, canonical points to the same-locale URL (not the `en` default) to avoid collapsing hreflang signals.
- Query parameters that don't change content (e.g. `utm_*`) are stripped from canonical.

---

## 3. Page Titles & Descriptions

| Page | Title template | Description template |
|---|---|---|
| Landing (`/`) | "Lazynext — AI Operating System for Marketing Teams" | "Lazynext is the AI operating system for marketing teams. Generate, plan, publish, and analyze ad creative across platforms." |
| Pricing (`/pricing`) | "Pricing — Lazynext" | "Credit packs and plans for Lazynext. Pay as you go; no subscription required." |
| Feature landing | "{Feature} — Lazynext" | "{Feature description with primary keyword}." |
| Legal | "{Document} — Lazynext" | "Lazynext {Document}." |
| Docs | "{Topic} — Lazynext Docs" | "{Topic} documentation for Lazynext." |
| Blog | "{Post title} — Lazynext Blog" | "{Post excerpt}." |

**Rules:**
- Titles ≤ 60 characters; descriptions ≤ 155 characters.
- Unique per page; no duplicates across locales (translate, don't copy).
- Brand suffix "— Lazynext" on all except homepage.

---

## 4. Crawlability

### 4.1 robots.txt
Host at `/robots.txt` (served by Next.js `metadata` or static). Proposed:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /settings
Disallow: /admin
Disallow: /my-work
Disallow: /assets
Disallow: /editor
Disallow: /ads
Disallow: /teams
Disallow: /share/
Disallow: /mcp-server
Disallow: /media-service-boundary
Disallow: /ml-insights
Disallow: /testing-lab
Disallow: /observability
Disallow: /status
Disallow: /*?locale=
Sitemap: https://lazynext.com/sitemap.xml
```

- `?locale=` query variant is disallowed in favor of path-based locale URLs (`/zh/...`).
- API routes are disallowed (not for indexing).
- Authenticated routes are disallowed (defense-in-depth alongside noindex).

### 4.2 Sitemap
- `/sitemap.xml` generated at build/runtime, listing all public, indexable URLs across all 13 locales with hreflang alternates.
- Exclude disallowed/authenticated routes.
- Include `<lastmod>` from content updatedAt where available.
- Split into multiple sitemaps if >50k URLs (e.g. `sitemap-pages.xml`, `sitemap-blog.xml`, `sitemap-docs.xml`) with a sitemap index.

---

## 5. Structured Data (Schema.org)

| Page | Schema type | Purpose |
|---|---|---|
| Landing | `Organization`, `WebSite` (with SearchAction) | Brand, sitelinks search box |
| Pricing | `Product` + `Offer` (per credit pack) | Rich pricing snippets |
| Feature landing | `SoftwareApplication` + `FAQPage` (where applicable) | App rich results |
| Blog post | `Article` (with author, datePublished, image) | Article rich results |
| Docs | `TechArticle` | Article rich results |
| Legal | (none) | Not needed |
| Breadcrumbs | `BreadcrumbList` | Breadcrumb rich results |

**Rules:**
- Emit JSON-LD in `<head>`; validate with Google Rich Results Test.
- Keep structured data in sync with visible page content (no mismatches).

---

## 6. Open Graph & Twitter Cards

| Tag | Value |
|---|---|
| `og:title` | Page title (without brand suffix) |
| `og:description` | Meta description |
| `og:image` | 1200×630 PNG/JPG, branded, per-locale where sensible |
| `og:url` | Canonical URL |
| `og:type` | `website` / `article` |
| `og:locale` | Current locale (`en_US`, `zh_CN`, etc.) |
| `og:site_name` | Lazynext |
| `twitter:card` | `summary_large_image` |
| `twitter:site` | `@lazynext` (if applicable) |

- Default OG image at `/og/default.png`; per-page overrides for landing, pricing, blog.
- Ensure OG images are served over HTTPS and allowed by CSP `img-src`.

---

## 7. Semantic HTML & Headings

- One `<h1>` per page (the page title).
- `<h2>` for major sections; `<h3>`–`<h6>` for sub-sections; no skipping levels.
- Use `<article>`, `<section>`, `<nav>`, `<header>`, `<footer>`, `<aside>` appropriately.
- `<main>` wraps primary content; `<nav>` for navigation.
- Links (`<a href>`) for navigation, not `<div onclick>`; ensure crawlable internal links.

---

## 8. Internal Links & Breadcrumbs

- **Internal linking:** every public page links to at least one other public page (landing → pricing → features → docs). Footer contains links to all legal pages and primary sections.
- **Breadcrumbs:** render on all non-landing pages (e.g. Home → Pricing, Home → Docs → Topic). Match the `BreadcrumbList` structured data.
- **Anchor text:** descriptive, keyword-relevant; avoid "click here".

---

## 9. Images

- **Alt text:** every meaningful image has descriptive alt; decorative images use `alt=""`.
- **Format:** WebP/AVIF with fallback; `next/image` for responsive `srcset` and lazy loading.
- **Filename:** descriptive, hyphenated (e.g. `creative-dashboard.png`).
- **Dimensions:** width/height attributes to prevent CLS.

---

## 10. Core Web Vitals

| Metric | Target (good) | Strategy |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Optimize hero image/font; preload LCP asset; SSR/ISR for public pages; CDN cache. |
| INP (Interaction to Next Paint) | < 200ms | Reduce JS; defer non-critical scripts; optimize event handlers; avoid long tasks. |
| CLS (Cumulative Layout Shift) | < 0.1 | Reserve space for images/ads/embeds; avoid late-loading fonts; stable layout. |
| TTFB (Time to First Byte) | < 800ms | Cloudflare edge cache; ISR/SSG for public pages; minimal middleware work on cached paths. |

**Notes:**
- Middleware (`src/proxy.ts`) runs on every request; geo/locale logic should be cache-friendly (vary by locale path, not cookie where possible).
- Public pages should prefer Static Site Generation (SSG) or Incremental Static Regeneration (ISR) to minimize TTFB.
- Monitor via Cloudflare Web Analytics + CrUX; lab testing via Lighthouse CI in CI pipeline.

---

## 11. JavaScript Rendering & Crawlability

- Next.js SSR/SSG means core content is in the initial HTML — good for SEO.
- Avoid client-only rendering for public page content (content must be in HTML without JS).
- Hydration is fine; ensure the hydrated state matches server HTML (no mismatch that drops content).
- Test with Google Search Console's URL Inspection (rendered vs. raw HTML).

---

## 12. Private / Authenticated Pages (noindex)

All authenticated or internal routes must emit `<meta name="robots" content="noindex, nofollow">` (and be in `robots.txt` Disallow):

| Route pattern | Reason |
|---|---|
| `/dashboard`, `/settings`, `/admin`, `/my-work`, `/assets`, `/editor`, `/ads` | Authenticated user data |
| `/teams/*` | Private collaboration |
| `/share/[token]` | Unlisted share links (noindex, follow) |
| `/api/*` | API endpoints |
| `/mcp-server`, `/media-service-boundary`, `/ml-insights`, `/testing-lab` | Internal/dev surfaces |
| `/observability`, `/status` | Operational (status can be indexable if public-facing) |

- Use the Next.js `metadata` API to set `robots: { index: false, follow: false }` on these routes.
- `noindex, follow` for share links (allow link equity to pass but don't index the share page itself).

---

## 13. hreflang & Multilingual

13 locales: `en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id`.

### 13.1 Implementation
- Path-based URLs: `/zh/pricing`, `/ja/terms`, etc. (default `en` has no prefix).
- Each page emits `<link rel="alternate" hreflang="{locale}" href="{url}">` for every locale, plus `hreflang="x-default"` pointing to the `en` canonical.
- Locale mapping to `hreflang` values: `en` → `en`, `zh` → `zh-Hans` (or `zh-CN`), `ja` → `ja`, `es` → `es`, `ko` → `ko`, `pt` → `pt`, `fr` → `fr`, `de` → `de`, `ar` → `ar`, `hi` → `hi`, `vi` → `vi`, `th` → `th`, `id` → `id`.
- RTL: `ar` pages set `<html dir="rtl" lang="ar">`.

### 13.2 Sitemap hreflang
- Each URL in `sitemap.xml` lists `<xhtml:link rel="alternate" hreflang="..." href="..."/>` for all locales.

### 13.3 Content parity
- All locales must have the same public pages; if a page isn't translated, serve the `en` version with `hreflang="x-default"` (don't create empty locale pages).

---

## 14. Monitoring & Tooling

| Tool | Purpose |
|---|---|
| Google Search Console | Index coverage, queries, CWV, sitemap status |
| Bing Webmaster Tools | Bing index/coverage |
| Lighthouse CI | Lab CWV + SEO score in CI |
| Cloudflare Web Analytics | Privacy-friendly traffic + CWV (CrUX) |
| Screaming Frog / site crawler | Audit titles, descriptions, canonicals, hreflang, broken links |
| Schema.org Rich Results Test | Validate structured data |

---

## 15. SEO Remediation Backlog

1. Generate `robots.txt` with the rules in §4.1.
2. Generate `sitemap.xml` (with hreflang alternates) for all public pages.
3. Add canonical, title, description, OG, and hreflang via Next.js `metadata` API on every public page.
4. Add structured data (Organization, WebSite, Product/Offer, Article, BreadcrumbList).
5. Set `noindex` on all authenticated/internal routes (§12).
6. Consolidate legacy ad-creative routes (308 redirects already in `proxy.ts`) and ensure the target is indexable.
7. Remove internal economics ("~$0.01-0.04", "~95%") from the public homepage (also a consumer-protection issue — see `docs/COMPLIANCE.md` §8).
8. Add Lighthouse CI to the pipeline; gate on SEO + CWV scores for public pages.
9. Ensure public pages use SSG/ISR for low TTFB.
10. Add alt text audit to CI (lint rule for `<img>` without `alt`).
11. Verify hreflang pairs are bidirectional and complete across all 13 locales.
12. Submit sitemap to Google Search Console and Bing Webmaster Tools.
