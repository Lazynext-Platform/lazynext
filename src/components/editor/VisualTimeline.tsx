'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Film, Music, Type, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import type { Timeline, Track, TrackType, Clip } from '@/lib/editor/types';

export interface VisualTimelineProps {
  timeline: Timeline;
  onUpdateClip?: (trackId: string, clipId: string, newStartSec: number) => void;
  onSeek?: (timeSec: number) => void;
  currentTimeSec?: number;
}

// ── Helpers ──

const TRACK_LABEL_WIDTH = 120; // px, left gutter for track labels
const ROW_HEIGHT = 48; // px, per-track row height
const RULER_HEIGHT = 28; // px, time axis ruler height
const CLIP_HEIGHT = 32; // px, clip bar height
const MIN_TIMELINE_SEC = 10; // minimum visible seconds when empty

const SNAP_SEC = 0.5; // snap-to-grid interval

const ZOOM_LEVELS = [1, 2, 4] as const;
const BASE_PX_PER_SEC = 40; // px per second at 1x zoom

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function snapToGrid(sec: number): number {
  return Math.round(sec / SNAP_SEC) * SNAP_SEC;
}

const TRACK_COLORS: Record<TrackType, { bar: string; barHover: string; text: string; icon: typeof Film }> = {
  video: {
    bar: 'bg-blue-500/80',
    barHover: 'bg-blue-600',
    text: 'text-white',
    icon: Film,
  },
  audio: {
    bar: 'bg-green-500/80',
    barHover: 'bg-green-600',
    text: 'text-white',
    icon: Music,
  },
  text: {
    bar: 'bg-yellow-500/80',
    barHover: 'bg-yellow-600',
    text: 'text-black',
    icon: Type,
  },
  overlay: {
    bar: 'bg-purple-500/80',
    barHover: 'bg-purple-600',
    text: 'text-white',
    icon: Layers,
  },
};

function clipLabel(clip: Clip): string {
  if (clip.label && clip.label.trim()) return clip.label;
  // Fallback: use first line of any text overlay text if available — but Clip
  // itself doesn't carry text; use mediaType as a last resort.
  return clip.mediaType ? `${clip.mediaType} clip` : 'clip';
}

type DragMode = 'clip' | 'playhead' | null;

interface DragState {
  mode: DragMode;
  trackId?: string;
  clipId?: string;
  startPointerSec: number; // pointer position (in sec) at drag start
  startClipSec: number; // clip startSec at drag start
}

