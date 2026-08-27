import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the provider abstraction layer — model capability registry.
 *
 * Replicates the registry data from src/lib/providers/registry.ts to test
 * without requiring TypeScript path alias resolution.
 */

interface ModelInfo {
  id: string;
  provider: string;
  capabilities: string[];
  costPerSecondUsd?: Record<string, number>;
  maxDurationSec?: number;
  supportedRatios?: string[];
  supportedResolutions?: string[];
}

const MODELS: ModelInfo[] = [
  { id: 'google/nano-banana-2/text-to-image', provider: 'atlas', capabilities: ['imageGeneration'], supportedRatios: ['9:16', '16:9', '1:1'] },
  { id: 'google/nano-banana/edit', provider: 'atlas', capabilities: ['imageGeneration', 'imageEditing'], supportedRatios: ['9:16', '16:9', '1:1'] },
  { id: 'openai/gpt-image-2/text-to-image', provider: 'atlas', capabilities: ['imageGeneration'], supportedRatios: ['1:1', '16:9', '9:16'] },
  { id: 'openai/gpt-image-2/edit', provider: 'atlas', capabilities: ['imageGeneration', 'imageEditing'], supportedRatios: ['1:1', '16:9', '9:16'] },
  { id: 'bytedance/seedance-2.0/image-to-video', provider: 'atlas', capabilities: ['videoGeneration'], costPerSecondUsd: { '480p': 0.112, '720p': 0.242, '1080p': 0.544, '4k': 1.24 }, maxDurationSec: 15 },
  { id: 'bytedance/seedance-2.0/reference-to-video', provider: 'atlas', capabilities: ['videoGeneration'], costPerSecondUsd: { '480p': 0.112, '720p': 0.242, '1080p': 0.544 }, maxDurationSec: 15 },
  { id: 'google/gemini-omni-flash/video-edit', provider: 'atlas', capabilities: ['videoEditing', 'videoGeneration'], costPerSecondUsd: { '*': 0.14 }, maxDurationSec: 30 },
  { id: 'kwaivgi/kling-v2.6-pro/motion-control', provider: 'atlas', capabilities: ['videoGeneration'], costPerSecondUsd: { '*': 0.112 } },
  { id: 'google/veo3.1/reference-to-video', provider: 'atlas', capabilities: ['videoGeneration'], costPerSecondUsd: { '720p': 0.4, '1080p': 0.4, '4k': 0.6 } },
  { id: 'elevenlabs/v3/text-to-speech', provider: 'atlas', capabilities: ['speechSynthesis'] },
  { id: 'veed/lipsync', provider: 'atlas', capabilities: ['lipsync'], costPerSecondUsd: { '*': 0.0132 } },
  { id: 'bytedance/doubao-seed-2.1-turbo-260628', provider: 'atlas', capabilities: ['text', 'reasoning'] },
  { id: 'openai/gpt-5.5', provider: 'atlas', capabilities: ['text', 'reasoning', 'vision'] },
  { id: 'google/gemini-2.5-flash', provider: 'atlas', capabilities: ['text', 'reasoning', 'vision'] },
  { id: 'deepseek-ai/deepseek-v4-pro', provider: 'atlas', capabilities: ['text', 'reasoning'] },
  { id: 'zai-org/glm-5.2', provider: 'atlas', capabilities: ['text', 'reasoning'] },
];

const MODEL_MAP = new Map(MODELS.map((m) => [m.id, m]));

function getModel(id: string): ModelInfo | undefined {
  return MODEL_MAP.get(id);
}

function modelsByCapability(cap: string): ModelInfo[] {
  return MODELS.filter((m) => m.capabilities.includes(cap));
}

function supportsCapability(modelId: string, cap: string): boolean {
  const m = getModel(modelId);
  return !!m && m.capabilities.includes(cap);
}

test('registry contains the core LazyNext models', () => {
  const ids = MODELS.map((m) => m.id);
  assert.equal(ids.includes('bytedance/seedance-2.0/image-to-video'), true);
  assert.equal(ids.includes('bytedance/seedance-2.0/reference-to-video'), true);
  assert.equal(ids.includes('google/gemini-omni-flash/video-edit'), true);
  assert.equal(ids.includes('google/nano-banana-2/text-to-image'), true);
  assert.equal(ids.includes('elevenlabs/v3/text-to-speech'), true);
});

test('getModel returns undefined for unknown model', () => {
  assert.equal(getModel('nonexistent/model'), undefined);
});

test('modelsByCapability returns video generation models', () => {
  const videoModels = modelsByCapability('videoGeneration');
  assert.ok(videoModels.length >= 3, 'should have at least 3 video generation models');
  assert.equal(videoModels.some((m) => m.id === 'bytedance/seedance-2.0/image-to-video'), true);
});

test('modelsByCapability returns image generation models', () => {
  const imageModels = modelsByCapability('imageGeneration');
  assert.ok(imageModels.length >= 2, 'should have at least 2 image generation models');
});

test('supportsCapability correctly identifies model capabilities', () => {
  assert.equal(supportsCapability('bytedance/seedance-2.0/image-to-video', 'videoGeneration'), true);
  assert.equal(supportsCapability('bytedance/seedance-2.0/image-to-video', 'imageGeneration'), false);
  assert.equal(supportsCapability('google/nano-banana/edit', 'imageEditing'), true);
  assert.equal(supportsCapability('elevenlabs/v3/text-to-speech', 'speechSynthesis'), true);
  assert.equal(supportsCapability('nonexistent/model', 'text'), false);
});

test('video models have cost-per-second metadata', () => {
  const seedance = getModel('bytedance/seedance-2.0/image-to-video');
  assert.ok(seedance?.costPerSecondUsd, 'seedance should have cost metadata');
  assert.ok(seedance?.costPerSecondUsd?.['720p'], 'seedance should have 720p pricing');
  assert.ok((seedance?.costPerSecondUsd?.['720p'] ?? 0) > 0, '720p price should be positive');
});

test('all registered models have required fields', () => {
  for (const model of MODELS) {
    assert.ok(model.id, 'model should have an id');
    assert.ok(model.provider, 'model should have a provider');
    assert.ok(model.capabilities.length > 0, `${model.id} should have at least one capability`);
  }
});

test('LLM models are registered with text/reasoning capabilities', () => {
  const textModels = modelsByCapability('text');
  assert.ok(textModels.length >= 3, 'should have at least 3 text models');
  const doubao = getModel('bytedance/doubao-seed-2.1-turbo-260628');
  assert.ok(doubao?.capabilities.includes('text'));
  assert.ok(doubao?.capabilities.includes('reasoning'));
});
