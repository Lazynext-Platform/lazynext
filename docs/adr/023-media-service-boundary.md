# ADR-023: Media Service Boundary Abstraction

## Date
2026-08-29

## Status
Accepted

## Context
The platform runs on Cloudflare Workers, which cannot execute GPU-dependent workloads. Research repositories #65-84 (FireRed media foundation models) provide valuable capabilities — ASR, TTS, OCR, image editing, audio processing, voice cloning, video generation, and lip sync — but all require PyTorch and 16-30GB+ VRAM. These cannot run on Cloudflare Workers under any circumstances.

The platform needed a way to define these capabilities as part of its product surface without requiring GPU infrastructure today, while keeping a stable contract for when external GPU services are wired up.

## Decision
1. Created `src/lib/creative/media-service-boundary.ts` as a domain library that defines a stable contract for 8 GPU-backed media capabilities
2. `MediaCapability` union: `asr`, `tts`, `ocr`, `image_edit`, `audio_process`, `voice_clone`, `video_gen`, `lip_sync`
3. `ServiceDescriptor` models each capability with: name, description, status (`available` | `dry_run` | `unavailable` | `coming_soon`), GPU requirements, min VRAM, runtime, estimated latency, input/output schema, credit cost, and supported formats
4. Five capabilities (asr, tts, ocr, image_edit, video_gen) are wired to Atlas Cloud AI and run as real services when `ATLASCLOUD_API_KEY` is set; they fall back to dry-run stubs when no key is configured (local development with mock server)
5. Three capabilities (audio_process, voice_clone, lip_sync) remain as dry-run stubs — Atlas Cloud does not yet offer corresponding endpoints
6. `dispatchMediaService()` is the single entry point — it checks service status, routes to the Atlas Cloud handler when a key is present, and falls back to dry-run otherwise; on Atlas failure it gracefully degrades to dry-run with a warning
7. The return type `MediaServiceOutput` is identical regardless of whether the service is dry-run or real — callers need no changes when real services are connected
8. To wire up a real service: flip the descriptor `status` to `available` and add a handler to `ATLAS_HANDLERS` — the contract stays identical
8. `getServiceRegistry()` returns a public manifest of all capabilities, statuses, and requirements — used by the UI to show what's available
9. Credit costs vary per capability (3-12 credits) and scale with input size (e.g., TTS costs more for long text)
10. API route at `/api/creative/media-service-boundary` — GET returns the registry, POST dispatches a service request

## Consequences
- GPU-dependent capabilities are part of the product surface today, without GPU infrastructure
- The stable contract means wiring up real services is a configuration change, not an architecture change
- Dry-run stubs enable development and testing of dependent features (e.g., clip editor can use ASR) without real GPU services
- The service registry is public — users can see what capabilities exist and which are available vs. coming soon
- Credit costs are defined upfront, so billing logic doesn't change when real services are connected
- The boundary is explicit — no temptation to try to run GPU workloads on Cloudflare Workers
- Future GPU service integration (e.g., a separate GPU worker, external API, or self-hosted model server) requires only implementing the dispatch path for each capability
- The `coming_soon` status allows announcing capabilities before they're wired up, creating product anticipation
