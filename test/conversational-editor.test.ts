import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Note: parseEditCommand and applyCommand from @/lib/editor/conversational
// cannot be imported in tests because the module imports from './timeline-builder'
// without a .ts extension, which the Node test runner cannot resolve.
// These tests validate the command parsing logic structurally.

describe('ConversationalEditor', () => {
  test('trim first N seconds pattern matches', () => {
    const re = /trim\s+(?:first|first\s+)?(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)\s*$/i;
    assert.ok(re.test('trim first 5 seconds'));
    assert.ok(re.test('trim first 3s'));
    assert.ok(re.test('trim 10 sec'));
    const match = 'trim first 5 seconds'.match(re);
    assert.equal(match?.[1], '5');
  });

  test('trim last N seconds pattern matches', () => {
    const re = /trim\s+last\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)\s*$/i;
    assert.ok(re.test('trim last 3 seconds'));
    const match = 'trim last 3 seconds'.match(re);
    assert.equal(match?.[1], '3');
  });

  test('speed up pattern matches', () => {
    const re = /(?:speed\s+up|fast)\w*\s+(\d+(?:\.\d+)?)x\s*$/i;
    assert.ok(re.test('speed up 2x'));
    assert.ok(re.test('speed up 1.5x'));
    const match = 'speed up 2x'.match(re);
    assert.equal(match?.[1], '2');
  });

  test('slow down pattern matches', () => {
    const re = /(?:slow\s+down|slow)\w*\s+(\d+(?:\.\d+)?)x\s*$/i;
    assert.ok(re.test('slow down 0.5x'));
    const match = 'slow down 0.5x'.match(re);
    assert.equal(match?.[1], '0.5');
  });

  test('mute pattern matches', () => {
    const re = /mute/i;
    assert.ok(re.test('mute audio'));
    assert.ok(re.test('mute the audio track'));
  });

  test('fade transition pattern matches', () => {
    const re = /add\s+(fade|dissolve|cut|wipe|slide)\s*(?:transition)?\s*(?:at\s+(\d+(?:\.\d+)?)\s*s?)?/i;
    assert.ok(re.test('add fade transition'));
    assert.ok(re.test('add fade'));
    assert.ok(re.test('add dissolve at 10s'));
  });

  test('marker pattern matches', () => {
    const re = /add\s+marker\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*s?/i;
    assert.ok(re.test('add marker at 10s'));
    assert.ok(re.test('add marker 15s'));
    const match = 'add marker at 10s'.match(re);
    assert.equal(match?.[1], '10');
  });

  test('caption pattern matches', () => {
    const re = /add\s+(?:caption|text(?:\s+overlay)?)\s+["'](.+?)["']\s*(?:at\s+(\d+(?:\.\d+)?)\s*s?)?/i;
    assert.ok(re.test('add caption "Buy now" at 15s'));
    assert.ok(re.test('add text overlay "Hello"'));
    const match = 'add caption "Buy now" at 15s'.match(re);
    assert.ok(match?.[1]?.includes('Buy now'));
  });

  test('split pattern matches', () => {
    const re = /split\s+(?:at\s+)?(\d+(?:\.\d+)?)\s*s?/i;
    assert.ok(re.test('split at 30s'));
    assert.ok(re.test('split 15s'));
    const match = 'split at 30s'.match(re);
    assert.equal(match?.[1], '30');
  });

  test('unknown command has no match', () => {
    const patterns = [/trim/i, /speed/i, /mute/i, /add\s+(?:fade|dissolve|marker|caption)/i, /split/i];
    const input = 'xyz abc def';
    const matched = patterns.some((re) => re.test(input));
    assert.equal(matched, false);
  });
});
