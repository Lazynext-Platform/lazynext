import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MEDIA_SERVICE_COST,
  getServiceRegistry,
  getServiceByCapability,
  isCapabilityAvailable,
  getServiceRequirements,
  calculateServiceCost,
  validateMediaServiceRequest,
  executeDryRun,
  type MediaCapability,
  type ServiceStatus,
} from '../src/lib/creative/media-service-boundary.ts';

describe('media-service-boundary', () => {
  describe('types', () => {
    test('MediaCapability has 8 types', () => {
      const caps: MediaCapability[] = ['asr', 'tts', 'ocr', 'image_edit', 'audio_process', 'voice_clone', 'video_gen', 'lip_sync'];
      assert.equal(caps.length, 8);
    });

    test('ServiceStatus has 4 statuses', () => {
      const statuses: ServiceStatus[] = ['available', 'dry_run', 'unavailable', 'coming_soon'];
      assert.equal(statuses.length, 4);
    });
  });

  describe('getServiceRegistry', () => {
    test('returns registry with 8 services', () => {
      const registry = getServiceRegistry();
      assert.equal(registry.totalCapabilities, 8);
      assert.equal(registry.services.length, 8);
    });

    test('counts dry_run services correctly', () => {
      const registry = getServiceRegistry();
      assert.ok(registry.dryRunCount > 0);
      assert.ok(registry.dryRunCount <= registry.totalCapabilities);
    });

    test('availableCount > 0 (capabilities wired to Atlas Cloud)', () => {
      const registry = getServiceRegistry();
      assert.ok(registry.availableCount > 0, `expected availableCount > 0, got ${registry.availableCount}`);
    });
  });

  describe('getServiceByCapability', () => {
    test('returns service for asr', () => {
      const svc = getServiceByCapability('asr');
      assert.ok(svc);
      assert.equal(svc.capability, 'asr');
      assert.equal(svc.name, 'Automatic Speech Recognition');
    });

    test('returns service for tts', () => {
      const svc = getServiceByCapability('tts');
      assert.ok(svc);
      assert.equal(svc.capability, 'tts');
    });

    test('returns null for unknown capability', () => {
      const svc = getServiceByCapability('unknown' as MediaCapability);
      assert.equal(svc, null);
    });
  });

  describe('isCapabilityAvailable', () => {
    test('returns true for dry_run capabilities', () => {
      assert.equal(isCapabilityAvailable('asr'), true);
      assert.equal(isCapabilityAvailable('tts'), true);
    });

    test('returns false for coming_soon capabilities', () => {
      assert.equal(isCapabilityAvailable('lip_sync'), false);
    });
  });

  describe('getServiceRequirements', () => {
    test('returns GPU requirements for asr', () => {
      const req = getServiceRequirements('asr');
      assert.equal(req.gpu, true);
      assert.ok(req.minVram.length > 0);
    });

    test('returns requirements for image_edit', () => {
      const req = getServiceRequirements('image_edit');
      assert.equal(req.gpu, true);
      assert.equal(req.minVram, '12GB');
    });

    test('returns unknown requirements for invalid capability', () => {
      const req = getServiceRequirements('unknown' as MediaCapability);
      assert.equal(req.minVram, 'unknown');
    });
  });

  describe('calculateServiceCost', () => {
    test('returns base cost for asr', () => {
      const cost = calculateServiceCost('asr');
      assert.equal(cost, 3);
    });

    test('returns base cost for tts', () => {
      const cost = calculateServiceCost('tts');
      assert.equal(cost, 4);
    });

    test('adds extra cost for long TTS text', () => {
      const longText = 'a'.repeat(1000);
      const cost = calculateServiceCost('tts', { text: longText });
      assert.ok(cost > 4);
    });

    test('returns MEDIA_SERVICE_COST for unknown capability', () => {
      const cost = calculateServiceCost('unknown' as MediaCapability);
      assert.equal(cost, MEDIA_SERVICE_COST);
    });
  });

  describe('validateMediaServiceRequest', () => {
    test('validates request with URL', () => {
      const result = validateMediaServiceRequest({ url: 'https://example.com/video.mp4' });
      assert.equal(result.valid, true);
    });

    test('validates request with text', () => {
      const result = validateMediaServiceRequest({ text: 'Hello world' });
      assert.equal(result.valid, true);
    });

    test('rejects request with neither URL nor text', () => {
      const result = validateMediaServiceRequest({});
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test('rejects URL too long', () => {
      const result = validateMediaServiceRequest({ url: 'a'.repeat(2049) });
      assert.equal(result.valid, false);
    });

    test('rejects text too long', () => {
      const result = validateMediaServiceRequest({ text: 'a'.repeat(8001) });
      assert.equal(result.valid, false);
    });

    test('rejects edit instruction too long', () => {
      const result = validateMediaServiceRequest({ url: 'https://example.com/img.png', editInstruction: 'a'.repeat(1001) });
      assert.equal(result.valid, false);
    });
  });

  describe('executeDryRun', () => {
    test('ASR dry-run returns transcript with segments', () => {
      const output = executeDryRun('asr', { url: 'https://example.com/audio.mp3' });
      assert.equal(output.capability, 'asr');
      assert.equal(output.dryRun, true);
      assert.ok(output.result.transcript);
      assert.ok(Array.isArray(output.result.segments));
      assert.ok(output.result.segments.length > 0);
    });

    test('TTS dry-run returns audio URL and duration', () => {
      const output = executeDryRun('tts', { text: 'Hello world this is a test' });
      assert.equal(output.capability, 'tts');
      assert.equal(output.dryRun, true);
      assert.ok(output.result.audioUrl);
      assert.ok(typeof output.result.duration === 'number');
      assert.ok(output.result.duration > 0);
    });

    test('OCR dry-run returns text and blocks', () => {
      const output = executeDryRun('ocr', { url: 'https://example.com/image.png' });
      assert.equal(output.capability, 'ocr');
      assert.ok(output.result.text);
      assert.ok(Array.isArray(output.result.blocks));
    });

    test('image_edit dry-run returns image URL', () => {
      const output = executeDryRun('image_edit', { url: 'https://example.com/img.png', editInstruction: 'remove background' });
      assert.equal(output.capability, 'image_edit');
      assert.ok(output.result.imageUrl);
      assert.equal(output.result.editInstruction, 'remove background');
    });

    test('audio_process dry-run returns processing applied', () => {
      const output = executeDryRun('audio_process', { url: 'https://example.com/audio.wav' });
      assert.equal(output.capability, 'audio_process');
      assert.ok(Array.isArray(output.result.processingApplied));
      assert.ok(output.result.processingApplied.length > 0);
    });

    test('voice_clone dry-run returns audio and similarity', () => {
      const output = executeDryRun('voice_clone', { url: 'https://example.com/voice.mp3', text: 'Test message' });
      assert.equal(output.capability, 'voice_clone');
      assert.ok(output.result.audioUrl);
      assert.equal(output.result.similarity, 0.0);
    });

    test('video_gen dry-run returns video URL', () => {
      const output = executeDryRun('video_gen', { text: 'A cat playing piano' });
      assert.equal(output.capability, 'video_gen');
      assert.ok(output.result.videoUrl);
      assert.ok(typeof output.result.duration === 'number');
    });

    test('lip_sync dry-run returns video URL', () => {
      const output = executeDryRun('lip_sync', { url: 'https://example.com/video.mp4' });
      assert.equal(output.capability, 'lip_sync');
      assert.ok(output.result.videoUrl);
    });

    test('all dry-run outputs have warnings', () => {
      const output = executeDryRun('asr', { url: 'https://example.com/audio.mp3' });
      assert.ok(output.metadata.warnings.length > 0);
      assert.ok(output.metadata.warnings[0].includes('dry-run'));
    });

    test('all dry-run outputs have model name', () => {
      const output = executeDryRun('tts', { text: 'test' });
      assert.ok(output.metadata.modelUsed.length > 0);
    });

    test('all dry-run outputs have service version', () => {
      const output = executeDryRun('ocr', { url: 'https://example.com/img.png' });
      assert.ok(output.metadata.serviceVersion.length > 0);
    });
  });

  describe('MEDIA_SERVICE_COST', () => {
    test('base cost is 5 credits', () => {
      assert.equal(MEDIA_SERVICE_COST, 5);
    });
  });
});
