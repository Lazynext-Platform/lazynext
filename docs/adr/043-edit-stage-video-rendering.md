# ADR-043: Edit Stage Video Rendering Service Boundary

**Date:** 2026-09-02
**Status:** Accepted
**Series:** QQ

## Context

The pipeline's `edit` stage currently produces an Edit Decision List (EDL) —
a JSON structure referencing media URLs, audio URLs, shot durations, voiceover
text, on-screen text, and transitions. However, it does **not** render the EDL
into an actual video file.

The architecture audit listed "Edit stage real rendering — produces EDL only;
no actual video output or clip editor integration" as a known gap.

### Why FFmpeg cannot run in a Cloudflare Worker

Research confirms that FFmpeg (both native and ffmpeg.wasm) cannot run inside
a Cloudflare Worker isolate:

1. **Runtime WASM compilation is blocked** — `WebAssembly.instantiate()` from
   fetched bytes is forbidden by workerd. Only build-time precompiled modules
   are allowed.
2. **Bundle size limits** — The ffmpeg.wasm core is 9.75 MiB gzipped, which
   fills the entire 10 MiB paid Worker bundle budget with no room for
   application code.
3. **No Web Workers or threads** — ffmpeg.wasm offloads to Web Workers, which
   don't exist in workerd. The multithread core needs `SharedArrayBuffer`,
   which is also unavailable.
4. **128 MB memory ceiling** — FFmpeg's buffers plus the 30 MB core
   decompressed push against the isolate's 128 MB limit.
5. **CPU time limits** — Workers allow 30s default, 5 min max. Real video
   transcoding takes minutes to hours.

### What works: offloading FFmpeg to an external service

The correct pattern is to hand off the FFmpeg command to an external rendering
service and poll for completion:

1. Worker sends the EDL + media URLs to a rendering API.
2. Rendering service runs FFmpeg on a GPU/CPU instance.
3. Worker polls or receives a webhook when rendering completes.
4. The rendered video URL is stored as the pipeline's edit-stage output.

Existing services that provide this:
- **RendoBar** — FFmpeg API with SDK, webhooks, and Cloudflare Worker integration
- **Cloudflare Stream** — serverless video pipeline (encoding, storage, delivery)
- **Custom GPU worker** — a separate container/VM running FFmpeg

## Decision

**Define a `VideoRenderProvider` interface and implement a dry-run stub.**

The edit stage will remain EDL-only by default. When a video rendering
provider is configured (via `VIDEO_RENDER_API_URL` env var), the edit stage
will send the EDL to the external service and poll for the rendered video URL.

### Interface

```typescript
interface VideoRenderProvider {
  readonly id: string;
  render(edl: EditDecisionList): Promise<RenderResult>;
}

interface RenderResult {
  videoUrl: string;
  durationSec: number;
  format: string;
  thumbnailUrl?: string;
}
```

### Implementations

1. **`dryRunRender`** — returns a placeholder video URL (current behavior).
   Used when no rendering service is configured.
2. **`externalRender`** — sends the EDL to `VIDEO_RENDER_API_URL` and polls
   for completion. Used when a rendering service is configured.

### Configuration

- `VIDEO_RENDER_API_URL` — base URL of the external rendering service
- `VIDEO_RENDER_API_KEY` — optional API key for authentication
- `VIDEO_RENDER_TIMEOUT_MS` — polling timeout (default: 120000ms)

## Consequences

### Positive

- The edit stage can produce real video output when a rendering service is
  available, without changing the Cloudflare Worker deployment.
- The provider interface is extensible — new rendering services can be added
  without modifying the pipeline executor.
- Dry-run behavior is preserved for local development and testing.

### Negative

- Requires an external service for real video rendering (additional cost and
  infrastructure).
- Polling adds latency to the edit stage (seconds to minutes depending on
  video length).

### Neutral

- The EDL format is already defined and stable — the rendering service just
  needs to consume it.
- The `VideoRenderProvider` interface follows the same pattern as other
  provider interfaces (`OCRProvider`, `ASRProvider`, etc.).
