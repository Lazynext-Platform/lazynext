/**
 * Timeline builder utilities.
 *
 * Pure functions for constructing and validating a Timeline data model.
 * No side effects, no I/O — suitable for use in API routes, server
 * actions, and tests.
 */

import type {
  Timeline,
  Track,
  TrackType,
  Clip,
  Transition,
  Marker,
  AspectRatio,
} from './types';

// ── ID generation ──

/**
 * Generate a unique ID using crypto.randomUUID when available,
 * falling back to a timestamp + random string.
 */
export function generateId(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${rand}` : rand;
}

// ── Defaults ──

const DEFAULT_FPS = 30;
const DEFAULT_RATIO: AspectRatio = '16:9';

/** Default transform / style values for a new clip. */
const DEFAULT_CLIP_STYLE = {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  rotation: 0,
  opacity: 1,
  volume: 1,
  speed: 1,
} as const;

// ── Builders ──

export interface CreateTimelineOptions {
  name?: string;
  fps?: number;
  ratio?: AspectRatio;
}

/**
 * Create a new empty timeline with sensible defaults.
 */
export function createTimeline(opts: CreateTimelineOptions = {}): Timeline {
  const now = new Date().toISOString();
  return {
    id: generateId('tl'),
    name: opts.name ?? 'Untitled Timeline',
    durationSec: 0,
    fps: opts.fps ?? DEFAULT_FPS,
    ratio: opts.ratio ?? DEFAULT_RATIO,
    tracks: [],
    transitions: [],
    markers: [],
    textOverlays: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add a track to a timeline. Returns a new timeline object (immutable update).
 */
export function addTrack(
  timeline: Timeline,
  type: TrackType,
  name?: string,
): Timeline {
  const track: Track = {
    id: generateId('tr'),
    type,
    name: name ?? defaultTrackName(type, timeline.tracks.length),
    clips: [],
    locked: false,
    muted: false,
    hidden: false,
  };
  return {
    ...timeline,
    tracks: [...timeline.tracks, track],
    updatedAt: new Date().toISOString(),
  };
}

/** Fields that default when not provided (transform / style). */
type ClipStyleFields = Pick<
  Clip,
  'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'volume' | 'speed'
>;

/**
 * Add a clip to a specific track. Returns a new timeline object.
 * The clip's `trackId` is set to the target track's id.
 * Transform / style fields (x, y, width, height, rotation, opacity,
 * volume, speed) are optional and default to sensible values.
 */
export function addClip(
  timeline: Timeline,
  trackId: string,
  clip: Omit<Clip, 'id' | 'trackId' | 'durationSec' | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'volume' | 'speed'> &
    Partial<Pick<Clip, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'volume' | 'speed' | 'durationSec'>>,
): Timeline {
  const track = timeline.tracks.find((t) => t.id === trackId);
  if (!track) {
    throw new Error(`Track not found: ${trackId}`);
  }

  const durationSec = clip.durationSec ?? clip.endSec - clip.startSec;
  const fullClip: Clip = {
    ...DEFAULT_CLIP_STYLE,
    ...clip,
    id: generateId('cl'),
    trackId,
    durationSec,
  };

  const updatedTracks = timeline.tracks.map((t) =>
    t.id === trackId ? { ...t, clips: [...t.clips, fullClip] } : t,
  );

  const durationSec2 = Math.max(timeline.durationSec, fullClip.endSec);
  return {
    ...timeline,
    tracks: updatedTracks,
    durationSec: durationSec2,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add a transition between two clips. Returns a new timeline object.
 */
export function addTransition(
  timeline: Timeline,
  transition: Omit<Transition, 'id'>,
): Timeline {
  const fullTransition: Transition = {
    ...transition,
    id: generateId('tx'),
  };
  return {
    ...timeline,
    transitions: [...timeline.transitions, fullTransition],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add a marker at a specific point in the timeline. Returns a new timeline object.
 */
export function addMarker(
  timeline: Timeline,
  marker: Omit<Marker, 'id'>,
): Timeline {
  const fullMarker: Marker = {
    ...marker,
    id: generateId('mk'),
  };
  return {
    ...timeline,
    markers: [...timeline.markers, fullMarker],
    updatedAt: new Date().toISOString(),
  };
}

// ── Validation ──

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a timeline for structural integrity.
 *
 * Checks performed:
 * 1. No clip has endSec < startSec.
 * 2. No overlapping clips on the same track.
 * 3. Transitions reference valid clip IDs.
 * 4. Transition clips must be on the same track.
 * 5. Markers have non-negative time.
 */
export function validateTimeline(timeline: Timeline): ValidationResult {
  const errors: string[] = [];

  // Collect all clip IDs for transition validation.
  const clipIds = new Set<string>();
  const clipTrackMap = new Map<string, string>();

  for (const track of timeline.tracks) {
    // Check each clip's time bounds.
    for (const clip of track.clips) {
      clipIds.add(clip.id);
      clipTrackMap.set(clip.id, track.id);

      if (clip.endSec < clip.startSec) {
        errors.push(
          `Clip ${clip.id} has endSec (${clip.endSec}) < startSec (${clip.startSec})`,
        );
      }
      if (clip.startSec < 0) {
        errors.push(`Clip ${clip.id} has negative startSec (${clip.startSec})`);
      }
    }

    // Check for overlapping clips on the same track.
    const sorted = [...track.clips].sort((a, b) => a.startSec - b.startSec);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.startSec < prev.endSec) {
        errors.push(
          `Clips overlap on track "${track.name}": ${prev.id} [${prev.startSec}-${prev.endSec}] and ${curr.id} [${curr.startSec}-${curr.endSec}]`,
        );
      }
    }
  }

  // Validate transitions reference valid clips on the same track.
  for (const tx of timeline.transitions) {
    if (!clipIds.has(tx.fromClipId)) {
      errors.push(
        `Transition ${tx.id} references unknown fromClipId: ${tx.fromClipId}`,
      );
    }
    if (!clipIds.has(tx.toClipId)) {
      errors.push(
        `Transition ${tx.id} references unknown toClipId: ${tx.toClipId}`,
      );
    }
    if (
      clipIds.has(tx.fromClipId) &&
      clipIds.has(tx.toClipId) &&
      clipTrackMap.get(tx.fromClipId) !== clipTrackMap.get(tx.toClipId)
    ) {
      errors.push(
        `Transition ${tx.id} connects clips on different tracks`,
      );
    }
    if (tx.durationSec < 0) {
      errors.push(`Transition ${tx.id} has negative duration (${tx.durationSec})`);
    }
  }

  // Validate markers.
  for (const marker of timeline.markers) {
    if (marker.timeSec < 0) {
      errors.push(`Marker ${marker.id} has negative timeSec (${marker.timeSec})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Helpers ──

/** Produce a human-friendly default track name based on type and index. */
function defaultTrackName(type: TrackType, index: number): string {
  const labels: Record<TrackType, string> = {
    video: 'Video',
    audio: 'Audio',
    text: 'Text',
    overlay: 'Overlay',
  };
  return `${labels[type]} ${index + 1}`;
}
