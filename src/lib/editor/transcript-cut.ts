/**
 * Transcript-driven editing — uses ASR transcript to generate a rough cut plan.
 *
 * Inspired by FireRed-OpenStoryline (#64): ASR-based rough cut for speech videos.
 * Given a transcript with timestamps, suggests scene boundaries, cut points,
 * and clip selection for a rough edit.
 *
 * This is a PLANNING layer — it produces a cut plan, not actual video edits.
 * The plan can be consumed by a future native editor or exported as EDL/JSON.
 */
import type { ASRResult } from '@/lib/providers/types';

/** A segment of the transcript selected for inclusion in the rough cut. */
export interface CutSegment {
  /** Start time in seconds. */
  startSec: number;
  /** End time in seconds. */
  endSec: number;
  /** Duration in seconds. */
  durationSec: number;
  /** The transcript text for this segment. */
  text: string;
  /** Why this segment was selected. */
  reason: string;
  /** Suggested label for the clip. */
  label: string;
}

/** A rough cut plan derived from a transcript. */
export interface RoughCutPlan {
  /** Source transcript segments. */
  sourceSegments: Array<{ start: number; end: number; text: string }>;
  /** Selected segments for the rough cut. */
  cuts: CutSegment[];
  /** Total duration of the rough cut (seconds). */
  totalDurationSec: number;
  /** Total duration of the source (seconds). */
  sourceDurationSec: number;
  /** Compression ratio (source / cut). */
  compressionRatio: number;
  /** Suggested transitions between cuts. */
  transitions: Array<{ fromIndex: number; toIndex: number; type: 'cut' | 'fade' | 'dissolve' }>;
  /** Notes on the cut decisions. */
  notes: string[];
}

/** Options for generating a rough cut. */
export interface RoughCutOptions {
  /** Target duration in seconds (optional — if not set, keeps all meaningful content). */
  targetDurationSec?: number;
  /** Minimum segment duration to include (default: 1.5s). */
  minSegmentSec?: number;
  /** Remove silence/pauses longer than this (default: 2s). */
  maxPauseSec?: number;
  /** Remove filler words from segment text. */
  removeFillers?: boolean;
}

/** Common filler words/patterns to detect. */
const FILLER_PATTERNS = [
  /\b(uh|um|er|ah|like|you know|I mean|sort of|kind of)\b/gi,
  /\b(so|well|right|okay|anyway)\b/gi,
];

/**
 * Generate a rough cut plan from an ASR transcript.
 *
 * Algorithm:
 * 1. Filter out segments shorter than minSegmentSec
 * 2. Remove filler-heavy segments (low information density)
 * 3. If targetDurationSec is set, rank segments by information density and select top
 * 4. Generate transitions between consecutive cuts
 * 5. Calculate compression ratio
 */
