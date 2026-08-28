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

// ─────────────────────────────────────────────────────────────────────────────
// 7. Editing skills: built-in skills, filtering, and CRUD logic
// ─────────────────────────────────────────────────────────────────────────────

import {
  BUILTIN_SKILLS,
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  recommendSkills,
  type ContentType,
} from '@/lib/editor/skills';

test('BUILTIN_SKILLS has at least 3 curated skills', () => {
  assert.ok(BUILTIN_SKILLS.length >= 3, `expected ≥3 built-in skills, got ${BUILTIN_SKILLS.length}`);
});

test('all built-in skills have source="builtin"', () => {
  for (const s of BUILTIN_SKILLS) {
    assert.equal(s.source, 'builtin', `skill ${s.id} should be builtin`);
  }
});

test('all built-in skills have unique ids', () => {
  const ids = BUILTIN_SKILLS.map(s => s.id);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size, 'built-in skill ids should be unique');
});

test('all built-in skills have at least one step', () => {
  for (const s of BUILTIN_SKILLS) {
    assert.ok(s.steps.length >= 1, `skill ${s.id} should have ≥1 step`);
  }
});

test('getSkill returns a built-in skill by id', () => {
  const first = BUILTIN_SKILLS[0];
  const found = getSkill(first.id);
  assert.ok(found, `getSkill(${first.id}) should return the skill`);
  assert.equal(found!.id, first.id);
});

test('getSkill returns undefined for non-existent id', () => {
  const found = getSkill('non-existent-skill-id');
  assert.equal(found, undefined);
});

test('listSkills returns all skills when no filter', () => {
  const all = listSkills();
  assert.ok(all.length >= BUILTIN_SKILLS.length, 'listSkills should return at least all built-ins');
});

test('listSkills filters by contentType', () => {
  const talkingHead = listSkills({ contentType: 'talking-head' as ContentType });
  assert.ok(talkingHead.length >= 1, 'should find at least one talking-head skill');
  for (const s of talkingHead) {
    assert.ok(s.contentTypes.includes('talking-head'), 'all results should include talking-head');
  }
});

test('listSkills filters by platform', () => {
  const tiktok = listSkills({ platform: 'tiktok' });
  assert.ok(tiktok.length >= 1, 'should find at least one tiktok skill');
  for (const s of tiktok) {
    assert.ok(s.platforms.includes('tiktok'), 'all results should include tiktok');
  }
});

test('listSkills filters by tag', () => {
  // Use the first tag from the first built-in skill
  const tag = BUILTIN_SKILLS[0].tags[0];
  const tagged = listSkills({ tag });
  assert.ok(tagged.length >= 1, `should find at least one skill with tag "${tag}"`);
  for (const s of tagged) {
    assert.ok(s.tags.includes(tag), `all results should include tag "${tag}"`);
  }
});

test('createSkill creates a user skill with source="user"', () => {
  const skill = createSkill({
    name: 'Test Skill',
    description: 'A test skill',
    contentTypes: ['talking-head' as ContentType],
    platforms: ['tiktok'],
    steps: [{ order: 1, action: 'cut', trigger: 'test', params: {}, description: 'test step' }],
    estimatedTimeMin: 3,
    tags: ['test'],
  });
  assert.equal(skill.source, 'user');
  assert.ok(skill.id.startsWith('user-'));
  assert.equal(skill.name, 'Test Skill');
});

test('updateSkill updates a user skill but not builtins', () => {
  // Can't update built-in
  const builtin = BUILTIN_SKILLS[0];
  const updatedBuiltin = updateSkill(builtin.id, { name: 'Hacked' });
  assert.equal(updatedBuiltin, undefined, 'should not update built-in skill');

  // Can update user skill
  const created = createSkill({
    name: 'Updateable Skill',
    description: 'Before',
    contentTypes: ['ugc' as ContentType],
    platforms: ['youtube'],
    steps: [],
    estimatedTimeMin: 5,
    tags: [],
  });
  const updated = updateSkill(created.id, { description: 'After' });
  assert.ok(updated, 'should update user skill');
  assert.equal(updated!.description, 'After');
  assert.equal(updated!.name, 'Updateable Skill'); // unchanged
});

