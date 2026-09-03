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

/**
 * Export a rough cut plan as FCPXML 1.10 (Final Cut Pro XML).
 *
 * Generates a valid FCPXML document with project metadata, a single sequence
 * at 30fps, and one `<asset-clip>` per cut segment using timecode-based
 * start/end offsets. The source media is declared as an `<asset>` and each
 * clip references it via `ref`.
 */
export function exportCutPlanAsFCPXML(plan: RoughCutPlan, sourceName = 'SOURCE'): string {
  const fps = 30;
  const assetId = 'r1';
  const assetName = sourceName;
  const assetDuration = formatTimecode(plan.sourceDurationSec);

  const clipsXml = plan.cuts.map((cut, i) => {
    const srcStart = formatTimecode(cut.startSec);
    const srcEnd = formatTimecode(cut.endSec);
    const recStart = formatTimecode(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0),
    );
    const recEnd = formatTimecode(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0) + cut.durationSec,
    );
    const escapedLabel = escapeXml(cut.label);
    return [
      `      <asset-clip ref="${assetId}" offset="${recStart}" name="${escapedLabel}" start="${srcStart}" duration="${formatTimecode(cut.durationSec)}" tcFormat="NDF">`,
      `        <note>${escapeXml(cut.reason)}</note>`,
      `        <conform-rate src="${fps}/${fps}"/>`,
      `      </asset-clip>`,
    ].join('\n');
  }).join('\n');

  const sequenceDuration = formatTimecode(plan.totalDurationSec);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE fcpxml>',
    '<fcpxml version="1.10">',
    '  <resources>',
    `    <asset id="${assetId}" name="${escapeXml(assetName)}" start="0" duration="${assetDuration}" hasVideo="1" hasAudio="1" format="r2"/>`,
    `    <format id="r2" name="FFVideoFormat1080p${fps}" frameDuration="${fps}/${fps}s"/>`,
    '  </resources>',
    '  <library>',
    '    <event name="Lazynext Rough Cut">',
    `      <project name="Lazynext Rough Cut">`,
    `        <sequence format="r2" tcStart="0" tcFormat="NDF" duration="${sequenceDuration}">`,
    '          <spine>',
    clipsXml,
    '          </spine>',
    '        </sequence>',
    '      </project>',
    '    </event>',
    '  </library>',
    '</fcpxml>',
  ].join('\n');
}

/**
 * Export a rough cut plan as a simplified Premiere Pro XML project file.
 *
 * Uses the Final Cut Pro XML interchange format (`<xmeml>`) that Premiere Pro
 * can import. Includes a project root, a single sequence, and one clipitem per
 * cut segment with in/out points expressed as timecode.
 */
export function exportCutPlanAsPremiereXML(plan: RoughCutPlan, sourceName = 'SOURCE'): string {
  const fps = 30;
  const sequenceId = 'seq-1';
  const videoTrackId = 'v1';
  const fileUrl = `file://localhost/${escapeXml(sourceName)}.mp4`;

  const clipItemsXml = plan.cuts.map((cut, i) => {
    const clipId = `clip-${i + 1}`;
    const inPoint = formatTimecode(cut.startSec);
    const outPoint = formatTimecode(cut.endSec);
    const recStart = formatTimecode(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0),
    );
    const recEnd = formatTimecode(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0) + cut.durationSec,
    );
    return [
      `        <clipitem id="${clipId}">`,
      `          <name>${escapeXml(cut.label)}</name>`,
      `          <enabled>TRUE</enabled>`,
      `          <duration>${formatTimecode(cut.durationSec)}</duration>`,
      `          <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>`,
      `          <start>${recStart}</start>`,
      `          <end>${recEnd}</end>`,
      `          <in>${inPoint}</in>`,
      `          <out>${outPoint}</out>`,
      '          <file id="file-1">',
      `            <name>${escapeXml(sourceName)}.mp4</name>`,
      `            <pathurl>${fileUrl}</pathurl>`,
      `            <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>`,
      `            <duration>${formatTimecode(plan.sourceDurationSec)}</duration>`,
      '          </file>',
      '        </clipitem>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE xmeml>',
    '<xmeml version="5">',
    '  <sequence id="' + sequenceId + '">',
    `    <name>Lazynext Rough Cut</name>`,
    `    <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>`,
    `    <media>`,
    '      <video>',
    `        <track id="${videoTrackId}">`,
    clipItemsXml,
    '        </track>',
    '      </video>',
    '    </media>',
    '  </sequence>',
    '</xmeml>',
  ].join('\n');
}

