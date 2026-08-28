import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the timeline data model and builder utilities.
 *
 * Verifies timeline creation, track/clip/transition/marker addition,
 * and validation logic (overlap detection, invalid transition refs,
 * clip time bounds, and duration calculation).
 *
 * Imports the builder + types directly via the @/ alias loader.
 */

import {
  createTimeline,
  addTrack,
  addClip,
  addTransition,
  addMarker,
  validateTimeline,
} from '@/lib/editor/timeline-builder';
import type { Clip } from '@/lib/editor/types';

// ── Helpers ──

/** Build a minimal valid clip input (without id/trackId/durationSec). */
function clipInput(startSec: number, endSec: number, mediaUrl = 'https://example.com/v.mp4') {
  return {
    mediaUrl,
    mediaType: 'video' as const,
    startSec,
    endSec,
    trimStartSec: 0,
    trimEndSec: endSec - startSec,
    label: `Clip ${startSec}-${endSec}`,
  };
}

// ── Timeline creation ──

test('createTimeline produces a timeline with correct defaults', () => {
  const tl = createTimeline();
  assert.equal(tl.name, 'Untitled Timeline');
  assert.equal(tl.fps, 30);
  assert.equal(tl.ratio, '16:9');
  assert.equal(tl.durationSec, 0);
  assert.equal(tl.tracks.length, 0);
  assert.equal(tl.transitions.length, 0);
  assert.equal(tl.markers.length, 0);
  assert.equal(tl.textOverlays.length, 0);
  assert.ok(tl.id);
  assert.ok(tl.createdAt);
  assert.ok(tl.updatedAt);
});

test('createTimeline respects custom options', () => {
  const tl = createTimeline({ name: 'My Edit', fps: 24, ratio: '9:16' });
  assert.equal(tl.name, 'My Edit');
  assert.equal(tl.fps, 24);
  assert.equal(tl.ratio, '9:16');
});

// ── Adding tracks ──

test('addTrack adds a track with the given type and a default name', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  assert.equal(tl2.tracks.length, 1);
  assert.equal(tl2.tracks[0].type, 'video');
  assert.equal(tl2.tracks[0].name, 'Video 1');
  assert.equal(tl2.tracks[0].locked, false);
  assert.equal(tl2.tracks[0].muted, false);
  assert.equal(tl2.tracks[0].hidden, false);
  assert.equal(tl2.tracks[0].clips.length, 0);
});

test('addTrack accepts a custom name', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'audio', 'Voiceover');
  assert.equal(tl2.tracks[0].name, 'Voiceover');
});

test('addTrack increments the default name index', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const tl3 = addTrack(tl2, 'video');
  assert.equal(tl3.tracks[0].name, 'Video 1');
  assert.equal(tl3.tracks[1].name, 'Video 2');
});

// ── Adding clips ──

test('addClip adds a clip to the specified track', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, clipInput(0, 5));
  assert.equal(tl3.tracks[0].clips.length, 1);
  const clip = tl3.tracks[0].clips[0];
  assert.equal(clip.trackId, trackId);
  assert.equal(clip.startSec, 0);
  assert.equal(clip.endSec, 5);
  assert.equal(clip.durationSec, 5);
  assert.ok(clip.id);
});

test('addClip throws if the track does not exist', () => {
  const tl = createTimeline();
  assert.throws(
    () => addClip(tl, 'nonexistent', clipInput(0, 5)),
    /Track not found/,
  );
});

test('addClip applies default transform values', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const clip = addClip(tl2, tl2.tracks[0].id, clipInput(0, 3)).tracks[0].clips[0];
  assert.equal(clip.x, 0);
  assert.equal(clip.y, 0);
  assert.equal(clip.opacity, 1);
  assert.equal(clip.volume, 1);
  assert.equal(clip.speed, 1);
  assert.equal(clip.rotation, 0);
});

// ── Adding transitions ──

test('addTransition adds a transition to the timeline', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, clipInput(0, 5));
  const tl4 = addClip(tl3, trackId, clipInput(5, 10));
  const clipA = tl4.tracks[0].clips[0];
  const clipB = tl4.tracks[0].clips[1];
  const tl5 = addTransition(tl4, {
    type: 'fade',
    durationSec: 1,
    fromClipId: clipA.id,
    toClipId: clipB.id,
  });
  assert.equal(tl5.transitions.length, 1);
  assert.equal(tl5.transitions[0].type, 'fade');
  assert.equal(tl5.transitions[0].fromClipId, clipA.id);
  assert.equal(tl5.transitions[0].toClipId, clipB.id);
  assert.ok(tl5.transitions[0].id);
});

// ── Adding markers ──

test('addMarker adds a marker to the timeline', () => {
  const tl = createTimeline();
  const tl2 = addMarker(tl, { timeSec: 3.5, label: 'Hook', color: '#ff0000' });
  assert.equal(tl2.markers.length, 1);
  assert.equal(tl2.markers[0].timeSec, 3.5);
  assert.equal(tl2.markers[0].label, 'Hook');
  assert.equal(tl2.markers[0].color, '#ff0000');
  assert.ok(tl2.markers[0].id);
});

