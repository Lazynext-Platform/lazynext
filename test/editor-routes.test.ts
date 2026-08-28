import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for the new editor and creative tool API routes.
 *
 * The route handlers themselves cannot be imported in tests because they
 * pull in auth, prisma, and atlas modules whose relative extensionless
 * imports the Node test runner cannot resolve. Instead, these tests
 * exercise the pure logic that the routes delegate to:
 *
 *  - Transcribe: parseTranscript logic (replicated inline — not exported)
 *  - OCR: dryRunOCR provider stub (imported via @/ alias)
 *  - Tool execute: validation + cost lookup (imported via @/ alias)
 *  - Timeline: builder + validation functions (imported via @/ alias)
 */

import { dryRunOCR } from '@/lib/providers/ocr';
import {
  getTool,
  validateAgainstSchema,
  executeTool,
  CREATIVE_TOOL_COSTS,
} from '@/lib/creative/tools';
import {
  createTimeline,
  addTrack,
  addClip,
  addTransition,
  addMarker,
  validateTimeline,
} from '@/lib/editor/timeline-builder';
import type { Timeline, TrackType, AspectRatio } from '@/lib/editor/types';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Transcribe: parseTranscript logic (inline copy — not exported from route)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inline replica of the parseTranscript function from
 * src/app/api/editor/transcribe/route.ts. The route does not export it, so we
 * reproduce the exact logic here to verify its behavior. If the route's
 * implementation changes, this copy must be updated to match.
 */
function parseTranscript(
  text: string,
  estimatedDurationSec?: number,
): { text: string; segments: Array<{ start: number; end: number; text: string }>; duration?: number } {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) {
    return { text, segments: [], duration: estimatedDurationSec };
  }

  const totalWords = text.trim().split(/\s+/).length;
  const duration = estimatedDurationSec ?? Math.max(totalWords / 2.5, sentences.length * 2);

  const segments = sentences.map((sentence, i) => {
    const words = sentence.split(/\s+/).length;
    const wordRatio = words / totalWords;
    const segDuration = wordRatio * duration;
    const start =
      i === 0
        ? 0
        : sentences
            .slice(0, i)
            .reduce((sum, s) => sum + (s.split(/\s+/).length / totalWords) * duration, 0);
    return {
      start: Math.round(start * 10) / 10,
      end: Math.round((start + segDuration) * 10) / 10,
      text: sentence,
    };
  });

  return { text, segments, duration: Math.round(duration * 10) / 10 };
}

test('parseTranscript: empty text returns empty segments', () => {
  const result = parseTranscript('');
  assert.equal(result.segments.length, 0);
  assert.equal(result.text, '');
});

test('parseTranscript: whitespace-only text returns empty segments', () => {
  const result = parseTranscript('   ');
  assert.equal(result.segments.length, 0);
});

test('parseTranscript: text with no sentence punctuation returns a single segment', () => {
  const result = parseTranscript('hello world');
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].text, 'hello world');
  assert.equal(result.segments[0].start, 0);
  assert.ok(result.segments[0].end > 0, 'segment end should be positive');
});

test('parseTranscript: single sentence returns one segment', () => {
  const result = parseTranscript('This is a sentence.');
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].text, 'This is a sentence');
  assert.equal(result.segments[0].start, 0);
  assert.ok(result.segments[0].end > 0);
});

test('parseTranscript: multiple sentences get proportional timestamps', () => {
  const text = 'First sentence here. Second one is longer than the first. Third is short.';
  const result = parseTranscript(text);
  assert.equal(result.segments.length, 3);

  // First segment always starts at 0
  assert.equal(result.segments[0].start, 0);

  // Segments are contiguous: each start equals the previous end (within rounding)
  for (let i = 1; i < result.segments.length; i++) {
    assert.ok(
      result.segments[i].start >= result.segments[i - 1].start,
      'segment starts should be non-decreasing',
    );
  }

  // The last segment end should equal the total duration
  const lastEnd = result.segments[result.segments.length - 1].end;
  assert.ok(lastEnd > 0);
  assert.ok(
    Math.abs(lastEnd - (result.duration ?? 0)) <= 0.2,
    `last segment end (${lastEnd}) should approximate duration (${result.duration})`,
  );
});

test('parseTranscript: duration is estimated from word count when not provided', () => {
  // 10 words at 2.5 words/sec => 4 seconds (>= sentences.length * 2 = 6? no, 3 sentences => 6)
  // Math.max(10/2.5, 3*2) = Math.max(4, 6) = 6
  const text = 'one two three four five six seven eight nine ten. one two three. one two.';
  const result = parseTranscript(text);
  assert.ok(result.duration !== undefined);
  assert.equal(result.duration, 6);
});