/**
 * Export a rough cut plan as a simplified DaVinci Resolve timeline XML.
 *
 * Includes a timeline, a single video track, and one clip per cut segment with
 * start/end expressed as frame counts (at 30fps).
 */
export function exportCutPlanAsDaVinciXML(plan: RoughCutPlan, sourceName = 'SOURCE'): string {
  const fps = 30;
  const frames = (sec: number) => Math.round(sec * fps);

  const clipsXml = plan.cuts.map((cut, i) => {
    const clipId = `clip-${i + 1}`;
    const startFrame = frames(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0),
    );
    const endFrame = frames(
      plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0) + cut.durationSec,
    );
    const srcStartFrame = frames(cut.startSec);
    const srcEndFrame = frames(cut.endSec);
    return [
      `      <clip id="${clipId}" type="video">`,
      `        <name>${escapeXml(cut.label)}</name>`,
      `        <startFrame>${startFrame}</startFrame>`,
      `        <endFrame>${endFrame}</endFrame>`,
      `        <sourceStartFrame>${srcStartFrame}</sourceStartFrame>`,
      `        <sourceEndFrame>${srcEndFrame}</sourceEndFrame>`,
      `        <source>${escapeXml(sourceName)}</source>`,
      `        <note>${escapeXml(cut.reason)}</note>`,
      '      </clip>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<timeline version="1">',
    `  <name>Lazynext Rough Cut</name>`,
    `  <fps>${fps}</fps>`,
    `  <durationFrames>${frames(plan.totalDurationSec)}</durationFrames>`,
    '  <tracks>',
    '    <track id="v1" type="video">',
    clipsXml,
    '    </track>',
    '  </tracks>',
    '</timeline>',
  ].join('\n');
}

/**
 * Export a rough cut plan as an SRT subtitle file.
 *
 * Each cut segment becomes one subtitle entry with a sequential index, a
 * timecode range in `HH:MM:SS,mmm --> HH:MM:SS,mmm` format, and the cut's
 * text as the subtitle content.
 */
export function exportCutPlanAsSRT(plan: RoughCutPlan): string {
  const formatSrtTime = (sec: number): string => {
    const ms = Math.round(sec * 1000);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const millis = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  };

  const entries: string[] = [];
  plan.cuts.forEach((cut, i) => {
    const recStart = plan.cuts.slice(0, i).reduce((sum, c) => sum + c.durationSec, 0);
    const recEnd = recStart + cut.durationSec;
    entries.push(
      String(i + 1),
      `${formatSrtTime(recStart)} --> ${formatSrtTime(recEnd)}`,
      cut.text,
      '',
    );
  });

  return entries.join('\n').trimEnd() + '\n';
}

/** Escape special XML characters in a string. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

// ── Editing skill application ──

/** An edit decision derived from applying a skill step to a cut segment. */
export interface EditDecision {
  /** Index of the cut segment this applies to. */
  cutIndex: number;
  /** The skill step that generated this decision. */
  stepOrder: number;
  /** The action type. */
  action: string;
  /** When to apply. */
  trigger: string;
  /** Human-readable description. */
  description: string;
  /** Parameters for the action. */
  params: Record<string, unknown>;
}

