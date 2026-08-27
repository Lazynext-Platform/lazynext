// Test that the alias loader resolves @/ imports correctly.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// This import uses the @/ alias — if the loader works, it resolves.
import { atlasImage } from '@/lib/providers/atlas-image';
import { atlasVideo } from '@/lib/providers/atlas-video';
import { atlasTTS, atlasASR } from '@/lib/providers/atlas-audio';

test('alias loader resolves @/lib/providers imports', () => {
  assert.equal(typeof atlasImage.generate, 'function');
  assert.equal(typeof atlasVideo.generate, 'function');
  assert.equal(typeof atlasTTS.synthesize, 'function');
  assert.equal(typeof atlasASR.transcribe, 'function');
});

test('atlasImage has correct provider id', () => {
  assert.equal(atlasImage.id, 'atlas');
});

test('atlasASR has correct provider id', () => {
  assert.equal(atlasASR.id, 'atlas');
});
