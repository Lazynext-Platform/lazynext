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
- New API route `/api/brand/product-extract` for URL → product extraction
- BrandProfile extends (not replaces) the existing BrandKit model
- Existing BrandKit UI continues to work; new brand intelligence is additive
- SSRF protection is mandatory before any URL fetching goes to production

## Implementation Notes (Updated)

Actual file structure:
```
src/lib/brand/
  types.ts           — BrandExtraction, ProductExtraction types
  fetch.ts           — safeFetchText() with SSRF protection
  extract.ts         — extractBrand() and extractProduct() (consolidated)
  profile.ts         — buildProfile() → normalized BrandProfile
  prompts.ts         — system prompts for brand/product extraction
```

`product-extract.ts` was intentionally consolidated into `extract.ts` — both share
the same fetch + LLM pipeline and only differ in the system prompt.

Prisma `BrandProfile` model added to `schema.prisma` with:
- company, domain, industry, positioning, audience, tone, visualStyle
- colors, fonts, prohibitedClaims, brandVocabulary, sourceUrls (all JSON)
- extractionTimestamp, createdAt

The brand extract API route saves to both `BrandKit` (for UI compatibility) and
`BrandProfile` (for normalized structured storage).

The product extract API route saves to `AdProduct` for reuse in generation workflows.

SSRF protection implemented in `fetch.ts`:
- HTTPS enforcement
- Private IP / localhost blocking via `dns.lookup()`
- Response size limits (256KB)
- Timeouts (15s)
- Note: Cloudflare Workers do not provide full DNS-resolution APIs; production
  hardening remains limited compared to Node.js environments.