/** A rough cut plan enhanced with edit decisions from applied skills. */
export interface SkillEnhancedPlan extends RoughCutPlan {
  /** Edit decisions generated from applying editing skills. */
  editDecisions: EditDecision[];
  /** Names of skills that were applied. */
  appliedSkills: string[];
}

/**
 * Apply an editing skill's steps to a rough cut plan, generating edit decisions.
 *
 * Each step's trigger is matched against cut segments to determine where it applies:
 * - "on every pause" / "throughout" → all cuts
 * - "at hook" → first cut
 * - "at CTA" / "at end" → last cut
 * - "on B-roll" / "on product" → cuts mentioning product/demo keywords
 * - "between features" / "between segments" → transitions
 * - default → all cuts
 */
export function applySkillToPlan(plan: RoughCutPlan, skill: {
  name: string;
  steps: Array<{ order: number; action: string; trigger: string; description: string; params?: Record<string, unknown> }>;
}): EditDecision[] {
  const decisions: EditDecision[] = [];
  const triggerLower = (t: string) => t.toLowerCase();

  for (const step of skill.steps) {
    const trig = triggerLower(step.trigger);
    const params = step.params || {};

    if (trig.includes('between') || trig.includes('transition')) {
      // Apply to transitions between cuts
      for (let i = 0; i < plan.cuts.length - 1; i++) {
        decisions.push({
          cutIndex: i,
          stepOrder: step.order,
          action: step.action,
          trigger: step.trigger,
          description: step.description,
          params,
        });
      }
    } else if (trig.includes('hook') || trig.includes('first') || trig.includes('start')) {
      // Apply to first cut only
      if (plan.cuts.length > 0) {
        decisions.push({
          cutIndex: 0,
          stepOrder: step.order,
          action: step.action,
          trigger: step.trigger,
          description: step.description,
          params,
        });
      }
    } else if (trig.includes('cta') || trig.includes('end') || trig.includes('last') || trig.includes('closing')) {
      // Apply to last cut only
      if (plan.cuts.length > 0) {
        decisions.push({
          cutIndex: plan.cuts.length - 1,
          stepOrder: step.order,
          action: step.action,
          trigger: step.trigger,
          description: step.description,
          params,
        });
      }
    } else if (trig.includes('product') || trig.includes('demo') || trig.includes('b-roll') || trig.includes('feature')) {
      // Apply to cuts that mention product/demo keywords
      const keywords = ['product', 'feature', 'demo', 'show', 'look', 'see', 'here'];
      plan.cuts.forEach((cut, i) => {
        if (keywords.some(k => cut.text.toLowerCase().includes(k))) {
          decisions.push({
            cutIndex: i,
            stepOrder: step.order,
            action: step.action,
            trigger: step.trigger,
            description: step.description,
            params,
          });
        }
      });
    } else {
      // Default: apply to all cuts (throughout, every pause, etc.)
      plan.cuts.forEach((_, i) => {
        decisions.push({
          cutIndex: i,
          stepOrder: step.order,
          action: step.action,
          trigger: step.trigger,
          description: step.description,
          params,
        });
      });
    }
  }

  return decisions;
}

/**
 * Apply multiple editing skills to a rough cut plan and return an enhanced plan.
 */
export function applySkillsToPlan(
  plan: RoughCutPlan,
  skills: Array<{
    name: string;
    steps: Array<{ order: number; action: string; trigger: string; description: string; params?: Record<string, unknown> }>;
  }>,
): SkillEnhancedPlan {
  const allDecisions: EditDecision[] = [];
  const appliedNames: string[] = [];

  for (const skill of skills) {
    const decisions = applySkillToPlan(plan, skill);
    if (decisions.length > 0) {
      allDecisions.push(...decisions);
      appliedNames.push(skill.name);
    }
  }

  return {
    ...plan,
    editDecisions: allDecisions,
    appliedSkills: appliedNames,
  };
}
