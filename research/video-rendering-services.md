# Video Rendering Service Research — RR-B

**Date:** 2026-09-02
**Status:** Research complete
**Series:** RR

## Executive Summary

For rendering Edit Decision Lists (EDLs) into final video files from a
Cloudflare Workers-based Next.js app, **RendoBar** is the recommended service.

## Comparison

| Criterion | RendoBar | Cloudflare Stream | Custom GPU Worker |
|---|---|---|---|
| EDL/JSON timeline | Native `compose` job | No (single-clip trim only) | Must build EDL→FFmpeg translation |
| Pricing | ~$0.05/min compute, Pro $9/mo | $5/1K min stored, $1/1K min delivered | $0.17-$3.95/hr GPU |
| Webhooks | Signed HMAC, native | Upload/encode events | Must build your own |
| Workers SDK | Yes (`@rendobar/sdk`) | Yes (Workers binding) | fetch() to your endpoint |
| Max input | 10 GB (Pro) | 30 GB | VM-dependent |
| Latency (30s video) | ~6s compose | Seconds-minutes (encode only) | 8s-12min depending on complexity |
| Output formats | mp4, webm, mov, gif, etc. | HLS/DASH + MP4 | Anything FFmpeg supports |
| Infrastructure | Zero | Zero | High (Docker, CUDA, scaling) |

## Recommendation: RendoBar

1. **Native EDL support** — `compose` job type accepts declarative JSON
   timelines (tracks, clips, transitions, text, overlays)
2. **No infrastructure** — managed API, no containers/GPUs to operate
3. **Cloudflare Workers-native** — SDK runs in Workers, documented patterns
4. **Flexible fallback** — raw FFmpeg commands if JSON timeline is insufficient
5. **Cost-effective** — pay per compute second, no idle cost
6. **Webhooks** — signed completion events for async integration

## Integration Plan

1. Sign up for RendoBar Pro
2. Set `VIDEO_RENDER_API_URL=https://api.rendobar.com` and
   `VIDEO_RENDER_API_KEY=rb_...` in production secrets
3. Map LazyNext's EDL JSON to RendoBar's `compose` schema in
   `src/lib/providers/video-render.ts`
4. Set up webhook endpoint at `/api/webhooks/rendobar` to receive
   `job.completed` events and store output URLs in R2
5. Copy rendered outputs from RendoBar to R2 before 30-day retention expires

## Not Recommended

- **Cloudflare Stream** — cannot compose multi-clip EDLs; designed for
  streaming/delivery, not creative editing
- **Custom GPU worker** — highest operational burden; Fly.io GPUs deprecated
  (shut down July 31, 2026); only viable if you need bespoke ML models in
  the same pipeline
