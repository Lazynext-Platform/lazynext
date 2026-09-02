/**
 * Conversational editor — natural-language → timeline operations.
 *
 * `parseEditCommand` maps free-text editing commands (e.g. "trim first 5
 * seconds", "speed up 2x", "mute audio track") into a structured
 * `ParsedEditCommand`. `applyCommand` then maps a parsed command onto the
 * existing `timeline-builder.ts` helpers (addClip, addTrack, addTransition,
 * addMarker, validateTimeline, …) producing a new immutable Timeline.
 *
 * The parser is intentionally regex-based and dependency-free so it can run
 * in tests, server routes, and (if needed) the browser. When a command is
 * ambiguous (low confidence), the API route falls back to `atlasChat` for
 * LLM-based interpretation.
 */

import {
  addTrack,
  addTransition,
  addMarker,
  generateId,
} from './timeline-builder';
import type {
  Timeline,
  Track,
  Clip,
  TransitionType,
  TrackType,
  TextOverlay,
} from './types';

// ── Types ──

/** The set of editing operations the conversational parser understands. */
export type EditCommandType =
  | 'trim'
  | 'speed'
  | 'volume'
  | 'transition'
  | 'marker'
  | 'caption'
  | 'delete'
  | 'split'
  | 'unknown';

/** Where a trim operation should be applied. */
export type TrimMode = 'first' | 'last' | 'to';

/** A structured natural-language edit command. */
export interface ParsedEditCommand {
  type: EditCommandType;
  params: Record<string, unknown>;
  /** 0–1 confidence in the parse. High (≥0.8) skips AI in the API route. */
  confidence: number;
  originalText: string;
}

// ── Helpers ──

/** Parse a number (int or decimal) from a regex capture group. */
function num(group: string | undefined): number | undefined {
  if (group === undefined) return undefined;
  const n = Number(group);
  return Number.isFinite(n) ? n : undefined;
}

/** Extract a quoted or trailing-until-keyword text payload. */
function extractText(input: string, after: string): string | undefined {
  // "add caption 'hello world' at 10s" / add caption "hello world" at 10s
  const quoted = new RegExp(`${after}\\s*['"]([^'"]+)['"]`, 'i');
  const qm = input.match(quoted);
  if (qm) return qm[1].trim();
  // "add caption hello world at 10s" — grab everything until " at "
  const bare = new RegExp(`${after}\\s+(.+?)\\s+at\\s+`, 'i');
  const bm = input.match(bare);
  if (bm) return bm[1].trim();
  // "add text overlay hello world" — grab trailing text
  const tail = new RegExp(`${after}\\s+(.+)$`, 'i');
  const tm = input.match(tail);
  if (tm) return tm[1].trim();
  return undefined;
}

// ── Per-command parsers ──

interface CommandPattern {
  type: EditCommandType;
  /** Returns params + confidence, or null if the pattern doesn't match. */
  match: (input: string) => { params: Record<string, unknown>; confidence: number } | null;
}

