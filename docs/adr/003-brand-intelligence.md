# ADR-003: Brand Intelligence Layer

## Status
Accepted

## Context
LazyNext's current BrandKit model is minimal: name, logoUrl, colors (JSON), fontNote, 
toneNote — all manually entered. There is no URL → brand extraction capability.

The directive requires: URL → brand research → website extraction → structured brand 
model → products → colors → fonts → visual style → tone → selling points → evidence-backed 
creative brief.

Research findings:
- **context-dot-dev/ad-maker (#1)**: brand website research, extracts offers/value props/proof
- **creative-ad-agent (#3)**: research-driven, extracts real data from brand websites
- **AdsTurbo/product-page-to-ad-brief (#40)**: product page → structured brief (MIT, portable schema)

## Decision
Create `src/lib/brand/` with a brand intelligence layer:

```
src/lib/brand/
  types.ts           — BrandProfile, BrandExtraction, ProductExtraction
  extract.ts         — extractBrand(url) → BrandExtraction (fetch page + LLM analysis)
  product-extract.ts — extractProduct(url) → ProductExtraction (product page → structured facts)
  profile.ts         — buildProfile(extraction) → BrandProfile (normalized, stored in DB)
  prompts.ts         — System prompts for brand/product extraction
```

Add a new Prisma model `BrandProfile` to store structured brand intelligence:
- company, domain, industry, positioning, audience
- products (JSON array), features, benefits, claims, proofPoints
- colors (JSON), fonts, visualStyle, tone
- prohibitedClaims, brandVocabulary
- sourceUrls, evidenceSnippets, extractionTimestamp

**SSRF protection**: URL fetching must validate against private IP ranges, block localhost, 
enforce HTTPS, limit response size, and timeout. This is critical for security.

## Consequences
- New API route `/api/brand/extract` for URL → brand extraction
- New API route `/api/brand/products/extract` for URL → product extraction
- BrandProfile extends (not replaces) the existing BrandKit model
- Existing BrandKit UI continues to work; new brand intelligence is additive
- SSRF protection is mandatory before any URL fetching goes to production