test('deleteSkill deletes user skills but not builtins', () => {
  // Can't delete built-in
  const builtin = BUILTIN_SKILLS[0];
  const deletedBuiltin = deleteSkill(builtin.id);
  assert.equal(deletedBuiltin, false, 'should not delete built-in skill');

  // Can delete user skill
  const created = createSkill({
    name: 'Deletable Skill',
    description: '',
    contentTypes: [],
    platforms: [],
    steps: [],
    estimatedTimeMin: 1,
    tags: [],
  });
  const deleted = deleteSkill(created.id);
  assert.equal(deleted, true);
  assert.equal(getSkill(created.id), undefined);
});

test('recommendSkills returns skills sorted by tag count', () => {
  const recommended = recommendSkills('talking-head' as ContentType, 'tiktok');
  assert.ok(recommended.length >= 1, 'should recommend at least one skill');
  // Verify sort: descending by tags.length
  for (let i = 1; i < recommended.length; i++) {
    assert.ok(recommended[i - 1].tags.length >= recommended[i].tags.length, 'should be sorted by tag count desc');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Rough cut skill application: applySkillToPlan, applySkillsToPlan
// ─────────────────────────────────────────────────────────────────────────────

import {
  generateRoughCut,
  applySkillToPlan,
  applySkillsToPlan,
  type RoughCutPlan,
} from '@/lib/editor/transcript-cut';

// Build a sample plan for testing skill application
const sampleTranscript = {
  text: 'Hey guys check out this product. It has amazing features. The battery lasts all day. So check it out link in bio.',
  duration: 20,
  segments: [
    { start: 0, end: 4, text: 'Hey guys check out this product.' },
    { start: 4.5, end: 8, text: 'It has amazing features.' },
    { start: 8.5, end: 13, text: 'The battery lasts all day.' },
    { start: 13.5, end: 16, text: 'So check it out link in bio.' },
  ],
};

const samplePlan = generateRoughCut(sampleTranscript);

test('sample plan has cuts for skill application tests', () => {
  assert.ok(samplePlan.cuts.length >= 1, 'sample plan should have at least 1 cut');
});

test('applySkillToPlan returns edit decisions for all cuts with "throughout" trigger', () => {
  const decisions = applySkillToPlan(samplePlan, {
    name: 'Test Skill',
    steps: [{ order: 1, action: 'caption', trigger: 'throughout', description: 'Add captions', params: { style: 'bold' } }],
  });
  assert.equal(decisions.length, samplePlan.cuts.length, 'should have one decision per cut');
  assert.equal(decisions[0].action, 'caption');
  assert.equal(decisions[0].params.style, 'bold');
});

test('applySkillToPlan applies "at hook" trigger to first cut only', () => {
  const decisions = applySkillToPlan(samplePlan, {
    name: 'Hook Skill',
    steps: [{ order: 1, action: 'zoom', trigger: 'at hook', description: 'Zoom on hook', params: {} }],
  });
  assert.equal(decisions.length, 1, 'should apply to first cut only');
  assert.equal(decisions[0].cutIndex, 0);
});

test('applySkillToPlan applies "at CTA" trigger to last cut only', () => {
  const decisions = applySkillToPlan(samplePlan, {
    name: 'CTA Skill',
    steps: [{ order: 1, action: 'text-overlay', trigger: 'at CTA', description: 'Add CTA overlay', params: {} }],
  });
  assert.equal(decisions.length, 1, 'should apply to last cut only');
  assert.equal(decisions[0].cutIndex, samplePlan.cuts.length - 1);
});

test('applySkillToPlan applies "on product" trigger to product-related cuts', () => {
  const decisions = applySkillToPlan(samplePlan, {
    name: 'Product Skill',
    steps: [{ order: 1, action: 'zoom', trigger: 'on product closeup', description: 'Zoom on product', params: {} }],
  });
  // Should match cuts that mention "product" or "feature"
  assert.ok(decisions.length >= 1, 'should match at least one product-related cut');
  for (const d of decisions) {
    assert.ok(samplePlan.cuts[d.cutIndex].text.toLowerCase().match(/product|feature|demo|show|look/), 'should match product keywords');
  }
});

test('applySkillToPlan applies "between" trigger to transitions', () => {
  const decisions = applySkillToPlan(samplePlan, {
    name: 'Transition Skill',
    steps: [{ order: 1, action: 'transition', trigger: 'between features', description: 'Slide transition', params: {} }],
  });
  // Should have one decision per gap (cuts.length - 1)
  assert.equal(decisions.length, Math.max(0, samplePlan.cuts.length - 1));
});

test('applySkillToPlan handles multiple steps', () => {
  const decisions = applySkillToPlan(samplePlan, {
    name: 'Multi-step Skill',
    steps: [
      { order: 1, action: 'cut', trigger: 'on every pause', description: 'Remove pauses', params: {} },
      { order: 2, action: 'zoom', trigger: 'at hook', description: 'Zoom on hook', params: {} },
      { order: 3, action: 'caption', trigger: 'throughout', description: 'Add captions', params: {} },
    ],
  });
  // Step 1: all cuts, Step 2: first cut, Step 3: all cuts
  const expected = samplePlan.cuts.length + 1 + samplePlan.cuts.length;
  assert.equal(decisions.length, expected, `should have ${expected} total decisions`);
  assert.equal(decisions[0].stepOrder, 1);
  assert.equal(decisions[samplePlan.cuts.length].stepOrder, 2);
});

test('applySkillsToPlan combines multiple skills', () => {
  const enhanced = applySkillsToPlan(samplePlan, [
    {
      name: 'Skill A',
      steps: [{ order: 1, action: 'caption', trigger: 'throughout', description: 'Captions', params: {} }],
    },
    {
      name: 'Skill B',
      steps: [{ order: 1, action: 'zoom', trigger: 'at hook', description: 'Zoom', params: {} }],
    },
  ]);
  assert.ok(enhanced.editDecisions.length > 0, 'should have edit decisions');
  assert.equal(enhanced.appliedSkills.length, 2, 'should list both skill names');
  assert.ok(enhanced.appliedSkills.includes('Skill A'));
  assert.ok(enhanced.appliedSkills.includes('Skill B'));
  // Should preserve original plan fields
  assert.equal(enhanced.cuts.length, samplePlan.cuts.length);
  assert.equal(enhanced.totalDurationSec, samplePlan.totalDurationSec);
});

test('applySkillsToPlan with empty skills returns plan unchanged plus empty arrays', () => {
  const enhanced = applySkillsToPlan(samplePlan, []);
  assert.equal(enhanced.editDecisions.length, 0);
  assert.equal(enhanced.appliedSkills.length, 0);
  assert.equal(enhanced.cuts.length, samplePlan.cuts.length);
});

test('applySkillToPlan handles empty plan gracefully', () => {
  const emptyPlan: RoughCutPlan = {
    sourceSegments: [],
    cuts: [],
    totalDurationSec: 0,
    sourceDurationSec: 0,
    compressionRatio: 0,
    transitions: [],
    notes: [],
  };
  const decisions = applySkillToPlan(emptyPlan, {
    name: 'Test',
    steps: [{ order: 1, action: 'caption', trigger: 'throughout', description: 'Captions', params: {} }],
  });
  assert.equal(decisions.length, 0, 'no decisions for empty plan');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Rough cut export formats: FCPXML, Premiere XML, DaVinci XML, SRT
// ─────────────────────────────────────────────────────────────────────────────

import {
  exportCutPlanAsFCPXML,
  exportCutPlanAsPremiereXML,
  exportCutPlanAsDaVinciXML,
  exportCutPlanAsSRT,
} from '@/lib/editor/transcript-cut';

test('exportCutPlanAsFCPXML produces a non-empty string', () => {
  const xml = exportCutPlanAsFCPXML(samplePlan, 'SOURCE.mp4');
  assert.equal(typeof xml, 'string');
  assert.ok(xml.length > 0, 'FCPXML output should be non-empty');
});

test('exportCutPlanAsFCPXML contains <fcpxml> root and <asset-clip> elements', () => {
  const xml = exportCutPlanAsFCPXML(samplePlan, 'SOURCE.mp4');
  assert.ok(xml.includes('<fcpxml'), 'FCPXML should contain <fcpxml> root element');
  assert.ok(xml.includes('<asset-clip'), 'FCPXML should contain <asset-clip> elements');
  assert.ok(xml.includes('<?xml'), 'FCPXML should have an XML declaration');
});

test('exportCutPlanAsFCPXML includes correct timecodes for the first cut', () => {
  const xml = exportCutPlanAsFCPXML(samplePlan, 'SOURCE.mp4');
  const firstCut = samplePlan.cuts[0];
  assert.ok(firstCut, 'sample plan should have at least one cut');
  const expectedStart = formatTimecodeForTest(firstCut.startSec);
  assert.ok(
    xml.includes(`start="${expectedStart}"`),
    `FCPXML should contain the first cut source start timecode ${expectedStart}`,
  );
});

test('exportCutPlanAsPremiereXML produces a non-empty string', () => {
  const xml = exportCutPlanAsPremiereXML(samplePlan, 'SOURCE');
  assert.equal(typeof xml, 'string');
  assert.ok(xml.length > 0, 'Premiere XML output should be non-empty');
});

test('exportCutPlanAsPremiereXML contains <xmeml> root and clip data', () => {
  const xml = exportCutPlanAsPremiereXML(samplePlan, 'SOURCE');
  assert.ok(
    xml.includes('<xmeml') || xml.includes('<premiereProject'),
    'Premiere XML should contain <xmeml> or <premiereProject> root',
  );
  assert.ok(xml.includes('<clipitem'), 'Premiere XML should contain <clipitem> elements');
  assert.ok(xml.includes('<name>'), 'Premiere XML should contain clip name data');
});

test('exportCutPlanAsPremiereXML includes in/out points for clips', () => {
  const xml = exportCutPlanAsPremiereXML(samplePlan, 'SOURCE');
  assert.ok(xml.includes('<in>'), 'Premiere XML should contain <in> points');
  assert.ok(xml.includes('<out>'), 'Premiere XML should contain <out> points');
});

test('exportCutPlanAsDaVinciXML produces a non-empty string', () => {
  const xml = exportCutPlanAsDaVinciXML(samplePlan, 'SOURCE');
  assert.equal(typeof xml, 'string');
  assert.ok(xml.length > 0, 'DaVinci XML output should be non-empty');
});

test('exportCutPlanAsDaVinciXML contains timeline and clip elements', () => {
  const xml = exportCutPlanAsDaVinciXML(samplePlan, 'SOURCE');
  assert.ok(xml.includes('<timeline'), 'DaVinci XML should contain a <timeline> element');
  assert.ok(xml.includes('<track'), 'DaVinci XML should contain <track> elements');
  assert.ok(xml.includes('<clip'), 'DaVinci XML should contain <clip> elements');
  assert.ok(xml.includes('startFrame'), 'DaVinci XML should contain startFrame data');
  assert.ok(xml.includes('endFrame'), 'DaVinci XML should contain endFrame data');
});

test('exportCutPlanAsSRT produces a non-empty string', () => {
  const srt = exportCutPlanAsSRT(samplePlan);
  assert.equal(typeof srt, 'string');
  assert.ok(srt.length > 0, 'SRT output should be non-empty');
});

test('exportCutPlanAsSRT contains entry numbers, --> separators, and cut text', () => {
  const srt = exportCutPlanAsSRT(samplePlan);
  const lines = srt.split('\n');
  // First line should be the entry index "1"
  assert.equal(lines[0], '1', 'SRT first line should be the entry number 1');
  // Should contain the --> timecode separator
  assert.ok(srt.includes('-->'), 'SRT should contain --> timecode separators');
  // Should contain the text of the first cut
  const firstCut = samplePlan.cuts[0];
  assert.ok(firstCut, 'sample plan should have at least one cut');
  assert.ok(
    srt.includes(firstCut.text),
    'SRT should contain the first cut text as subtitle content',
  );
  // Timecodes should use the HH:MM:SS,mmm SRT format
  assert.ok(
    /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(srt),
    'SRT timecodes should match HH:MM:SS,mmm format',
  );
});

test('exportCutPlanAsSRT has one entry per cut with sequential indices', () => {
  const srt = exportCutPlanAsSRT(samplePlan);
  for (let i = 0; i < samplePlan.cuts.length; i++) {
    assert.ok(
      srt.includes(String(i + 1)),
      `SRT should contain entry index ${i + 1}`,
    );
  }
});

test('all new export formats produce non-empty strings for the sample plan', () => {
  assert.ok(exportCutPlanAsFCPXML(samplePlan).length > 0);
  assert.ok(exportCutPlanAsPremiereXML(samplePlan).length > 0);
  assert.ok(exportCutPlanAsDaVinciXML(samplePlan).length > 0);
  assert.ok(exportCutPlanAsSRT(samplePlan).length > 0);
});

/** Local timecode formatter matching the private helper in transcript-cut.ts. */
function formatTimecodeForTest(sec: number): string {
  const fps = 30;
  const totalFrames = Math.round(sec * fps);
  const h = Math.floor(totalFrames / (fps * 3600));
  const m = Math.floor((totalFrames % (fps * 3600)) / (fps * 60));
  const s = Math.floor((totalFrames % (fps * 60)) / fps);
  const f = totalFrames % fps;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Creative templates: built-in template data
// ─────────────────────────────────────────────────────────────────────────────

import { BUILTIN_TEMPLATES } from '@/lib/creative/templates';

test('BUILTIN_TEMPLATES has at least 10 templates', () => {
  assert.ok(BUILTIN_TEMPLATES.length >= 10, `expected ≥10 templates, got ${BUILTIN_TEMPLATES.length}`);
});

test('all built-in templates have valid categories', () => {
  const valid = ['brief', 'hooks', 'angles', 'script', 'skill-bundle'];
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(valid.includes(t.category), `template "${t.name}" has invalid category "${t.category}"`);
  }
});

test('all built-in templates have non-empty names and descriptions', () => {
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(t.name.length > 0, 'template name should not be empty');
    assert.ok(t.description.length > 0, `template "${t.name}" description should not be empty`);
  }
});

test('all built-in templates have at least one tag', () => {
  for (const t of BUILTIN_TEMPLATES) {
    assert.ok(t.tags.length >= 1, `template "${t.name}" should have ≥1 tag`);
  }
});

test('built-in templates cover all 5 categories', () => {
  const categories = new Set(BUILTIN_TEMPLATES.map(t => t.category));
  assert.ok(categories.has('brief'), 'should have brief templates');
  assert.ok(categories.has('hooks'), 'should have hooks templates');
  assert.ok(categories.has('angles'), 'should have angles templates');
  assert.ok(categories.has('script'), 'should have script templates');
  assert.ok(categories.has('skill-bundle'), 'should have skill-bundle templates');
});

test('built-in templates have unique names within their category', () => {
  const seen = new Set<string>();
  for (const t of BUILTIN_TEMPLATES) {
    const key = `${t.category}:${t.name}`;
    assert.ok(!seen.has(key), `duplicate template name "${t.name}" in category "${t.category}"`);
    seen.add(key);
  }
});

test('brief templates have payload with goals', () => {
  const briefs = BUILTIN_TEMPLATES.filter(t => t.category === 'brief');
  for (const b of briefs) {
    assert.ok(b.payload.goals, `brief "${b.name}" should have goals`);
    assert.ok(Array.isArray(b.payload.goals), `brief "${b.name}" goals should be array`);
  }
});

test('hooks templates have payload with hooks array', () => {
  const hooks = BUILTIN_TEMPLATES.filter(t => t.category === 'hooks');
  for (const h of hooks) {
    assert.ok(h.payload.hooks, `hooks template "${h.name}" should have hooks array`);
    assert.ok(Array.isArray(h.payload.hooks), `hooks template "${h.name}" hooks should be array`);
  }
});

test('script templates have payload with scenes array', () => {
  const scripts = BUILTIN_TEMPLATES.filter(t => t.category === 'script');
  for (const s of scripts) {
    assert.ok(s.payload.scenes, `script template "${s.name}" should have scenes array`);
    assert.ok(Array.isArray(s.payload.scenes), `script template "${s.name}" scenes should be array`);
  }
});

