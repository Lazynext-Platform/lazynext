/**
 * Media Service Boundary Abstraction.
 *
 * Defines a clean contract for external GPU media services that cannot run on
 * Cloudflare Workers (which are CPU-only). The audit identified 8 FireRed
 * models that require GPU hardware — this abstraction makes the architecture
 * production-ready by declaring a stable capability manifest, validation, and a
 * dispatch function with dry-run stubs now and real service integration later.
 *
 * Capabilities map to FireRed models from the research:
 *   1. ASR            — FireRedASR / ASR2S
 *   2. TTS            — FireRedTTS2 / TTS3
 *   3. OCR            — FireRed-OCR
 *   4. Image Edit     — FireRed-Image-Edit
 *   5. Audio Process  — FireRedAudio
 *   6. Voice Clone    — StoryMaker
 *   7. Video Gen      — gen-v (#14)
 *   8. Lip Sync       — lip sync
 *
 * All capabilities currently return dry-run placeholder data. When a real GPU
 * service is wired up, flip the descriptor `status` to 'available' and replace
 * the handler in `dispatchMediaService` — the contract stays identical.
 */
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const MEDIA_SERVICE_COST = 5;

// ── Types ──

export type MediaCapability =
  | 'asr'
  | 'tts'
  | 'ocr'
  | 'image_edit'
  | 'audio_process'
  | 'voice_clone'
  | 'video_gen'
  | 'lip_sync';

export type ServiceStatus = 'available' | 'dry_run' | 'unavailable' | 'coming_soon';

export interface ServiceRequirement {
  gpu: boolean;
  minVram: string;
  runtime: string;
  estimatedLatency: string;
}

export interface ServiceDescriptor {
  capability: MediaCapability;
  name: string;
  description: string;
  status: ServiceStatus;
  requirements: ServiceRequirement;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  creditCost: number;
  supportedFormats: string[];
}

export interface MediaServiceInput {
  url?: string;
  text?: string;
  voiceId?: string;
  editInstruction?: string;
  language?: string;
  options?: Record<string, unknown>;
}

export interface ServiceResultMetadata {
  processingTime: number;
  modelUsed: string;
  serviceVersion: string;
  warnings: string[];
}

export interface MediaServiceOutput {
  capability: MediaCapability;
  result: Record<string, unknown>;
  metadata: ServiceResultMetadata;
  dryRun: boolean;
}

export interface MediaServiceRegistry {
  services: ServiceDescriptor[];
  totalCapabilities: number;
  availableCount: number;
  dryRunCount: number;
}

// ── Service catalog ──

