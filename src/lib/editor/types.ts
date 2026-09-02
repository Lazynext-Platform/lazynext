/**
 * Timeline data model for a lightweight native video editor.
 *
 * This is a data model study only — no UI, no video processing.
 * The model describes a video editing project as a collection of
 * tracks (layers), clips (media segments), transitions, markers,
 * and text overlays.
 *
 * Hierarchy:
 *   Timeline
 *     ├── Track[] (video | audio | text | overlay)
 *     │     └── Clip[] (a segment of media on a track)
 *     ├── Transition[] (between two clips)
 *     └── Marker[] (named points in the timeline)
 */

// ── Enums / unions ──

/** The kind of layer a track represents. */
export type TrackType = 'video' | 'audio' | 'text' | 'overlay';

/** The kind of media a clip references. */
export type ClipMediaType = 'video' | 'image' | 'audio';

/** The kind of transition between two clips. */
export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide';

/** Text alignment within a text overlay. */
export type TextAlignment = 'left' | 'center' | 'right';

/** Screen position anchor for a text overlay. */
export type TextPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** Common aspect ratios for a timeline. */
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9';

// ── Core entities ──

/**
 * A text overlay attached to a clip.
 * Allows rich text rendering on top of video/image media.
 */
export interface TextOverlay {
  id: string;
  clipId: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: TextPosition;
  alignment: TextAlignment;
  bold: boolean;
  italic: boolean;
}

/**
 * A segment of media placed on a track.
 *
 * - `startSec` / `endSec` define where the clip sits on the timeline.
 * - `trimStartSec` / `trimEndSec` define the in/out points within the
 *   source media (how much of the source is used).
 * - `durationSec` is the on-timeline duration (endSec - startSec).
 * - Transform fields (x, y, width, height, rotation, opacity) control
 *   the visual placement of the clip on the canvas.
 */
export interface Clip {
  id: string;
  trackId: string;
  mediaUrl: string;
  mediaType: ClipMediaType;
  startSec: number;
  endSec: number;
  trimStartSec: number;
  trimEndSec: number;
  durationSec: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  volume: number;
  speed: number;
  label: string;
}

/**
 * A transition between two adjacent clips.
 * `fromClipId` is the outgoing clip, `toClipId` is the incoming clip.
 */
export interface Transition {
  id: string;
  type: TransitionType;
  durationSec: number;
  fromClipId: string;
  toClipId: string;
}

/**
 * A named point in the timeline — useful for navigation and editing cues.
 */
export interface Marker {
  id: string;
  timeSec: number;
  label: string;
  color: string;
}

/**
 * A layer in the timeline. Tracks are stacked vertically; clips are
 * arranged horizontally within a track.
 */
export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
  locked: boolean;
  muted: boolean;
  hidden: boolean;
}

/**
 * A video editing project — the root of the timeline data model.
 *
 * `durationSec` is the total timeline duration, calculated from the
 * latest clip end time across all tracks.
 */
export interface Timeline {
  id: string;
  name: string;
  durationSec: number;
  fps: number;
  ratio: AspectRatio;
  tracks: Track[];
  transitions: Transition[];
  markers: Marker[];
  textOverlays: TextOverlay[];
  createdAt: string;
  updatedAt: string;
}
