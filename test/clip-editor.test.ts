import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIP_EDITOR_COST,
  parseTimecode,
  formatTimecode,
  createClip,
  calculateTotalDuration,
  reindexTimeline,
  parseCommand,
  executeOperation,
  describeOperation,
  validateClipEditorRequest,
  type Clip,
  type ClipType,
  type OperationType,
} from '../src/lib/creative/clip-editor.ts';

describe('clip-editor', () => {
  describe('types', () => {
    test('ClipType has 6 types', () => {
      const types: ClipType[] = ['video', 'audio', 'image', 'text', 'transition', 'effect'];
      assert.equal(types.length, 6);
    });

    test('OperationType has 10 types', () => {
      const ops: OperationType[] = ['trim', 'split', 'delete', 'reorder', 'add', 'speed', 'volume', 'merge', 'duplicate', 'label'];
      assert.equal(ops.length, 10);
    });
  });

  describe('parseTimecode', () => {
    test('parses bare seconds "90"', () => {
      assert.equal(parseTimecode('90'), 90);
    });

    test('parses seconds with s suffix "15s"', () => {
      assert.equal(parseTimecode('15s'), 15);
    });

    test('parses decimal seconds "1.5s"', () => {
      assert.equal(parseTimecode('1.5s'), 1.5);
    });

    test('parses MM:SS format "0:15"', () => {
      assert.equal(parseTimecode('0:15'), 15);
    });

    test('parses MM:SS.mmm format "1:23.456"', () => {
      assert.equal(parseTimecode('1:23.456'), 83.456);
    });

    test('parses 1m30s format', () => {
      assert.equal(parseTimecode('1m30s'), 90);
    });

    test('parses 2m format', () => {
      assert.equal(parseTimecode('2m'), 120);
    });

    test('parses HH:MM:SS format "1:23:45"', () => {
      assert.equal(parseTimecode('1:23:45'), 5025);
    });

    test('returns 0 for empty string', () => {
      assert.equal(parseTimecode(''), 0);
    });

    test('returns 0 for invalid format', () => {
      assert.equal(parseTimecode('abc'), 0);
    });
  });

  describe('formatTimecode', () => {
    test('formats 0 as 00:00.000', () => {
      assert.equal(formatTimecode(0), '00:00.000');
    });

    test('formats 15 as 00:15.000', () => {
      assert.equal(formatTimecode(15), '00:15.000');
    });

    test('formats 83.456 as 01:23.456', () => {
      assert.equal(formatTimecode(83.456), '01:23.456');
    });

    test('formats 90 as 01:30.000', () => {
      assert.equal(formatTimecode(90), '01:30.000');
    });

    test('handles negative seconds', () => {
      assert.equal(formatTimecode(-5), '00:00.000');
    });
  });

  describe('createClip', () => {
    test('creates a clip with defaults', () => {
      const clip = createClip();
      assert.ok(clip.id);
      assert.equal(clip.type, 'video');
      assert.equal(clip.duration, 5);
      assert.equal(clip.startTime, 0);
      assert.equal(clip.endTime, 5);
    });

    test('creates a clip with partial overrides', () => {
      const clip = createClip({ name: 'Test', type: 'audio', duration: 10 });
      assert.equal(clip.name, 'Test');
      assert.equal(clip.type, 'audio');
      assert.equal(clip.duration, 10);
    });
  });

  describe('calculateTotalDuration', () => {
    test('sums clip durations', () => {
      const clips = [
        createClip({ duration: 5 }),
        createClip({ duration: 10 }),
        createClip({ duration: 3 }),
      ];
      assert.equal(calculateTotalDuration(clips), 18);
    });

    test('returns 0 for empty array', () => {
      assert.equal(calculateTotalDuration([]), 0);
    });
  });

  describe('reindexTimeline', () => {
    test('makes clips sequential', () => {
      const clips = [
        createClip({ id: 'a', duration: 5, startTime: 100, endTime: 105 }),
        createClip({ id: 'b', duration: 3, startTime: 200, endTime: 203 }),
      ];
      const reindexed = reindexTimeline(clips);
      assert.equal(reindexed[0].startTime, 0);
      assert.equal(reindexed[0].endTime, 5);
      assert.equal(reindexed[1].startTime, 5);
      assert.equal(reindexed[1].endTime, 8);
    });
  });

  describe('parseCommand', () => {
    test('parses "trim first 2 seconds"', () => {
      const result = parseCommand('trim first 2 seconds');
      assert.equal(result.operation.type, 'trim');
      assert.equal(result.operation.params.position, 'start');
      assert.equal(result.operation.params.amount, 2);
      assert.equal(result.confidence, 1.0);
    });

    test('parses "trim last 1.5s"', () => {
      const result = parseCommand('trim last 1.5s');
      assert.equal(result.operation.type, 'trim');
      assert.equal(result.operation.params.position, 'end');
      assert.equal(result.operation.params.amount, 1.5);
    });

    test('parses "trim clip 3 to 5 seconds"', () => {
      const result = parseCommand('trim clip 3 to 5 seconds');
      assert.equal(result.operation.type, 'trim');
      assert.equal(result.operation.params.clipIndex, 2);
      assert.equal(result.operation.params.targetDuration, 5);
    });

    test('parses "split at 0:15"', () => {
      const result = parseCommand('split at 0:15');
      assert.equal(result.operation.type, 'split');
      assert.equal(result.operation.params.at, 15);
    });

    test('parses "split clip 2 at 0:15"', () => {
      const result = parseCommand('split clip 2 at 0:15');
      assert.equal(result.operation.type, 'split');
      assert.equal(result.operation.params.clipIndex, 1);
      assert.equal(result.operation.params.at, 15);
    });

    test('parses "delete clip 3"', () => {
      const result = parseCommand('delete clip 3');
      assert.equal(result.operation.type, 'delete');
      assert.equal(result.operation.params.clipIndex, 2);
    });

    test('parses "remove the last clip"', () => {
      const result = parseCommand('remove the last clip');
      assert.equal(result.operation.type, 'delete');
      assert.equal(result.operation.params.position, 'last');
    });

    test('parses "delete clips 2-4"', () => {
      const result = parseCommand('delete clips 2-4');
      assert.equal(result.operation.type, 'delete');
      assert.equal(result.operation.params.rangeStart, 1);
      assert.equal(result.operation.params.rangeEnd, 3);
    });

    test('parses "move clip 5 to position 2"', () => {
      const result = parseCommand('move clip 5 to position 2');
      assert.equal(result.operation.type, 'reorder');
      assert.equal(result.operation.params.fromIndex, 4);
      assert.equal(result.operation.params.toIndex, 1);
    });

    test('parses "swap clips 1 and 3"', () => {
      const result = parseCommand('swap clips 1 and 3');
      assert.equal(result.operation.type, 'reorder');
      assert.equal(result.operation.params.swap, true);
      assert.equal(result.operation.params.indexA, 0);
      assert.equal(result.operation.params.indexB, 2);
    });

    test('parses "merge all clips"', () => {
      const result = parseCommand('merge all clips');
      assert.equal(result.operation.type, 'merge');
      assert.equal(result.operation.params.all, true);
    });

    test('parses "duplicate clip 3"', () => {
      const result = parseCommand('duplicate clip 3');
      assert.equal(result.operation.type, 'duplicate');
      assert.equal(result.operation.params.clipIndex, 2);
    });

    test('parses "speed up clip 2 by 2x"', () => {
      const result = parseCommand('speed up clip 2 by 2x');
      assert.equal(result.operation.type, 'speed');
      assert.equal(result.operation.params.clipIndex, 1);
      assert.equal(result.operation.params.factor, 2);
    });

    test('parses "mute clip 2"', () => {
      const result = parseCommand('mute clip 2');
      assert.equal(result.operation.type, 'volume');
      assert.equal(result.operation.params.clipIndex, 1);
      assert.equal(result.operation.params.level, 0);
    });

    test('parses label command', () => {
      const result = parseCommand("label clip 2 as 'Product Demo'");
      assert.equal(result.operation.type, 'label');
      assert.equal(result.operation.params.clipIndex, 1);
      assert.equal(result.operation.params.label, 'Product Demo');
    });

    test('returns confidence 0 for unknown command', () => {
      const result = parseCommand('do something weird');
      assert.equal(result.confidence, 0);
    });
  });

  describe('executeOperation', () => {
    test('trims first 2 seconds from all clips', () => {
      const clips = [createClip({ id: 'a', duration: 5, startTime: 0, endTime: 5 })];
      const result = executeOperation(clips, { type: 'trim', params: { position: 'start', amount: 2 } });
      assert.equal(result[0].duration, 3);
    });

    test('trims specific clip to target duration', () => {
      const clips = [
        createClip({ id: 'a', duration: 5, startTime: 0, endTime: 5 }),
        createClip({ id: 'b', duration: 10, startTime: 5, endTime: 15 }),
      ];
      const result = executeOperation(clips, { type: 'trim', params: { clipIndex: 1, targetDuration: 3 } });
      assert.equal(result[1].duration, 3);
    });

    test('splits a clip at given time', () => {
      const clips = [createClip({ id: 'a', name: 'Test', duration: 10, startTime: 0, endTime: 10 })];
      const result = executeOperation(clips, { type: 'split', params: { at: 4 } });
      assert.equal(result.length, 2);
      assert.equal(result[0].duration, 4);
      assert.equal(result[1].duration, 6);
    });

    test('deletes a clip by index', () => {
      const clips = [
        createClip({ id: 'a', duration: 5 }),
        createClip({ id: 'b', duration: 5 }),
        createClip({ id: 'c', duration: 5 }),
      ];
      const result = executeOperation(clips, { type: 'delete', params: { clipIndex: 1 } });
      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'a');
      assert.equal(result[1].id, 'c');
    });

    test('deletes the last clip', () => {
      const clips = [
        createClip({ id: 'a', duration: 5 }),
        createClip({ id: 'b', duration: 5 }),
      ];
      const result = executeOperation(clips, { type: 'delete', params: { position: 'last' } });
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'a');
    });

    test('reorders clips by moving', () => {
      const clips = [
        createClip({ id: 'a', duration: 5 }),
        createClip({ id: 'b', duration: 5 }),
        createClip({ id: 'c', duration: 5 }),
      ];
      const result = executeOperation(clips, { type: 'reorder', params: { fromIndex: 2, toIndex: 0 } });
      assert.equal(result[0].id, 'c');
      assert.equal(result[1].id, 'a');
      assert.equal(result[2].id, 'b');
    });

    test('swaps two clips', () => {
      const clips = [
        createClip({ id: 'a', duration: 5 }),
        createClip({ id: 'b', duration: 5 }),
      ];
      const result = executeOperation(clips, { type: 'reorder', params: { swap: true, indexA: 0, indexB: 1 } });
      assert.equal(result[0].id, 'b');
      assert.equal(result[1].id, 'a');
    });

    test('merges all clips', () => {
      const clips = [
        createClip({ id: 'a', duration: 5 }),
        createClip({ id: 'b', duration: 10 }),
        createClip({ id: 'c', duration: 3 }),
      ];
      const result = executeOperation(clips, { type: 'merge', params: { all: true } });
      assert.equal(result.length, 1);
      assert.equal(result[0].duration, 18);
    });

    test('duplicates a clip', () => {
      const clips = [
        createClip({ id: 'a', duration: 5 }),
        createClip({ id: 'b', duration: 5 }),
      ];
      const result = executeOperation(clips, { type: 'duplicate', params: { clipIndex: 0 } });
      assert.equal(result.length, 3);
      assert.equal(result[0].id, 'a');
      assert.notEqual(result[1].id, 'a');
      assert.equal(result[1].name.includes('copy'), true);
    });

    test('labels a clip', () => {
      const clips = [createClip({ id: 'a', duration: 5, label: '' })];
      const result = executeOperation(clips, { type: 'label', params: { clipIndex: 0, label: 'Demo' } });
      assert.equal(result[0].label, 'Demo');
    });

    test('speeds up a clip', () => {
      const clips = [createClip({ id: 'a', duration: 10, startTime: 0, endTime: 10 })];
      const result = executeOperation(clips, { type: 'speed', params: { clipIndex: 0, factor: 2 } });
      assert.equal(result[0].duration, 5);
    });
  });

  describe('describeOperation', () => {
    test('describes trim operation', () => {
      const desc = describeOperation({ type: 'trim', params: { position: 'start', amount: 2 } });
      assert.ok(desc.includes('Trimmed'));
      assert.ok(desc.includes('2'));
    });

    test('describes split operation', () => {
      const desc = describeOperation({ type: 'split', params: { at: 15 } });
      assert.ok(desc.includes('Split'));
    });

    test('describes delete operation', () => {
      const desc = describeOperation({ type: 'delete', params: { clipIndex: 2 } });
      assert.ok(desc.includes('Deleted'));
      assert.ok(desc.includes('3'));
    });

    test('describes merge all operation', () => {
      const desc = describeOperation({ type: 'merge', params: { all: true } });
      assert.ok(desc.includes('Merged all'));
    });
  });

  describe('validateClipEditorRequest', () => {
    test('validates valid request', () => {
      const result = validateClipEditorRequest({ command: 'trim first 2 seconds', clips: [] });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    test('rejects empty command', () => {
      const result = validateClipEditorRequest({ command: '', clips: [] });
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test('rejects missing clips array', () => {
      const result = validateClipEditorRequest({ command: 'test', clips: undefined as unknown as Clip[] });
      assert.equal(result.valid, false);
    });

    test('rejects too many clips', () => {
      const manyClips = Array.from({ length: 101 }, () => createClip());
      const result = validateClipEditorRequest({ command: 'test', clips: manyClips });
      assert.equal(result.valid, false);
    });

    test('rejects command too long', () => {
      const result = validateClipEditorRequest({ command: 'a'.repeat(501), clips: [] });
      assert.equal(result.valid, false);
    });
  });

  describe('CLIP_EDITOR_COST', () => {
    test('cost is 4 credits', () => {
      assert.equal(CLIP_EDITOR_COST, 4);
    });
  });
});