const SERVICE_CATALOG: ServiceDescriptor[] = [
  {
    capability: 'asr',
    name: 'Automatic Speech Recognition',
    description: 'Transcribe audio/video into text with word-level timestamps. Powered by FireRedASR / ASR2S.',
    status: 'dry_run',
    requirements: { gpu: true, minVram: '8GB', runtime: 'pytorch', estimatedLatency: '5-15s per minute of audio' },
    inputSchema: { url: 'string (audio/video URL)', language: 'string (optional BCP-47 tag)', options: 'object' },
    outputSchema: { transcript: 'string', segments: 'array<{start,end,text}>', language: 'string', duration: 'number' },
    creditCost: 3,
    supportedFormats: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
  },
  {
    capability: 'tts',
    name: 'Text-to-Speech',
    description: 'Synthesize natural speech from text with selectable voices. Powered by FireRedTTS2 / TTS3.',
    status: 'dry_run',
    requirements: { gpu: true, minVram: '6GB', runtime: 'pytorch', estimatedLatency: '2-8s' },
    inputSchema: { text: 'string', voiceId: 'string (optional)', language: 'string (optional)' },
    outputSchema: { audioUrl: 'string', duration: 'number', voiceId: 'string', sampleRate: 'number' },
    creditCost: 4,
    supportedFormats: ['mp3', 'wav'],
  },
  {
    capability: 'ocr',
    name: 'Optical Character Recognition',
    description: 'Extract text from images with layout awareness. Powered by FireRed-OCR.',
    status: 'dry_run',
    requirements: { gpu: true, minVram: '4GB', runtime: 'pytorch', estimatedLatency: '1-3s' },
    inputSchema: { url: 'string (image URL)', language: 'string (optional)' },
    outputSchema: { text: 'string', blocks: 'array<{bbox,text,confidence}>', language: 'string' },
    creditCost: 2,
    supportedFormats: ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
  },
  {
    capability: 'image_edit',
    name: 'Image Editing',
    description: 'Apply natural-language edit instructions to an image. Powered by FireRed-Image-Edit.',
    status: 'dry_run',
    requirements: { gpu: true, minVram: '12GB', runtime: 'pytorch', estimatedLatency: '3-10s' },
    inputSchema: { url: 'string (image URL)', editInstruction: 'string', options: 'object' },
    outputSchema: { imageUrl: 'string', width: 'number', height: 'number', maskApplied: 'boolean' },
    creditCost: 6,
    supportedFormats: ['png', 'jpg', 'jpeg', 'webp'],
  },
  {
    capability: 'audio_process',
    name: 'Audio Processing',
    description: 'Enhance, denoise, and process audio streams. Powered by FireRedAudio.',
    status: 'dry_run',
    requirements: { gpu: true, minVram: '6GB', runtime: 'pytorch', estimatedLatency: '2-6s' },
    inputSchema: { url: 'string (audio URL)', options: 'object (denoise, normalize, etc.)' },
    outputSchema: { audioUrl: 'string', duration: 'number', sampleRate: 'number', processingApplied: 'array<string>' },
    creditCost: 3,
    supportedFormats: ['mp3', 'wav', 'm4a', 'flac'],
  },
  {
    capability: 'voice_clone',
    name: 'Voice Cloning',
    description: 'Clone a voice from a short sample and synthesize new speech. Powered by StoryMaker.',
    status: 'dry_run',
    requirements: { gpu: true, minVram: '16GB', runtime: 'pytorch', estimatedLatency: '8-20s' },
    inputSchema: { url: 'string (voice sample URL)', text: 'string', language: 'string (optional)' },
    outputSchema: { audioUrl: 'string', duration: 'number', voiceId: 'string', similarity: 'number' },
    creditCost: 8,
    supportedFormats: ['mp3', 'wav', 'm4a'],
  },
  {
    capability: 'video_gen',
    name: 'Video Generation',
    description: 'Generate a short video clip from a text prompt. Powered by gen-v (#14).',
    status: 'coming_soon',
    requirements: { gpu: true, minVram: '24GB', runtime: 'pytorch', estimatedLatency: '20-60s' },
    inputSchema: { text: 'string (prompt)', options: 'object (duration, resolution, fps)' },
    outputSchema: { videoUrl: 'string', duration: 'number', resolution: 'string', fps: 'number' },
    creditCost: 12,
    supportedFormats: ['mp4', 'webm'],
  },
  {
    capability: 'lip_sync',
    name: 'Lip Sync',
    description: 'Sync a video to an audio track for realistic mouth movement. Powered by lip sync model.',
    status: 'coming_soon',
    requirements: { gpu: true, minVram: '16GB', runtime: 'pytorch', estimatedLatency: '15-40s' },
    inputSchema: { url: 'string (video URL)', options: 'object (audioUrl required)' },
    outputSchema: { videoUrl: 'string', duration: 'number', resolution: 'string', syncScore: 'number' },
    creditCost: 10,
    supportedFormats: ['mp4', 'webm'],
  },
];

// ── Registry / lookup functions ──

export function getServiceRegistry(): MediaServiceRegistry {
  const services = SERVICE_CATALOG;
  return {
    services,
    totalCapabilities: services.length,
    availableCount: services.filter((s) => s.status === 'available').length,
    dryRunCount: services.filter((s) => s.status === 'dry_run').length,
  };
}

export function getServiceByCapability(capability: MediaCapability): ServiceDescriptor | null {
  return SERVICE_CATALOG.find((s) => s.capability === capability) ?? null;
}

export function isCapabilityAvailable(capability: MediaCapability): boolean {
  const svc = getServiceByCapability(capability);
  if (!svc) return false;
  return svc.status === 'available' || svc.status === 'dry_run';
}

export function getServiceRequirements(capability: MediaCapability): ServiceRequirement {
  const svc = getServiceByCapability(capability);
  if (!svc) return { gpu: true, minVram: 'unknown', runtime: 'unknown', estimatedLatency: 'unknown' };
  return svc.requirements;
}

export function calculateServiceCost(capability: MediaCapability, input?: MediaServiceInput): number {
  const svc = getServiceByCapability(capability);
  if (!svc) return MEDIA_SERVICE_COST;
  let cost = svc.creditCost;
  // Long-form text inputs cost more (TTS / voice clone scale with text length)
  if (input?.text) {
    const textLen = input.text.length;
    if (capability === 'tts' || capability === 'voice_clone') {
      const extraChunks = Math.max(0, Math.ceil(textLen / 500) - 1);
      cost += extraChunks * 2;
    }
  }
  return cost;
}

// ── Validation ──