export function generateRoughCut(transcript: ASRResult, opts: RoughCutOptions = {}): RoughCutPlan {
  const minSec = opts.minSegmentSec ?? 1.5;
  const maxPause = opts.maxPauseSec ?? 2.0;
  const removeFillers = opts.removeFillers ?? true;
  const sourceDuration = transcript.duration ?? 
    (transcript.segments?.at(-1)?.end ?? 0);

  const sourceSegments = transcript.segments ?? [];
  if (sourceSegments.length === 0) {
    return {
      sourceSegments: [],
      cuts: [],
      totalDurationSec: 0,
      sourceDurationSec: sourceDuration,
      compressionRatio: 0,
      transitions: [],
      notes: ['No transcript segments available'],
    };
  }

  const notes: string[] = [];

  // Step 1: Filter short segments
  const longEnough = sourceSegments.filter(s => (s.end - s.start) >= minSec);
  const removed = sourceSegments.length - longEnough.length;
  if (removed > 0) notes.push(`Removed ${removed} segments shorter than ${minSec}s`);

  // Step 2: Score segments by information density
  const scored = longEnough.map(seg => {
    const duration = seg.end - seg.start;
    const wordCount = seg.text.trim().split(/\s+/).length;
    const wordsPerSec = wordCount / duration;
    const fillerCount = removeFillers 
      ? (seg.text.match(FILLER_PATTERNS[0]) || []).length
      : 0;
    const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
    const density = wordsPerSec * (1 - fillerRatio);
    return { seg, duration, density, fillerRatio, wordCount };
  });

  // Step 3: Remove high-filler segments (> 40% filler words)
  const meaningful = scored.filter(s => s.fillerRatio < 0.4);
  const fillerRemoved = scored.length - meaningful.length;
  if (fillerRemoved > 0) notes.push(`Removed ${fillerRemoved} high-filler segments`);

  // Step 4: Detect and mark long pauses
  const pauseGaps: Array<{ after: number; duration: number }> = [];
  for (let i = 1; i < meaningful.length; i++) {
    const gap = meaningful[i].seg.start - meaningful[i - 1].seg.end;
    if (gap > maxPause) {
      pauseGaps.push({ after: i - 1, duration: gap });
    }
  }
  if (pauseGaps.length > 0) {
    notes.push(`Detected ${pauseGaps.length} pauses longer than ${maxPause}s (cut points)`);
  }

  // Step 5: Select segments for target duration
  let selected = meaningful;
  if (opts.targetDurationSec) {
    // Sort by density descending, select top segments until target is reached
    const sorted = [...meaningful].sort((a, b) => b.density - a.density);
    let accumulated = 0;
    const chosen = new Set<number>();
    for (const s of sorted) {
      if (accumulated >= opts.targetDurationSec) break;
      chosen.add(meaningful.indexOf(s));
      accumulated += s.duration;
    }
    // Re-sort by original order
    selected = meaningful.filter((_, i) => chosen.has(i));
    notes.push(`Selected ${selected.length} segments to fit ${opts.targetDurationSec}s target`);
  }

  // Step 6: Build cut segments
  const cuts: CutSegment[] = selected.map((s, idx) => {
    const text = removeFillers
      ? s.seg.text.replace(FILLER_PATTERNS[0], '').replace(FILLER_PATTERNS[1], '').trim()
      : s.seg.text.trim();
    return {
      startSec: s.seg.start,
      endSec: s.seg.end,
      durationSec: s.duration,
      text,
      reason: s.fillerRatio > 0.2 
        ? `Medium filler ratio (${(s.fillerRatio * 100).toFixed(0)}%) but kept for content`
        : `High information density (${s.density.toFixed(1)} words/sec)`,
      label: `Clip ${idx + 1}: ${text.slice(0, 40)}${text.length > 40 ? '...' : ''}`,
    };
  });

  // Step 7: Generate transitions
  const transitions = cuts.slice(1).map((_, i) => {
    const gap = cuts[i + 1].startSec - cuts[i].endSec;
    // If there's a large gap (removed content), use a dissolve
    // If consecutive, use a hard cut
    return {
      fromIndex: i,
      toIndex: i + 1,
      type: gap > maxPause ? 'dissolve' as const : 'cut' as const,
    };
  });

  const totalDuration = cuts.reduce((sum, c) => sum + c.durationSec, 0);
  const compressionRatio = totalDuration > 0 ? sourceDuration / totalDuration : 0;

  return {
    sourceSegments,
    cuts,
    totalDurationSec: totalDuration,
    sourceDurationSec: sourceDuration,
    compressionRatio,
    transitions,
    notes,
  };
}

/**
 * Export a rough cut plan as JSON (for use by a future native editor).
 */
export function exportCutPlanAsJSON(plan: RoughCutPlan): string {
  return JSON.stringify(plan, null, 2);
}

/**
 * Export a rough cut plan as EDL (Edit Decision List) format.
 * This is a simplified CMX 3600 EDL for import into professional editors.
 */
export function exportCutPlanAsEDL(plan: RoughCutPlan, sourceName = 'SOURCE'): string {
  const lines: string[] = ['TITLE: LAZYNEXT_ROUGH_CUT', ''];
  plan.cuts.forEach((cut, i) => {
    const event = String(i + 1).padStart(3, '0');
    const srcStart = formatTimecode(cut.startSec);
    const srcEnd = formatTimecode(cut.endSec);
    const recStart = formatTimecode(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0)
    );
    const recEnd = formatTimecode(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0) + cut.durationSec
    );
    lines.push(`${event}  AX       V     C        ${srcStart} ${srcEnd} ${recStart} ${recEnd}`);
    lines.push(`* FROM CLIP NAME: ${sourceName}`);
    lines.push(`* COMMENT: ${cut.label}`);
    lines.push('');
  });
  return lines.join('\n');
}

/** Format seconds as SMPTE timecode (HH:MM:SS:FF at 30fps). */
function formatTimecode(sec: number): string {
  const fps = 30;
  const totalFrames = Math.round(sec * fps);
  const h = Math.floor(totalFrames / (fps * 3600));
  const m = Math.floor((totalFrames % (fps * 3600)) / (fps * 60));
  const s = Math.floor((totalFrames % (fps * 60)) / fps);
  const f = totalFrames % fps;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}
