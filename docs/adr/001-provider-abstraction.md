# ADR-001: Provider Abstraction Layer

## Status
Accepted

## Context
LazyNext currently hard-wires all AI generation to the Atlas Cloud API (`src/lib/atlas.ts`). 
Every workflow (UGC, drama, skit, ad-reference) calls `submitRawGen` / `atlasChat` directly. 
There are no swappable provider interfaces. The directive requires providers to be swappable 
and not hard-coded to one vendor.

The existing `atlas.ts` client is well-designed (BYOK support, retry logic, media sniffing, 
poll-once pattern) and should NOT be rewritten. Instead, we introduce interfaces that atlas.ts 
satisfies as the first concrete implementation.

## Decision
Create `src/lib/providers/` with TypeScript interfaces for each capability:

```
src/lib/providers/
  types.ts          — shared types (ProviderTask, ProviderResult, Capability)
  image.ts          — ImageProvider interface
  video.ts          — VideoProvider interface  
  audio.ts          — TTSProvider + ASRProvider interfaces
  research.ts       — ResearchProvider interface (URL → brand/product extraction)
  analysis.ts       — AdAnalysisProvider interface (reference video → structured analysis)
  registry.ts       — ModelCapabilityRegistry + provider registry
  atlas-image.ts    — Atlas Cloud ImageProvider implementation
  atlas-video.ts    — Atlas Cloud VideoProvider implementation
  atlas-audio.ts    — Atlas Cloud TTSProvider implementation
  atlas-research.ts — Atlas Cloud ResearchProvider implementation (LLM-based)
```

Each interface declares:
- `generate(...)` / `edit(...)` / `transcribe(...)` etc.
- Returns `ProviderTask` (async: id + getUrl for polling)
- Does NOT handle credits (that's the workflow layer's job)

The registry maps capabilities to providers, allowing future model routing by cost/quality/speed.

## Consequences
- Existing workflow code continues to work (atlas.ts is not removed)
- New code should use provider interfaces instead of calling atlas.ts directly
- Existing workflow files can be gradually refactored to use providers
- No breaking changes to existing API routes