export function validateMediaServiceRequest(input: MediaServiceInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // At least one meaningful input must be present
  const hasUrl = typeof input.url === 'string' && input.url.trim().length > 0;
  const hasText = typeof input.text === 'string' && input.text.trim().length > 0;
  if (!hasUrl && !hasText) {
    errors.push('Either a media URL or text input is required');
  }
  if (input.url && input.url.length > 2048) {
    errors.push('URL exceeds maximum length of 2048 characters');
  }
  if (input.text && input.text.length > 8000) {
    errors.push('Text input exceeds maximum length of 8000 characters');
  }
  if (input.editInstruction && input.editInstruction.length > 1000) {
    errors.push('Edit instruction exceeds maximum length of 1000 characters');
  }
  if (input.voiceId && input.voiceId.length > 100) {
    errors.push('Voice ID exceeds maximum length of 100 characters');
  }
  if (input.language && input.language.length > 20) {
    errors.push('Language tag exceeds maximum length of 20 characters');
  }
  return { valid: errors.length === 0, errors };
}

// ── Dry-run stubs ──

function baseMetadata(modelUsed: string, processingTime: number, warnings: string[] = []): ServiceResultMetadata {
  return {
    processingTime,
    modelUsed,
    serviceVersion: 'dry-run-stub-0.1.0',
    warnings: ['Output is a dry-run placeholder. No real GPU service was invoked.', ...warnings],
  };
}

function dryRunASR(input: MediaServiceInput): Record<string, unknown> {
  const lang = (input.language || 'en').slice(0, 20);
  return {
    transcript: 'Welcome to LazyNext, the AI creative platform for e-commerce. This is a dry-run transcript placeholder generated without a real GPU service.',
    segments: [
      { start: 0.0, end: 2.4, text: 'Welcome to LazyNext,' },
      { start: 2.4, end: 5.1, text: 'the AI creative platform for e-commerce.' },
      { start: 5.1, end: 8.0, text: 'This is a dry-run transcript placeholder generated without a real GPU service.' },
    ],
    language: lang,
    duration: 8.0,
    wordCount: 18,
    confidence: 0.0,
  };
}

function dryRunTTS(input: MediaServiceInput): Record<string, unknown> {
  const text = (input.text || '').slice(0, 8000);
  const voiceId = (input.voiceId || 'default-female').slice(0, 100);
  const estimatedDuration = Math.max(1, Math.round((text.length / 15) * 10) / 10);
  return {
    audioUrl: 'data:audio/wav;base64,DRY_RUN_PLACEHOLDER',
    duration: estimatedDuration,
    voiceId,
    sampleRate: 24000,
    textLength: text.length,
  };
}

function dryRunOCR(input: MediaServiceInput): Record<string, unknown> {
  const lang = (input.language || 'auto').slice(0, 20);
  return {
    text: 'SALE 50% OFF\nNew Arrivals\nShop Now\n— dry-run OCR placeholder —',
    blocks: [
      { bbox: { x: 10, y: 20, w: 200, h: 40 }, text: 'SALE 50% OFF', confidence: 0.0 },
      { bbox: { x: 10, y: 70, w: 180, h: 30 }, text: 'New Arrivals', confidence: 0.0 },
      { bbox: { x: 10, y: 110, w: 120, h: 30 }, text: 'Shop Now', confidence: 0.0 },
    ],
    language: lang,
    blockCount: 3,
  };
}

function dryRunImageEdit(input: MediaServiceInput): Record<string, unknown> {
  const instruction = (input.editInstruction || '').slice(0, 1000);
  return {
    imageUrl: 'data:image/png;base64,DRY_RUN_PLACEHOLDER',
    width: 1024,
    height: 1024,
    maskApplied: false,
    editInstruction: instruction,
    format: 'png',
  };
}

function dryRunAudioProcess(input: MediaServiceInput): Record<string, unknown> {
  const opts = (input.options as Record<string, unknown>) || {};
  const applied: string[] = [];
  if (opts.denoise) applied.push('denoise');
  if (opts.normalize) applied.push('normalize');
  if (opts.enhance) applied.push('enhance');
  if (applied.length === 0) applied.push('denoise', 'normalize');
  return {
    audioUrl: 'data:audio/wav;base64,DRY_RUN_PLACEHOLDER',
    duration: 10.0,
    sampleRate: 48000,
    processingApplied: applied,
    snrImprovementDb: 0.0,
  };
}