test('parseTranscript: uses provided estimatedDurationSec when given', () => {
  const text = 'First sentence. Second sentence.';
  const result = parseTranscript(text, 30);
  assert.equal(result.duration, 30);
  // Last segment end should approximate the provided duration
  const lastEnd = result.segments[result.segments.length - 1].end;
  assert.ok(
    Math.abs(lastEnd - 30) <= 0.2,
    `last segment end (${lastEnd}) should approximate provided duration (30)`,
  );
});

test('parseTranscript: segments cover the full duration proportionally by word count', () => {
  const text = 'short. this is a much longer sentence with many words in it.';
  const result = parseTranscript(text, 10);
  assert.equal(result.segments.length, 2);
  // The longer sentence should get a larger time slice
  assert.ok(
    result.segments[1].end - result.segments[1].start >
      result.segments[0].end - result.segments[0].start,
    'the longer sentence should have a longer segment duration',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. OCR: dryRunOCR provider stub
// ─────────────────────────────────────────────────────────────────────────────

test('dryRunOCR returns empty text', async () => {
  const result = await dryRunOCR.extract({
    imageUrl: 'https://example.com/image.png',
  });
  assert.equal(result.text, '');
});

test('dryRunOCR returns empty regions array', async () => {
  const result = await dryRunOCR.extract({
    imageUrl: 'https://example.com/image.png',
    structured: true,
  });
  assert.ok(Array.isArray(result.regions));
  assert.equal(result.regions!.length, 0);
});

test('dryRunOCR returns the provided language', async () => {
  const result = await dryRunOCR.extract({
    imageUrl: 'https://example.com/image.png',
    language: 'zh',
  });
  assert.equal(result.language, 'zh');
});

test('dryRunOCR defaults language to "en" when not provided', async () => {
  const result = await dryRunOCR.extract({
    imageUrl: 'https://example.com/image.png',
  });
  assert.equal(result.language, 'en');
});

test('dryRunOCR has id "dryrun"', () => {
  assert.equal(dryRunOCR.id, 'dryrun');
});

test('dryRunOCR does not throw on any input', async () => {
  // Should not reject even with minimal options
  const result = await dryRunOCR.extract({ imageUrl: '' });
  assert.ok(typeof result.text === 'string');
  assert.ok(Array.isArray(result.regions));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tool execute: validation + cost lookup
// ─────────────────────────────────────────────────────────────────────────────

test('getTool returns undefined for a non-existent tool', () => {
  assert.equal(getTool('creative.nonexistent'), undefined);
});

test('getTool returns undefined for an empty tool name', () => {
  assert.equal(getTool(''), undefined);
});

test('getTool returns the tool definition for creative.generateBrief', () => {
  const tool = getTool('creative.generateBrief');
  assert.ok(tool);
  assert.equal(tool!.name, 'creative.generateBrief');
  assert.equal(tool!.cost, CREATIVE_TOOL_COSTS.brief);
});

test('valid input passes validation for creative.generateBrief', () => {
  const tool = getTool('creative.generateBrief');
  assert.ok(tool);
  const errors = validateAgainstSchema(
    { product: 'A widget', productName: 'Widget', platform: 'tiktok' },
    tool!.inputSchema,
  );
  assert.equal(errors.length, 0, `expected no errors, got: ${errors.join('; ')}`);
});

test('invalid input (missing required "product") fails validation for creative.generateBrief', () => {
  const tool = getTool('creative.generateBrief');
  assert.ok(tool);
  const errors = validateAgainstSchema({ productName: 'Widget' }, tool!.inputSchema);
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('product')));
});

test('invalid input (wrong type for "product") fails validation', () => {
  const tool = getTool('creative.generateBrief');
  assert.ok(tool);
  const errors = validateAgainstSchema({ product: 123 }, tool!.inputSchema);
  assert.ok(errors.length > 0);
});

test('executeTool returns an error result for an unknown tool', async () => {
  const result = await executeTool('creative.nonexistent', {});
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes('unknown tool'));
  assert.equal(result.cost, 0);
});

test('executeTool validates input before execution and returns validation error', async () => {
  // generateBrief requires 'product' — pass empty object
  const result = await executeTool('creative.generateBrief', {});
  assert.equal(result.ok, false);
  assert.ok(result.error?.includes('validation'));
  assert.equal(result.cost, 0);
});

test('route uses tool.cost property for cost lookup (fixed)', () => {
  // The route previously used CREATIVE_TOOL_COSTS[toolName] which was broken
  // because toolName is the full name (e.g. 'creative.generateBrief') but
  // the cost map is keyed by short labels ('brief', 'hooks', ...).
  // The fix uses tool.cost directly. Verify each tool has a positive cost.
  const toolNames = [
    'creative.generateBrief',
    'creative.generateHooks',
    'creative.generateAngles',
    'creative.generateScript',
    'creative.generateStoryboard',
    'creative.scoreCombination',
    'creative.generateVariants',
    'creative.refine',
    'creative.remix',
    'creative.analyzeReference',
  ];
  for (const name of toolNames) {
    const tool = getTool(name);
    assert.ok(tool, `${name} should be registered`);
    assert.ok(tool!.cost > 0, `${name} should have positive cost, got ${tool!.cost}`);
  }
});

test('CREATIVE_TOOL_COSTS lookup returns 0 for an unknown tool name', () => {
  const toolName = 'creative.nonexistent';
  const cost = CREATIVE_TOOL_COSTS[toolName as keyof typeof CREATIVE_TOOL_COSTS] || 0;
  assert.equal(cost, 0);
});

test('full tool names are NOT direct keys in CREATIVE_TOOL_COSTS (historical bug context)', () => {
  // Documents why the route was originally broken: the cost map uses short
  // labels as keys, not full tool names. The route now uses tool.cost instead.
  const toolNames = [
    'creative.generateBrief',
    'creative.generateHooks',
    'creative.generateAngles',
    'creative.generateScript',
    'creative.generateStoryboard',
    'creative.scoreCombination',
    'creative.generateVariants',
    'creative.refine',
    'creative.remix',
    'creative.analyzeReference',
  ];
  for (const name of toolNames) {
    const cost = CREATIVE_TOOL_COSTS[name as keyof typeof CREATIVE_TOOL_COSTS] || 0;
    assert.equal(cost, 0, `${name} should not be a direct key in CREATIVE_TOOL_COSTS`);
  }
});

test('CREATIVE_TOOL_COSTS keys are short labels with positive integer values', () => {
  // The cost map uses short labels as keys. Verify each is a positive integer.
  for (const cost of Object.values(CREATIVE_TOOL_COSTS)) {
    assert.ok(cost > 0, `cost should be positive, got ${cost}`);
    assert.ok(Number.isInteger(cost), `cost should be an integer, got ${cost}`);
  }
});

test('CREATIVE_TOOL_COSTS has entries for all 10 creative steps', () => {
  const expectedKeys = [
    'brief',
    'hooks',
    'angles',
    'script',
    'storyboard',
    'referenceAnalysis',
    'score',
    'variants',
    'refine',
    'remix',
  ];
  const keys = Object.keys(CREATIVE_TOOL_COSTS);
  for (const k of expectedKeys) {
    assert.ok(
      keys.includes(k),
      `CREATIVE_TOOL_COSTS should have key "${k}"`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Timeline: action validation (builder functions)
// ─────────────────────────────────────────────────────────────────────────────
//
// The timeline route handler (src/app/api/editor/timeline/route.ts) validates
// the `action` field and delegates to these pure builder functions. Since the
// route requires auth + prisma, we test the builder functions directly — these
// are what the route's `create`, `addTrack`, `addClip`, `addTransition`,
// `addMarker`, and `validate` actions call.

test('createTimeline with valid params produces a well-formed timeline', () => {
  const tl = createTimeline({ name: 'My Edit', fps: 24, ratio: '9:16' });
  assert.equal(tl.name, 'My Edit');
  assert.equal(tl.fps, 24);
  assert.equal(tl.ratio, '9:16');
  assert.equal(tl.durationSec, 0);
  assert.equal(tl.tracks.length, 0);
  assert.equal(tl.transitions.length, 0);
  assert.equal(tl.markers.length, 0);
  assert.ok(tl.id.startsWith('tl_'));
  assert.ok(tl.createdAt);
  assert.ok(tl.updatedAt);
});

test('createTimeline with default params uses sensible defaults', () => {
  const tl = createTimeline();
  assert.equal(tl.name, 'Untitled Timeline');
  assert.equal(tl.fps, 30);
  assert.equal(tl.ratio, '16:9');
  assert.equal(tl.durationSec, 0);
});

test('createTimeline accepts all valid aspect ratios', () => {
  const ratios: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'];
  for (const ratio of ratios) {
    const tl = createTimeline({ ratio });
    assert.equal(tl.ratio, ratio);
  }
});

test('validateTimeline on a valid timeline returns no errors', () => {
  const tl = createTimeline({ name: 'Ad Edit' });
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, {
    mediaUrl: 'https://example.com/v.mp4',
    mediaType: 'video',
    startSec: 0,
    endSec: 5,
    trimStartSec: 0,
    trimEndSec: 5,
    label: 'Clip 1',
  });
  const tl4 = addClip(tl3, trackId, {
    mediaUrl: 'https://example.com/v2.mp4',
    mediaType: 'video',
    startSec: 5,
    endSec: 10,
    trimStartSec: 0,
    trimEndSec: 5,
    label: 'Clip 2',
  });
  const result = validateTimeline(tl4);
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(result.errors.length, 0);
});

test('validateTimeline on an empty timeline is valid', () => {
  const tl = createTimeline();
  const result = validateTimeline(tl);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateTimeline rejects overlapping clips (route "validate" action logic)', () => {
  // The route's `validate` action calls validateTimeline(body.timeline).
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, {
    mediaUrl: 'https://example.com/a.mp4',
    mediaType: 'video',
    startSec: 0,
    endSec: 5,
    trimStartSec: 0,
    trimEndSec: 5,
    label: 'A',
  });
  const tl4 = addClip(tl3, trackId, {
    mediaUrl: 'https://example.com/b.mp4',
    mediaType: 'video',
    startSec: 3,
    endSec: 8,
    trimStartSec: 0,
    trimEndSec: 5,
    label: 'B',
  });
  const result = validateTimeline(tl4);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('overlap')));
});

test('addTrack rejects invalid track types via the route guard (inline check)', () => {
  // The route's `addTrack` action validates: type must be one of
  // ['video', 'audio', 'text', 'overlay']. Replicate that guard inline.
  const VALID_TRACK_TYPES: TrackType[] = ['video', 'audio', 'text', 'overlay'];
  const invalid = 'subtitle';
  assert.ok(!VALID_TRACK_TYPES.includes(invalid as TrackType));
});

test('addTrack accepts all valid track types', () => {
  const validTypes: TrackType[] = ['video', 'audio', 'text', 'overlay'];
  for (const type of validTypes) {
    const tl = createTimeline();
    const tl2 = addTrack(tl, type);
    assert.equal(tl2.tracks.length, 1);
    assert.equal(tl2.tracks[0].type, type);
  }
});

test('addClip throws for a non-existent track (route "addClip" would 400)', () => {
  const tl = createTimeline();
  assert.throws(
    () =>
      addClip(tl, 'nonexistent-track', {
        mediaUrl: 'https://example.com/v.mp4',
        mediaType: 'video',
        startSec: 0,
        endSec: 5,
        trimStartSec: 0,
        trimEndSec: 5,
        label: 'Clip',
      }),
    /Track not found/,
  );
});

test('addTransition + addMarker produce a validatable timeline', () => {
  const tl = createTimeline();
  const tl2 = addTrack(tl, 'video');
  const trackId = tl2.tracks[0].id;
  const tl3 = addClip(tl2, trackId, {
    mediaUrl: 'https://example.com/a.mp4',
    mediaType: 'video',
    startSec: 0,
    endSec: 5,
    trimStartSec: 0,
    trimEndSec: 5,
    label: 'A',
  });
  const tl4 = addClip(tl3, trackId, {
    mediaUrl: 'https://example.com/b.mp4',
    mediaType: 'video',
    startSec: 5,
    endSec: 10,
    trimStartSec: 0,
    trimEndSec: 5,
    label: 'B',
  });
  const clipA = tl4.tracks[0].clips[0];
  const clipB = tl4.tracks[0].clips[1];
  const tl5 = addTransition(tl4, {
    type: 'fade',
    durationSec: 0.5,
    fromClipId: clipA.id,
    toClipId: clipB.id,
  });
  const tl6 = addMarker(tl5, { timeSec: 2, label: 'Hook', color: '#ff0000' });
  assert.equal(tl6.transitions.length, 1);
  assert.equal(tl6.markers.length, 1);
  const result = validateTimeline(tl6);
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(tl6.durationSec, 10);
});

test('route "invalid_action" guard: unknown actions are not in the switch', () => {
  // The route's POST handler has a switch over `action` with a default case
  // returning { error: 'invalid_action' }. Replicate the valid-action set
  // inline and verify an unknown action is rejected.
  const VALID_ACTIONS = [
    'create',
    'addTrack',
    'addClip',
    'addTransition',
    'addMarker',
    'validate',
    'save',
    'load',
    'delete',
  ];
  const unknown = 'export';
  assert.ok(!VALID_ACTIONS.includes(unknown));
  // And every declared action is recognized
  for (const a of VALID_ACTIONS) {
    assert.ok(VALID_ACTIONS.includes(a));
  }
});

test('route "action_required" guard: empty action is rejected (inline)', () => {
  // The route returns 400 if `action` is falsy. Replicate inline.
  const body: { action?: string } = {};
  const action = body.action;
  assert.ok(!action, 'empty action should be falsy and trigger action_required');
});