export function VisualTimeline({ timeline, onUpdateClip, onSeek, currentTimeSec = 0 }: VisualTimelineProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [drag, setDrag] = useState<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const pxPerSec = BASE_PX_PER_SEC * zoom;

  // Total visible duration: at least MIN_TIMELINE_SEC, or the latest clip end.
  const totalSec = useMemo(() => {
    let maxEnd = timeline.durationSec || 0;
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        if (clip.endSec > maxEnd) maxEnd = clip.endSec;
      }
    }
    // Add a little padding at the end.
    return Math.max(MIN_TIMELINE_SEC, maxEnd + 2);
  }, [timeline]);

  const canvasWidth = totalSec * pxPerSec;

  // Convert a pointer clientX to a time in seconds within the canvas.
  const pointerToSec = useCallback(
    (clientX: number): number => {
      const el = canvasRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      let sec = x / pxPerSec;
      if (sec < 0) sec = 0;
      if (sec > totalSec) sec = totalSec;
      return sec;
    },
    [pxPerSec, totalSec],
  );

  // ── Drag handlers ──

  const onClipPointerDown = useCallback(
    (e: React.PointerEvent, trackId: string, clip: Clip) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pointerSec = pointerToSec(e.clientX);
      setDrag({
        mode: 'clip',
        trackId,
        clipId: clip.id,
        startPointerSec: pointerSec,
        startClipSec: clip.startSec,
      });
    },
    [pointerToSec],
  );

  const onPlayheadPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const pointerSec = pointerToSec(e.clientX);
      setDrag({ mode: 'playhead', startPointerSec: pointerSec, startClipSec: 0 });
      onSeek?.(snapToGrid(pointerSec));
    },
    [pointerToSec, onSeek],
  );

  const onCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      const pointerSec = pointerToSec(e.clientX);
      if (drag.mode === 'clip' && drag.trackId && drag.clipId) {
        const delta = pointerSec - drag.startPointerSec;
        let newStart = drag.startClipSec + delta;
        newStart = snapToGrid(newStart);
        if (newStart < 0) newStart = 0;
        onUpdateClip?.(drag.trackId, drag.clipId, newStart);
      } else if (drag.mode === 'playhead') {
        onSeek?.(snapToGrid(pointerSec));
      }
    },
    [drag, pointerToSec, onUpdateClip, onSeek],
  );

  const onCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (drag) {
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
      setDrag(null);
    },
    [drag],
  );

  // Clicking on empty canvas area seeks the playhead.
  const onCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only treat as a click if we weren't dragging a clip.
      if (drag && drag.mode === 'clip') return;
      const pointerSec = pointerToSec(e.clientX);
      onSeek?.(snapToGrid(pointerSec));
    },
    [drag, pointerToSec, onSeek],
  );

  // ── Ruler ticks ──

  const ticks = useMemo(() => {
    // Choose a tick interval based on zoom so labels don't overlap.
    let interval = 1; // seconds
    if (pxPerSec * interval < 50) interval = 2;
    if (pxPerSec * interval < 50) interval = 5;
    if (pxPerSec * interval < 50) interval = 10;
    const arr: number[] = [];
    for (let s = 0; s <= totalSec; s += interval) {
      arr.push(s);
    }
    return { interval, marks: arr };
  }, [pxPerSec, totalSec]);

  const playheadLeft = currentTimeSec * pxPerSec;

  return (
    <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
      {/* Toolbar: zoom controls + time display */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-bg">
        <div className="flex items-center gap-1">
          <span className="text-xs text-fg-muted mr-1">Zoom</span>
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              aria-pressed={zoom === z}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                zoom === z
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-bg-card text-fg-muted border-border hover:text-fg'
              }`}
            >
              {z}x
            </button>
          ))}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(ZOOM_LEVELS[0], z === 4 ? 2 : z === 2 ? 1 : 1))}
            aria-label="Zoom out"
            className="ml-1 p-1 rounded border border-border text-fg-muted hover:text-fg"
          >
            <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], z === 1 ? 2 : 4))}
            aria-label="Zoom in"
            className="p-1 rounded border border-border text-fg-muted hover:text-fg"
          >
            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="text-xs font-mono text-fg-muted tabular-nums">
          {formatTime(currentTimeSec)} / {formatTime(totalSec)}
        </div>
      </div>

      {/* Timeline body */}
      <div className="flex">
        {/* Left gutter: track labels */}
        <div className="shrink-0 border-r border-border bg-bg" style={{ width: TRACK_LABEL_WIDTH }}>
          {/* Spacer aligned with ruler */}
          <div style={{ height: RULER_HEIGHT }} className="border-b border-border" />
          {timeline.tracks.length === 0 && (
            <div
              className="flex items-center justify-center text-xs text-fg-muted"
              style={{ height: ROW_HEIGHT }}
            >
              No tracks
            </div>
          )}
          {timeline.tracks.map((track) => {
            const colors = TRACK_COLORS[track.type];
            const Icon = colors.icon;
            return (
              <div
                key={track.id}
                role="group"
                aria-label={`Track: ${track.name}`}
                className="flex items-center gap-1.5 px-2 border-b border-border overflow-hidden"
                style={{ height: ROW_HEIGHT }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                <span className="text-xs truncate min-w-0">{track.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right: scrollable canvas (always LTR) */}
        <div dir="ltr" className="overflow-x-auto flex-1 min-w-0">
          <div
            ref={canvasRef}
            className="relative select-none"
            style={{ width: canvasWidth, minHeight: RULER_HEIGHT + timeline.tracks.length * ROW_HEIGHT }}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
            onClick={onCanvasClick}
          >
            {/* Ruler */}
            <div
              className="relative border-b border-border bg-bg sticky top-0 z-10"
              style={{ height: RULER_HEIGHT }}
            >
              {ticks.marks.map((s) => (
                <div
                  key={s}
                  className="absolute top-0 bottom-0 border-l border-border/60"
                  style={{ left: s * pxPerSec }}
                >
                  <span className="absolute top-0.5 left-1 text-[10px] text-fg-muted tabular-nums whitespace-nowrap">
                    {formatTime(s)}
                  </span>
                </div>
              ))}
            </div>

            {/* Track rows */}
            {timeline.tracks.length === 0 && (
              <div
                className="flex items-center justify-center text-xs text-fg-muted"
                style={{ height: ROW_HEIGHT }}
              >
                Empty timeline
              </div>
            )}
            {timeline.tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                pxPerSec={pxPerSec}
                isDragging={drag?.mode === 'clip' && drag?.clipId != null}
                onClipPointerDown={onClipPointerDown}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              style={{ left: playheadLeft }}
              aria-hidden="true"
            >
              <div className="absolute -top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm rotate-45" />
            </div>
            {/* Playhead handle (draggable, sits on ruler) */}
            <div
              role="slider"
              aria-label="Playhead"
              aria-valuenow={Math.round(currentTimeSec * 10) / 10}
              aria-valuemin={0}
              aria-valuemax={Math.round(totalSec * 10) / 10}
              aria-valuetext={`${formatTime(currentTimeSec)}`}
              tabIndex={0}
              onPointerDown={onPlayheadPointerDown}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  onSeek?.(snapToGrid(Math.max(0, currentTimeSec - SNAP_SEC)));
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  onSeek?.(snapToGrid(Math.min(totalSec, currentTimeSec + SNAP_SEC)));
                }
              }}
              className="absolute top-0 z-30 cursor-ew-resize touch-none"
              style={{
                left: playheadLeft - 6,
                width: 12,
                height: RULER_HEIGHT,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  pxPerSec: number;
  isDragging: boolean;
  onClipPointerDown: (e: React.PointerEvent, trackId: string, clip: Clip) => void;
}

function TrackRow({ track, pxPerSec, isDragging, onClipPointerDown }: TrackRowProps) {
  const colors = TRACK_COLORS[track.type];
  return (
    <div
      role="group"
      aria-label={`Track row: ${track.name}`}
      className="relative border-b border-border"
      style={{ height: ROW_HEIGHT }}
    >
      {/* Subtle alternating row background */}
      <div className="absolute inset-0 bg-bg/40" />
      {track.clips.length === 0 && (
        <div className="absolute inset-0 flex items-center px-2 text-[10px] text-fg-muted/60">
          empty
        </div>
      )}
      {track.clips.map((clip) => {
        const left = clip.startSec * pxPerSec;
        const width = Math.max(2, clip.durationSec * pxPerSec);
        const top = (ROW_HEIGHT - CLIP_HEIGHT) / 2;
        return (
          <div
            key={clip.id}
            role="slider"
            aria-label={`Clip: ${clipLabel(clip)}`}
            aria-valuenow={Math.round(clip.startSec * 10) / 10}
            aria-valuemin={0}
            aria-valuemax={9999}
            aria-valuetext={`Start ${formatTime(clip.startSec)}, duration ${clip.durationSec.toFixed(1)}s`}
            tabIndex={0}
            onPointerDown={(e) => onClipPointerDown(e, track.id, clip)}
            className={`absolute rounded-md ${colors.bar} ${colors.text} cursor-ew-resize touch-none shadow-sm overflow-hidden transition-colors ${
              isDragging ? 'ring-2 ring-white/70' : 'hover:' + colors.barHover
            }`}
            style={{ left, width, top, height: CLIP_HEIGHT }}
            title={`${clipLabel(clip)} — ${formatTime(clip.startSec)} to ${formatTime(clip.endSec)}`}
          >
            <div className="px-1.5 py-0.5 text-[11px] font-medium truncate whitespace-nowrap pointer-events-none">
              {clipLabel(clip)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VisualTimeline;
