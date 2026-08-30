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

// ── External rendering implementation ──

export const externalRender: VideoRenderProvider = {
  id: 'external',

  async render(edl: EditDecisionList): Promise<RenderResult> {
    const baseUrl = process.env.VIDEO_RENDER_API_URL;
    if (!baseUrl) throw new Error('VIDEO_RENDER_API_URL is not set');
    const apiKey = process.env.VIDEO_RENDER_API_KEY;
    const timeoutMs = Number(process.env.VIDEO_RENDER_TIMEOUT_MS || 120_000);

    // Submit the render job
    const submitRes = await fetch(`${baseUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(edl),
      signal: AbortSignal.timeout(30_000),
    });

    if (!submitRes.ok) {
      const err = await submitRes.text().catch(() => 'unknown');
      throw new Error(`render_submit_failed: HTTP ${submitRes.status}: ${err}`);
    }

    const job = await submitRes.json() as { jobId: string };
    const startTime = Date.now();

    // Poll for completion
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(`${baseUrl}/render/${job.jobId}`, {
        headers: ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null);

      if (!pollRes || !pollRes.ok) continue;
      const status = await pollRes.json() as {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        videoUrl?: string;
        thumbnailUrl?: string;
        durationSec?: number;
        error?: string;
      };

      if (status.status === 'completed' && status.videoUrl) {
        return {
          videoUrl: status.videoUrl,
          durationSec: status.durationSec || edl.totalDurationSec,
          format: edl.format,
          thumbnailUrl: status.thumbnailUrl,
          renderTimeMs: Date.now() - startTime,
          dryRun: false,
        };
      }
      if (status.status === 'failed') {
        throw new Error(`render_failed: ${status.error || 'unknown'}`);
      }
    }

    throw new Error('render_timeout');
  },
};

// ── Provider selection ──

export function getVideoRenderProvider(): VideoRenderProvider {
  return process.env.VIDEO_RENDER_API_URL ? externalRender : dryRunRender;
}