const PATTERNS: CommandPattern[] = [
  // ── trim ──
  // "trim first 5 seconds" / "trim first 5s"
  {
    type: 'trim',
    match: (input) => {
      const m = input.match(/trim\s+(?:the\s+)?first\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
      if (m) return { params: { mode: 'first', seconds: num(m[1]) }, confidence: 0.95 };
      return null;
    },
  },
  // "trim last 5 seconds"
  {
    type: 'trim',
    match: (input) => {
      const m = input.match(/trim\s+(?:the\s+)?last\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
      if (m) return { params: { mode: 'last', seconds: num(m[1]) }, confidence: 0.95 };
      return null;
    },
  },
  // "trim to 10 seconds"
  {
    type: 'trim',
    match: (input) => {
      const m = input.match(/trim\s+(?:to|down to)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
      if (m) return { params: { mode: 'to', seconds: num(m[1]) }, confidence: 0.9 };
      return null;
    },
  },

  // ── speed ──
  // "speed up 2x" / "speed up to 2x"
  {
    type: 'speed',
    match: (input) => {
      const m = input.match(/speed\s+up(?:\s+to)?\s+(\d+(?:\.\d+)?)x?/i);
      if (m) return { params: { factor: num(m[1]) }, confidence: 0.95 };
      return null;
    },
  },
  // "slow down 2x" / "slow down to 0.5x"
  {
    type: 'speed',
    match: (input) => {
      const m = input.match(/slow\s+down(?:\s+to)?\s+(\d+(?:\.\d+)?)x?/i);
      if (m) {
        const factor = num(m[1]) ?? 1;
        // "slow down 2x" means play at half speed; "slow down to 0.5x" means 0.5x.
        const value = m[1].startsWith('0.') ? factor : 1 / factor;
        return { params: { factor: value }, confidence: 0.9 };
      }
      return null;
    },
  },
  // "set speed to 2x"
  {
    type: 'speed',
    match: (input) => {
      const m = input.match(/set\s+speed\s+to\s+(\d+(?:\.\d+)?)x?/i);
      if (m) return { params: { factor: num(m[1]) }, confidence: 0.95 };
      return null;
    },
  },

  // ── volume ──
  // "mute" / "mute audio" / "mute audio track" / "mute track 2"
  {
    type: 'volume',
    match: (input) => {
      const m = input.match(/^mute(?:\s+(?:audio|the\s+audio|the\s+))?(\s+track\s+(\d+))?/i);
      if (m) return { params: { mute: true, trackIndex: m[2] ? Number(m[2]) - 1 : undefined }, confidence: 0.9 };
      return null;
    },
  },
  // "set volume to 50%"
  {
    type: 'volume',
    match: (input) => {
      const m = input.match(/set\s+volume\s+to\s+(\d+(?:\.\d+)?)\s*%?/i);
      if (m) return { params: { volume: (num(m[1]) ?? 100) / 100 }, confidence: 0.95 };
      return null;
    },
  },
  // "increase volume" / "boost volume" / "raise volume"
  {
    type: 'volume',
    match: (input) => {
      const m = input.match(/(?:increase|boost|raise|turn\s+up)\s+volume/i);
      if (m) return { params: { delta: 0.2 }, confidence: 0.8 };
      return null;
    },
  },
  // "decrease volume" / "lower volume"
  {
    type: 'volume',
    match: (input) => {
      const m = input.match(/(?:decrease|lower|reduce|turn\s+down)\s+volume/i);
      if (m) return { params: { delta: -0.2 }, confidence: 0.8 };
      return null;
    },
  },

  // ── transition ──
  // "add fade" / "add fade transition" / "add fade at 10s"
  {
    type: 'transition',
    match: (input) => {
      const m = input.match(/add\s+(fade|dissolve|cut|wipe|slide)(?:\s+transition)?(?:\s+at\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?)?/i);
      if (m) {
        const type = m[1].toLowerCase() as TransitionType;
        return { params: { transitionType: type, at: num(m[2]) }, confidence: 0.9 };
      }
      return null;
    },
  },

  // ── marker ──
  // "add marker labeled intro at 10s" / "add marker at 10s"
  {
    type: 'marker',
    match: (input) => {
      const labeled = input.match(/add\s+marker\s+labeled\s+['"]?([^'"]+?)['"]?\s+at\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
      if (labeled) return { params: { label: labeled[1].trim(), at: num(labeled[2]) }, confidence: 0.95 };
      const m = input.match(/add\s+marker(?:\s+at\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?)?/i);
      if (m) return { params: { label: 'Marker', at: num(m[1]) }, confidence: 0.9 };
      return null;
    },
  },

  // ── caption / text overlay ──
  // "add caption 'hello' at 10s" / "add text overlay hello"
  {
    type: 'caption',
    match: (input) => {
      const cap = input.match(/add\s+caption/i);
      if (cap) {
        const text = extractText(input, 'add\\s+caption');
        const atM = input.match(/at\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
        return { params: { text: text ?? '', at: atM ? num(atM[1]) : 0 }, confidence: text ? 0.9 : 0.6 };
      }
      const overlay = input.match(/add\s+(?:text\s+overlay|overlay)\s+(?:text\s+)?/i);
      if (overlay) {
        const text = extractText(input, 'add\\s+(?:text\\s+overlay|overlay)\\s+(?:text\\s+)?');
        const atM = input.match(/at\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
        return { params: { text: text ?? '', at: atM ? num(atM[1]) : 0 }, confidence: text ? 0.85 : 0.55 };
      }
      return null;
    },
  },

  // ── delete ──
  // "delete clip at 10s"
  {
    type: 'delete',
    match: (input) => {
      const m = input.match(/delete\s+clip\s+at\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
      if (m) return { params: { target: 'clip', at: num(m[1]) }, confidence: 0.95 };
      return null;
    },
  },
  // "delete track 2" / "delete track audio"
  {
    type: 'delete',
    match: (input) => {
      const m = input.match(/delete\s+track\s+(\d+|video|audio|text|overlay)/i);
      if (m) {
        const v = m[1].toLowerCase();
        if (/^\d+$/.test(v)) return { params: { target: 'track', trackIndex: Number(v) - 1 }, confidence: 0.9 };
        return { params: { target: 'track', trackType: v as TrackType }, confidence: 0.85 };
      }
      return null;
    },
  },

  // ── split ──
  // "split at 10s"
  {
    type: 'split',
    match: (input) => {
      const m = input.match(/split\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)?/i);
      if (m) return { params: { at: num(m[1]) }, confidence: 0.95 };
      return null;
    },
  },
];

// ── Public parse API ──

/**
 * Parse a natural-language editing command into a structured command.
 * Always returns a `ParsedEditCommand` — unknown input yields
 * `{ type: 'unknown', confidence: 0 }` so callers can decide whether to
 * fall back to AI interpretation.
 */
export function parseEditCommand(input: string): ParsedEditCommand {
  const originalText = input;
  const trimmed = input.trim();

  if (!trimmed) {
    return { type: 'unknown', params: {}, confidence: 0, originalText };
  }

  for (const pattern of PATTERNS) {
    const result = pattern.match(trimmed);
    if (result) {
      return {
        type: pattern.type,
        params: result.params,
        confidence: result.confidence,
        originalText,
      };
    }
  }

  return { type: 'unknown', params: {}, confidence: 0, originalText };
}

// ── applyCommand ──

/** Find the first track of a given type, creating it if missing. */
function ensureTrack(timeline: Timeline, type: TrackType): { timeline: Timeline; track: Track } {
  const existing = timeline.tracks.find((t) => t.type === type && !t.locked);
  if (existing) return { timeline, track: existing };
  const next = addTrack(timeline, type);
  const track = next.tracks[next.tracks.length - 1];
  return { timeline: next, track };
}

/** Find the clip that spans a given time on any video/audio track. */
function findClipAt(timeline: Timeline, atSec: number): { track: Track; clip: Clip } | null {
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      if (atSec >= clip.startSec && atSec <= clip.endSec) {
        return { track, clip };
      }
    }
  }
  return null;
}

/** Find the clip nearest to (but starting before) a given time on a track. */
function findClipBefore(timeline: Timeline, atSec: number, trackId?: string): { track: Track; clip: Clip } | null {
  let best: { track: Track; clip: Clip } | null = null;
  for (const track of timeline.tracks) {
    if (trackId && track.id !== trackId) continue;
    for (const clip of track.clips) {
      if (clip.startSec <= atSec && (!best || clip.startSec > best.clip.startSec)) {
        best = { track, clip };
      }
    }
  }
  return best;
}

/** Clamp a value into [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Apply a parsed command to a timeline, returning a new timeline object.
 * Throws when a command references something that doesn't exist (e.g.
 * deleting a track index out of range) so callers can surface the error.
 */
export function applyCommand(timeline: Timeline, command: ParsedEditCommand): Timeline {
  switch (command.type) {
    // ── trim ──
    case 'trim': {
      const mode = command.params.mode as TrimMode | undefined;
      const seconds = command.params.seconds as number | undefined;
      if (seconds === undefined || !mode) {
        throw new Error('trim requires a mode and seconds value');
      }
      return trimTimeline(timeline, mode, seconds);
    }

    // ── speed ──
    case 'speed': {
      const factor = command.params.factor as number | undefined;
      if (factor === undefined || factor <= 0) {
        throw new Error('speed requires a positive factor');
      }
      return applySpeed(timeline, factor);
    }

    // ── volume ──
    case 'volume': {
      return applyVolume(timeline, command.params);
    }

    // ── transition ──
    case 'transition': {
      const transitionType = (command.params.transitionType as TransitionType) ?? 'fade';
      const at = command.params.at as number | undefined;
      return applyTransition(timeline, transitionType, at);
    }

    // ── marker ──
    case 'marker': {
      const at = (command.params.at as number) ?? 0;
      const label = (command.params.label as string) ?? 'Marker';
      return addMarker(timeline, { timeSec: at, label, color: '#facc15' });
    }

    // ── caption / text overlay ──
    case 'caption': {
      const text = (command.params.text as string) ?? '';
      const at = (command.params.at as number) ?? 0;
      if (!text) throw new Error('caption requires text');
      return applyCaption(timeline, text, at);
    }

    // ── delete ──
    case 'delete': {
      return applyDelete(timeline, command.params);
    }

    // ── split ──
    case 'split': {
      const at = command.params.at as number | undefined;
      if (at === undefined) throw new Error('split requires a time position');
      return applySplit(timeline, at);
    }

    case 'unknown':
    default:
      throw new Error(`Cannot apply unknown command: "${command.originalText}"`);
  }
}

// ── Operation implementations ──

/** Trim the first/last N seconds, or trim the whole timeline to N seconds. */
function trimTimeline(timeline: Timeline, mode: TrimMode, seconds: number): Timeline {
  const tracks = timeline.tracks.map((track) => {
    if (mode === 'first') {
      // Drop the first `seconds` from every clip's start.
      const clips: Clip[] = [];
      for (const clip of track.clips) {
        const newStart = clip.startSec - seconds;
        if (newStart >= clip.endSec) continue; // clip fully removed
        clips.push({
          ...clip,
          startSec: Math.max(0, newStart),
          trimStartSec: clip.trimStartSec + Math.max(0, seconds - clip.startSec),
        });
      }
      return { ...track, clips };
    }
    if (mode === 'last') {
      // Remove the last `seconds` from every clip's end.
      const cutPoint = timeline.durationSec - seconds;
      const clips: Clip[] = [];
      for (const clip of track.clips) {
        if (clip.endSec <= cutPoint) {
          clips.push(clip);
          continue;
        }
        if (clip.startSec >= cutPoint) continue; // clip fully within trimmed tail
        clips.push({ ...clip, endSec: cutPoint, trimEndSec: clip.trimEndSec - (clip.endSec - cutPoint) });
      }
      return { ...track, clips };
    }
    // mode === 'to' — keep only content up to `seconds`.
    const clips = track.clips
      .filter((clip) => clip.startSec < seconds)
      .map((clip) => ({
        ...clip,
        endSec: Math.min(clip.endSec, seconds),
        trimEndSec: clip.trimEndSec - Math.max(0, clip.endSec - seconds),
      }));
    return { ...track, clips };
  });

  const durationSec =
    mode === 'to' ? seconds : mode === 'last' ? Math.max(0, timeline.durationSec - seconds) : timeline.durationSec;

  return {
    ...timeline,
    tracks,
    durationSec,
    updatedAt: new Date().toISOString(),
  };
}

/** Apply a speed factor to all clips (shortens their on-timeline duration). */
function applySpeed(timeline: Timeline, factor: number): Timeline {
  const tracks = timeline.tracks.map((track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      const durationSec = (clip.endSec - clip.startSec) / factor;
      return {
        ...clip,
        endSec: clip.startSec + durationSec,
        durationSec,
        speed: factor,
      };
    }),
  }));

  // Recompute total duration from the latest clip end.
  let maxEnd = 0;
  for (const tr of tracks) for (const cl of tr.clips) if (cl.endSec > maxEnd) maxEnd = cl.endSec;

  return { ...timeline, tracks, durationSec: maxEnd, updatedAt: new Date().toISOString() };
}

/** Apply volume changes (mute / set / delta) to audio/video tracks. */
function applyVolume(timeline: Timeline, params: Record<string, unknown>): Timeline {
  const tracks = timeline.tracks.map((track, idx) => {
    const trackIndex = params.trackIndex as number | undefined;
    if (trackIndex !== undefined && idx !== trackIndex) return track;
    if (track.type !== 'audio' && track.type !== 'video') {
      if (params.trackIndex === undefined) return track;
    }

    if (params.mute === true) {
      return { ...track, muted: true, clips: track.clips.map((c) => ({ ...c, volume: 0 })) };
    }
    if (typeof params.volume === 'number') {
      const v = clamp(params.volume, 0, 1);
      return { ...track, clips: track.clips.map((c) => ({ ...c, volume: v })) };
    }
    if (typeof params.delta === 'number') {
      return {
        ...track,
        clips: track.clips.map((c) => ({ ...c, volume: clamp(c.volume + (params.delta as number), 0, 1) })),
      };
    }
    return track;
  });

  return { ...timeline, tracks, updatedAt: new Date().toISOString() };
}

/** Add a transition between the two clips nearest a given time (or the last two). */
function applyTransition(timeline: Timeline, type: TransitionType, at?: number): Timeline {
  // Find two adjacent clips to bridge.
  let from: Clip | undefined;
  let to: Clip | undefined;

  if (at !== undefined) {
    const before = findClipBefore(timeline, at);
    const after = timeline.tracks
      .flatMap((t) => t.clips)
      .filter((c) => c.startSec >= at)
      .sort((a, b) => a.startSec - b.startSec)[0];
    if (before) from = before.clip;
    if (after) to = after;
  }

  // Fallback: last two clips on the first track that has ≥2 clips.
  if (!from || !to) {
    for (const track of timeline.tracks) {
      if (track.clips.length >= 2) {
        const sorted = [...track.clips].sort((a, b) => a.startSec - b.startSec);
        from = sorted[sorted.length - 2];
        to = sorted[sorted.length - 1];
        break;
      }
    }
  }

  if (!from || !to) {
    throw new Error('transition requires at least two clips on a track');
  }

  return addTransition(timeline, {
    type,
    durationSec: 0.5,
    fromClipId: from.id,
    toClipId: to.id,
  });
}

/** Add a caption/text overlay attached to the clip at a given time. */
function applyCaption(timeline: Timeline, text: string, at: number): Timeline {
  const target = findClipAt(timeline, at) ?? findClipBefore(timeline, at);
  if (!target) {
    // No clip to attach to — create a text track + placeholder clip.
    const { timeline: withTrack, track } = ensureTrack(timeline, 'text');
    const clipId = generateId('cl');
    const placeholderClip: Clip = {
      id: clipId,
      trackId: track.id,
      mediaUrl: '',
      mediaType: 'image',
      startSec: at,
      endSec: at + 3,
      trimStartSec: 0,
      trimEndSec: 3,
      durationSec: 3,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      rotation: 0,
      opacity: 1,
      volume: 1,
      speed: 1,
      label: text,
    };
    const overlay: TextOverlay = {
      id: generateId('ov'),
      clipId,
      text,
      fontFamily: 'sans-serif',
      fontSize: 48,
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      position: 'bottom-center',
      alignment: 'center',
      bold: false,
      italic: false,
    };
    const updatedTracks = withTrack.tracks.map((t) =>
      t.id === track.id ? { ...t, clips: [...t.clips, placeholderClip] } : t,
    );
    return {
      ...withTrack,
      tracks: updatedTracks,
      textOverlays: [...withTrack.textOverlays, overlay],
      updatedAt: new Date().toISOString(),
    };
  }

  const overlay: TextOverlay = {
    id: generateId('ov'),
    clipId: target.clip.id,
    text,
    fontFamily: 'sans-serif',
    fontSize: 48,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'bottom-center',
    alignment: 'center',
    bold: false,
    italic: false,
  };
  return {
    ...timeline,
    textOverlays: [...timeline.textOverlays, overlay],
    updatedAt: new Date().toISOString(),
  };
}

/** Delete a clip at a time, or a track by index/type. */
function applyDelete(timeline: Timeline, params: Record<string, unknown>): Timeline {
  const target = params.target as string | undefined;
  if (target === 'clip') {
    const at = params.at as number | undefined;
    if (at === undefined) throw new Error('delete clip requires a time position');
    const found = findClipAt(timeline, at);
    if (!found) throw new Error(`no clip found at ${at}s`);
    const tracks = timeline.tracks.map((t) =>
      t.id === found.track.id ? { ...t, clips: t.clips.filter((c) => c.id !== found.clip.id) } : t,
    );
    return { ...timeline, tracks, updatedAt: new Date().toISOString() };
  }
  if (target === 'track') {
    if (typeof params.trackIndex === 'number') {
      if (params.trackIndex < 0 || params.trackIndex >= timeline.tracks.length) {
        throw new Error(`track index ${params.trackIndex + 1} out of range`);
      }
      const tracks = timeline.tracks.filter((_, i) => i !== params.trackIndex);
      return { ...timeline, tracks, updatedAt: new Date().toISOString() };
    }
    if (params.trackType) {
      const tracks = timeline.tracks.filter((t) => t.type !== params.trackType);
      return { ...timeline, tracks, updatedAt: new Date().toISOString() };
    }
    throw new Error('delete track requires a track index or type');
  }
  throw new Error('delete requires a target (clip or track)');
}

/** Split every clip that spans `at` into two clips at that point. */
function applySplit(timeline: Timeline, at: number): Timeline {
  const tracks = timeline.tracks.map((track) => {
    const clips: Clip[] = [];
    for (const clip of track.clips) {
      if (at > clip.startSec && at < clip.endSec) {
        const leftDur = at - clip.startSec;
        const rightDur = clip.endSec - at;
        clips.push(
          { ...clip, endSec: at, durationSec: leftDur, trimEndSec: clip.trimStartSec + leftDur },
          {
            ...clip,
            id: generateId('cl'),
            startSec: at,
            endSec: clip.endSec,
            durationSec: rightDur,
            trimStartSec: clip.trimStartSec + leftDur,
          },
        );
      } else {
        clips.push(clip);
      }
    }
    return { ...track, clips };
  });
  return { ...timeline, tracks, updatedAt: new Date().toISOString() };
}
