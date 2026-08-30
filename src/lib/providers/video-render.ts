/**
 * Video Rendering Provider interface.
 *
 * Renders an Edit Decision List (EDL) into a final video file by offloading
 * to an external rendering service. FFmpeg cannot run inside a Cloudflare
 * Worker isolate (see ADR-043), so rendering must be delegated to an external
 * GPU/CPU service.
 *
 * Inspired by the SERVICE_BOUNDARY pattern from FireRed models (#65-84) and
 * the media-service-boundary architecture (ADR-023).
 *
 * Two implementations:
 *   1. dryRunRender — returns a placeholder video URL for testing
 *   2. externalRender — sends the EDL to an external rendering API and polls
 */

// ── Types ──

export interface EditDecisionListShot {
  shotIndex: number;
  shot: string;
  prompt: string;
  durationSec: number;
  mediaUrl: string | null;
  voiceover: string;
  onScreenText: string;
  transition: string;
}

export interface EditDecisionList {
  shots: EditDecisionListShot[];
  audioUrl: string | null;
  totalDurationSec: number;
  format: 'mp4' | 'webm' | 'mov';
  resolution: { width: number; height: number };
}

export interface RenderResult {
  videoUrl: string;
  durationSec: number;
  format: string;
  thumbnailUrl?: string;
  renderTimeMs: number;
  dryRun: boolean;
}

export interface VideoRenderProvider {
  readonly id: string;
  render(edl: EditDecisionList): Promise<RenderResult>;
}

// ── Dry-run implementation ──

export const dryRunRender: VideoRenderProvider = {
  id: 'dryrun',

  async render(edl: EditDecisionList): Promise<RenderResult> {
    return {
      videoUrl: 'data:video/mp4;base64,DRY_RUN_PLACEHOLDER',
      durationSec: edl.totalDurationSec,
      format: edl.format,
      renderTimeMs: 0,
      dryRun: true,
    };
  },
};

// ── External rendering implementation (RendoBar) ──
//
// RendoBar (https://rendobar.com) is the recommended rendering service.
// It accepts a declarative JSON timeline via the `compose` job type and
// delivers async completion via signed webhooks. See ADR-043 and
// research/video-rendering-services.md.
//
// Configuration:
//   VIDEO_RENDER_API_URL  — e.g. https://api.rendobar.com
//   VIDEO_RENDER_API_KEY  — rb_... (Pro required for GPU/concurrency)
//   VIDEO_RENDER_TIMEOUT_MS — polling timeout (default 120s)

/** Map LazyNext's EDL to RendoBar's compose timeline schema. */
function edlToRendoBarCompose(edl: EditDecisionList) {
  const tracks: any[] = [{
    clips: edl.shots.map((shot, i) => {
      const clip: any = {
        asset: { type: 'video', src: shot.mediaUrl || '' },
        start: edl.shots.slice(0, i).reduce((sum, s) => sum + s.durationSec, 0),
        length: shot.durationSec,
      };
      if (shot.onScreenText) {
        clip.text = { content: shot.onScreenText, position: 'bottom' };
      }
      if (i > 0 && shot.transition) {
        // RendoBar expects transitions as separate clip entries
        return { ...clip, transitionIn: shot.transition };
      }
      return clip;
    }),
  }];
  if (edl.audioUrl) {
    tracks.push({
      clips: [{ asset: { type: 'audio', src: edl.audioUrl }, start: 0, length: edl.totalDurationSec }],
    });
  }
  return {
    type: 'compose' as const,
    params: {
      schemaVersion: 1,
      output: {
        format: edl.format,
        resolution: { width: edl.resolution.width, height: edl.resolution.height },
        fps: 30,
      },
      timeline: { tracks },
    },
  };
}

export const externalRender: VideoRenderProvider = {
  id: 'rendobar',

  async render(edl: EditDecisionList): Promise<RenderResult> {
    const baseUrl = process.env.VIDEO_RENDER_API_URL;
    if (!baseUrl) throw new Error('VIDEO_RENDER_API_URL is not set');
    const apiKey = process.env.VIDEO_RENDER_API_KEY;
    const timeoutMs = Number(process.env.VIDEO_RENDER_TIMEOUT_MS || 120_000);
    const pollIntervalMs = Number(process.env.VIDEO_RENDER_POLL_MS || 3000);

    // Submit the render job using RendoBar's compose API
    const submitRes = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(edlToRendoBarCompose(edl)),
      signal: AbortSignal.timeout(30_000),
    });

    if (!submitRes.ok) {
      const err = await submitRes.text().catch(() => 'unknown');
      throw new Error(`render_submit_failed: HTTP ${submitRes.status}: ${err}`);
    }

    const job = await submitRes.json() as { id: string };
    const startTime = Date.now();

    // Poll for completion (webhook can be used as an alternative to polling)
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const pollRes = await fetch(`${baseUrl}/jobs/${job.id}`, {
        headers: {
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null);

      if (!pollRes || !pollRes.ok) continue;
      const status = await pollRes.json() as {
        status: 'queued' | 'started' | 'completed' | 'failed' | 'cancelled';
        output?: { url?: string; thumbnailUrl?: string; duration?: number };
        error?: string;
      };

      if (status.status === 'completed' && status.output?.url) {
        return {
          videoUrl: status.output.url,
          durationSec: status.output.duration || edl.totalDurationSec,
          format: edl.format,
          thumbnailUrl: status.output.thumbnailUrl,
          renderTimeMs: Date.now() - startTime,
          dryRun: false,
        };
      }
      if (status.status === 'failed') {
        throw new Error(`render_failed: ${status.error || 'unknown'}`);
      }
      if (status.status === 'cancelled') {
        throw new Error('render_cancelled');
      }
    }

    throw new Error('render_timeout');
  },
};

// ── Provider selection ──

export function getVideoRenderProvider(): VideoRenderProvider {
  return process.env.VIDEO_RENDER_API_URL ? externalRender : dryRunRender;
}
