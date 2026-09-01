# Duplicate Feature Pair Audit

> Investigated 2026-09-01. Conclusion: no consolidation warranted.

## viral-analysis vs viral-analyzer

- **Library**: `src/lib/creative/viral-analysis.ts` (single file, 13.8KB)
- **Page**: `src/app/viral-analyzer/page.tsx` → uses `ViralAnalyzerStudio` component
- **Component**: `src/components/ViralAnalyzerStudio.tsx` → imports types from `viral-analysis.ts`
- **API**: `src/app/api/creative/viral-analysis/route.ts`
- **Verdict**: Same feature, naming inconsistency only. The page is called "viral-analyzer"
  while the library and API are "viral-analysis". No duplicate code exists.

## variant-matrix vs variant-matrix-generator

- **variant-matrix.ts** (21.6KB): Matrix tracking/analysis data model with 6 dimensions
  (hook, angle, format, platform, tone, cta), MatrixCell performance tracking, insights,
  winning combinations. Used by `VariantMatrix` component and `/variant-matrix` page.
  API: `/api/creative/variant-matrix`, `/api/creative/variant-matrix/[id]`,
  `/api/creative/variant-matrix/analyze`.

- **variant-matrix-generator.ts** (10.5KB): AI-powered generator that creates variant
  matrices using Atlas. 4 dimensions (hook, angle, format, platform), credit cost 5,
  validation, deterministic fallback. Used by `/variant-matrix-generator` page.
  API: `/api/creative/variant-matrix-generator`.

- **Verdict**: Different features with complementary functionality. variant-matrix tracks
  and analyzes existing creative performance; variant-matrix-generator creates new variant
  matrices via AI. Different types, different APIs, different pages. Merging would break
  both features. No consolidation needed.

## Conclusion

The audit's identified "duplicate pairs" are naming inconsistencies or complementary
features, not actual code duplicates. No files should be merged or deleted.
