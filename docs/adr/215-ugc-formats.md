# ADR-215: UGC Formats

**Date:** 2026-09-02
**Status:** Accepted

## Context

User-generated content (UGC) ad formats are a core offering of the LazyNext
creative platform. The UGC formats library provides structured format
definitions for various UGC ad styles including testimonials, unboxing,
before/after, and lifestyle content.

## Decision

Implement `ugc-formats` as a creative library in `src/lib/creative/ugc-formats.ts`
that:

- Defines 16 UGC ad formats with structured metadata
- Provides format names, descriptions, aspect ratios, and scene templates
- Serves as a reference for creative generation workflows
- No credit cost (reference data module)
- Used by the creative pipeline and format converter

### API

No dedicated API route — consumed internally by other creative libraries.

## Consequences

- Provides a single source of truth for UGC format definitions
- No credit cost (infrastructure module)
- Covered by existing unit tests