// ── Validation: overlapping clips ──

test('validateTimeline rejects overlapping clips on the same track', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, clipInput(0, 5));
  const tl4 = addClip(tl3, trackId, clipInput(3, 8)); // overlaps [0,5]
  const result = validateTimeline(tl4);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('overlap')), `expected overlap error, got: ${result.errors.join('; ')}`);
});

test('validateTimeline accepts adjacent (non-overlapping) clips', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, clipInput(0, 5));
  const tl4 = addClip(tl3, trackId, clipInput(5, 10)); // exactly adjacent
  const result = validateTimeline(tl4);
  assert.equal(result.valid, true, result.errors.join('; '));
});

// ── Validation: invalid transition clip IDs ──

test('validateTimeline rejects transitions with invalid clip IDs', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, clipInput(0, 5));
  const tl4 = addTransition(tl3, {
    type: 'fade',
    durationSec: 1,
    fromClipId: 'fake-clip-1',
    toClipId: 'fake-clip-2',
  });
  const result = validateTimeline(tl4);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('unknown fromClipId')));
  assert.ok(result.errors.some((e) => e.includes('unknown toClipId')));
});

test('validateTimeline rejects transitions between clips on different tracks', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const tl3 = addTrack(tl2, 'audio');
  const videoTrackId = tl3.tracks[0].id;
  const audioTrackId = tl3.tracks[1].id;
  const tl4 = addClip(tl3, videoTrackId, clipInput(0, 5));
  const tl5 = addClip(tl4, audioTrackId, clipInput(0, 5));
  const videoClip = tl5.tracks[0].clips[0];
  const audioClip = tl5.tracks[1].clips[0];
  const tl6 = addTransition(tl5, {
    type: 'dissolve',
    durationSec: 0.5,
    fromClipId: videoClip.id,
    toClipId: audioClip.id,
  });
  const result = validateTimeline(tl6);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('different tracks')));
});

// ── Validation: clip endSec < startSec ──

test('validateTimeline rejects clips with endSec < startSec', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  // Manually construct an invalid clip to bypass addClip's duration calc.
  const invalidClip: Clip = {
    id: 'bad-clip',
    trackId,
    mediaUrl: 'https://example.com/v.mp4',
    mediaType: 'video',
    startSec: 10,
    endSec: 5, // end before start
    trimStartSec: 0,
    trimEndSec: 0,
    durationSec: -5,
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    rotation: 0,
    opacity: 1,
    volume: 1,
    speed: 1,
    label: 'Bad',
  };
  const tl3: typeof tl2 = {
    ...tl2,
    tracks: tl2.tracks.map((t) =>
      t.id === trackId ? { ...t, clips: [...t.clips, invalidClip] } : t,
    ),
  };
  const result = validateTimeline(tl3);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('endSec') && e.includes('startSec')));
});

// ── Timeline duration calculation ──

test('timeline durationSec is calculated from the latest clip end', () => {
  const tl = createTimeline();
  assert.equal(tl.durationSec, 0);
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, clipInput(0, 5));
  assert.equal(tl3.durationSec, 5);
  const tl4 = addClip(tl3, trackId, clipInput(5, 12));
  assert.equal(tl4.durationSec, 12);
});

test('timeline durationSec accounts for clips on different tracks', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const tl3 = addTrack(tl2, 'audio');
  const tl4 = addClip(tl3, tl3.tracks[0].id, clipInput(0, 8));
  assert.equal(tl4.durationSec, 8);
  const tl5 = addClip(tl4, tl3.tracks[1].id, clipInput(0, 15));
  assert.equal(tl5.durationSec, 15);
});

// ── Validation: empty timeline is valid ──

test('validateTimeline accepts an empty timeline', () => {
  const tl = createTimeline();
  const result = validateTimeline(tl);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

// ── Validation: valid full timeline ──

test('validateTimeline accepts a well-formed timeline with tracks, clips, transitions, and markers', () => {
  const tl = createTimeline({ name: 'Ad Edit', fps: 30, ratio: '9:16' });
  const tl2 = addTrack(tl, 'video');
  const tl3 = addTrack(tl2, 'audio');
  const videoTrackId = tl3.tracks[0].id;
  const audioTrackId = tl3.tracks[1].id;

  const tl4 = addClip(tl3, videoTrackId, clipInput(0, 5));
  const tl5 = addClip(tl4, videoTrackId, clipInput(5, 10));
  const tl6 = addClip(tl5, audioTrackId, clipInput(0, 10));

  const clipA = tl6.tracks[0].clips[0];
  const clipB = tl6.tracks[0].clips[1];
  const tl7 = addTransition(tl6, {
    type: 'fade',
    durationSec: 0.5,
    fromClipId: clipA.id,
    toClipId: clipB.id,
  });
  const tl8 = addMarker(tl7, { timeSec: 2, label: 'Hook end', color: '#00ff00' });

  const result = validateTimeline(tl8);
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(tl8.durationSec, 10);
});