function dryRunVoiceClone(input: MediaServiceInput): Record<string, unknown> {
  const text = (input.text || '').slice(0, 8000);
  const estimatedDuration = Math.max(1, Math.round((text.length / 15) * 10) / 10);
  return {
    audioUrl: 'data:audio/wav;base64,DRY_RUN_PLACEHOLDER',
    duration: estimatedDuration,
    voiceId: 'cloned-voice-dry-run',
    similarity: 0.0,
    textLength: text.length,
  };
}

function dryRunVideoGen(input: MediaServiceInput): Record<string, unknown> {
  const text = (input.text || '').slice(0, 8000);
  const opts = (input.options as Record<string, unknown>) || {};
  const duration = typeof opts.duration === 'number' ? opts.duration : 4;
  const resolution = typeof opts.resolution === 'string' ? opts.resolution : '720p';
  const fps = typeof opts.fps === 'number' ? opts.fps : 24;
  return {
    videoUrl: 'data:video/mp4;base64,DRY_RUN_PLACEHOLDER',
    duration,
    resolution,
    fps,
    prompt: text,
  };
}

function dryRunLipSync(input: MediaServiceInput): Record<string, unknown> {
  const opts = (input.options as Record<string, unknown>) || {};
  return {
    videoUrl: 'data:video/mp4;base64,DRY_RUN_PLACEHOLDER',
    duration: 6.0,
    resolution: '720p',
    syncScore: 0.0,
    audioUrl: typeof opts.audioUrl === 'string' ? String(opts.audioUrl).slice(0, 2048) : 'data:audio/wav;base64,DRY_RUN_PLACEHOLDER',
  };
}

const DRY_RUN_HANDLERS: Record<MediaCapability, (input: MediaServiceInput) => Record<string, unknown>> = {
  asr: dryRunASR,
  tts: dryRunTTS,
  ocr: dryRunOCR,
  image_edit: dryRunImageEdit,
  audio_process: dryRunAudioProcess,
  voice_clone: dryRunVoiceClone,
  video_gen: dryRunVideoGen,
  lip_sync: dryRunLipSync,
};

const MODEL_NAMES: Record<MediaCapability, string> = {
  asr: 'FireRedASR/ASR2S',
  tts: 'FireRedTTS2/TTS3',
  ocr: 'FireRed-OCR',
  image_edit: 'FireRed-Image-Edit',
  audio_process: 'FireRedAudio',
  voice_clone: 'StoryMaker',
  video_gen: 'gen-v-14',
  lip_sync: 'lip-sync-v1',
};

/**
 * Generate a realistic dry-run placeholder output for a capability.
 * No real GPU service is invoked — this is for development and testing.
 */
export function executeDryRun(capability: MediaCapability, input: MediaServiceInput): MediaServiceOutput {
  const handler = DRY_RUN_HANDLERS[capability];
  if (!handler) throw new Error(`No dry-run handler for capability: ${capability}`);
  const result = handler(input);
  const start = Date.now();
  // Simulate a tiny amount of processing time variance per capability
  const simulatedLatency = ({ asr: 1200, tts: 800, ocr: 300, image_edit: 900, audio_process: 600, voice_clone: 1500, video_gen: 3000, lip_sync: 2000 } as Record<MediaCapability, number>)[capability] || 1000;
  void start; // referenced for future real-service timing
  return {
    capability,
    result,
    metadata: baseMetadata(MODEL_NAMES[capability], simulatedLatency),
    dryRun: true,
  };
}

// ── Main dispatch ──

/**
 * Dispatch a media service request to the appropriate handler.
 *
 * Currently all capabilities run in dry-run mode. When a real GPU service is
 * integrated, replace the dry-run branch with an HTTP call to the external
 * service and flip the descriptor status to 'available'. The return contract
 * (MediaServiceOutput) stays identical so callers need no changes.
 */
export async function dispatchMediaService(params: {
  capability: MediaCapability;
  input: MediaServiceInput;
  planTier: PlanTier;
}): Promise<MediaServiceOutput> {
  const { capability, input, planTier } = params;
  // planTier is used to gate future real-service routing (e.g. elite gets
  // higher-priority GPU queues). It is referenced here so the contract is
  // stable when real services are wired up.
  void getLLMModel(planTier);

  const svc = getServiceByCapability(capability);
  if (!svc) {
    throw new Error(`Unknown media capability: ${capability}`);
  }
  if (svc.status === 'coming_soon') {
    throw new Error(`Capability '${capability}' is coming soon and not yet available`);
  }
  if (svc.status === 'unavailable') {
    throw new Error(`Capability '${capability}' is currently unavailable`);
  }

  // Dry-run path (current). Real-service path will branch on svc.status === 'available'.
  return executeDryRun(capability, input);
}
