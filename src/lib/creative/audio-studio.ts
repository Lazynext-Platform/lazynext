/**
 * Voice & Audio Studio — TTS voiceover generation, music/sound selection,
 * and audio mixing for ads.
 *
 * Self-contained module inspired by FireRedTTS/Audio concepts. Integrates with
 * the existing atlasChat() from src/lib/atlas.ts — no new LLM dependency. Credit
 * costs are defined per operation and exported for the API routes to charge.
 *
 * NOTE: The actual Atlas audio generation / mixing API integration is stubbed
 * for now — `generateVoiceover` and `mixAudio` return placeholder URLs in both
 * dry-run and "real" mode. The atlasChat call is still used to generate TTS
 * delivery instructions (prosody cues) so the prompt engineering pipeline is
 * exercised end-to-end.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

// ── Types ──

export type VoiceGender = 'male' | 'female' | 'neutral';
export type VoiceTone =
  | 'energetic'
  | 'calm'
  | 'professional'
  | 'friendly'
  | 'dramatic'
  | 'narrative'
  | 'conversational'
  | 'authoritative';
export type VoiceLanguage =
  | 'en'
  | 'zh'
  | 'ja'
  | 'es'
  | 'ko'
  | 'pt'
  | 'fr'
  | 'de'
  | 'ar'
  | 'hi'
  | 'vi'
  | 'th'
  | 'id';
export type MusicMood =
  | 'upbeat'
  | 'energetic'
  | 'calm'
  | 'dramatic'
  | 'inspirational'
  | 'corporate'
  | 'playful'
  | 'tense'
  | 'sad'
  | 'luxurious';
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac';

export interface VoiceProfile {
  voiceId: string;
  name: string;
  gender: VoiceGender;
  tone: VoiceTone;
  language: VoiceLanguage;
  accent?: string;
  description: string;
  sampleUrl?: string;
  pitch: number; // 0.5 - 2.0, 1.0 = normal
  speed: number; // 0.5 - 2.0, 1.0 = normal
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
  gender?: VoiceGender;
  tone?: VoiceTone;
  language?: VoiceLanguage;
  pitch?: number;
  speed?: number;
  format?: AudioFormat;
}

export interface TTSResult {
  audioUrl: string;
  durationSec: number;
  voiceUsed: VoiceProfile;
  format: AudioFormat;
  fileSize: number;
  text: string;
  wordCount: number;
  estimatedCost: number;
}

export interface MusicTrack {
  trackId: string;
  name: string;
  mood: MusicMood;
  durationSec: number;
  bpm: number;
  genre: string;
  url: string;
  license: string;
  previewUrl?: string;
}

export interface MusicSelectionRequest {
  mood: MusicMood;
  durationSec?: number;
  bpmRange?: { min: number; max: number };
  genre?: string;
}

export interface AudioMixRequest {
  voiceoverUrl: string;
  musicUrl?: string;
  musicVolume: number; // 0-100, background music volume
  voiceVolume: number; // 0-100, voiceover volume
  fadeInSec?: number;
  fadeOutSec?: number;
  crossfadeSec?: number;
  outputFormat?: AudioFormat;
}

export interface AudioMixResult {
  mixedAudioUrl: string;
  durationSec: number;
  format: AudioFormat;
  fileSize: number;
  tracks: Array<{ type: 'voiceover' | 'music' | 'sfx'; url: string; volume: number }>;
}

// ── Credit costs ──

export const TTS_CREDIT_COST = 3;
export const MUSIC_CREDIT_COST = 1;
export const MIX_CREDIT_COST = 2;

// ── Voice profiles (12+ presets across genders/tones/languages) ──

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    voiceId: 'en-male-energetic-01',
    name: 'Atlas',
    gender: 'male',
    tone: 'energetic',
    language: 'en',
    accent: 'american',
    description: 'High-energy American male voice — perfect for product launches and hype ads.',
    pitch: 1.0,
    speed: 1.05,
  },
  {
    voiceId: 'en-female-friendly-01',
    name: 'Nova',
    gender: 'female',
    tone: 'friendly',
    language: 'en',
    accent: 'american',
    description: 'Warm, approachable American female voice — great for lifestyle and UGC ads.',
    pitch: 1.0,
    speed: 1.0,
  },
  {
    voiceId: 'en-male-professional-01',
    name: 'Sterling',
    gender: 'male',
    tone: 'professional',
    language: 'en',
    accent: 'british',
    description: 'Refined British male voice — corporate, finance, and premium brand ads.',
    pitch: 0.95,
    speed: 0.95,
  },
  {
    voiceId: 'en-female-professional-01',
    name: 'Vivian',
    gender: 'female',
    tone: 'professional',
    language: 'en',
    accent: 'british',
    description: 'Polished British female voice — authoritative and trustworthy for B2B.',
    pitch: 1.0,
    speed: 1.0,
  },
  {
    voiceId: 'en-male-dramatic-01',
    name: 'Orion',
    gender: 'male',
    tone: 'dramatic',
    language: 'en',
    accent: 'american',
    description: 'Cinematic, dramatic male voice — trailers and emotional storytelling.',
    pitch: 0.9,
    speed: 0.9,
  },
  {
    voiceId: 'en-female-narrative-01',
    name: 'Sage',
    gender: 'female',
    tone: 'narrative',
    language: 'en',
    accent: 'american',
    description: 'Calm, narrative female voice — documentary-style and explainer ads.',
    pitch: 1.0,
    speed: 0.95,
  },
  {
    voiceId: 'en-neutral-conversational-01',
    name: 'Echo',
    gender: 'neutral',
    tone: 'conversational',
    language: 'en',
    accent: 'american',
    description: 'Neutral, conversational voice — natural dialogue and testimonial ads.',
    pitch: 1.0,
    speed: 1.0,
  },
  {
    voiceId: 'en-male-authoritative-01',
    name: 'Maverick',
    gender: 'male',
    tone: 'authoritative',
    language: 'en',
    accent: 'american',
    description: 'Commanding male voice — announcements, sales, and call-to-action ads.',
    pitch: 0.92,
    speed: 1.0,
  },
  {
    voiceId: 'zh-female-friendly-01',
    name: 'Lan',
    gender: 'female',
    tone: 'friendly',
    language: 'zh',
    accent: 'mandarin',
    description: '友好的中文女声 — 适合生活方式和电商广告。',
    pitch: 1.0,
    speed: 1.0,
  },
  {
    voiceId: 'zh-male-professional-01',
    name: 'Jian',
    gender: 'male',
    tone: 'professional',
    language: 'zh',
    accent: 'mandarin',
    description: '专业的中文男声 — 企业和品牌广告。',
    pitch: 0.95,
    speed: 0.95,
  },
  {
    voiceId: 'ja-female-calm-01',
    name: 'Hana',
    gender: 'female',
    tone: 'calm',
    language: 'ja',
    accent: 'tokyo',
    description: '落ち着いた日本語の女性音声 — ブランドとライフスタイル広告に最適。',
    pitch: 1.0,
    speed: 0.95,
  },
  {
    voiceId: 'es-male-energetic-01',
    name: 'Mateo',
    gender: 'male',
    tone: 'energetic',
    language: 'es',
    accent: 'latin-american',
    description: 'Voz masculina enérgica en español — ideal para lanzamientos y promociones.',
    pitch: 1.0,
    speed: 1.05,
  },
  {
    voiceId: 'ko-female-conversational-01',
    name: 'Yuna',
    gender: 'female',
    tone: 'conversational',
    language: 'ko',
    accent: 'seoul',
    description: '자연스러운 한국어 여성 음성 — 라이프스타일 및 UGC 광고에 적합.',
    pitch: 1.0,
    speed: 1.0,
  },
  {
    voiceId: 'pt-male-friendly-01',
    name: 'Diego',
    gender: 'male',
    tone: 'friendly',
    language: 'pt',
    accent: 'brazilian',
    description: 'Voz masculina amigável em português — ótima para anúncios de lifestyle.',
    pitch: 1.0,
    speed: 1.0,
  },
];

// ── Music library (20+ presets across moods) ──

export const MUSIC_LIBRARY: MusicTrack[] = [
  { trackId: 'm-upbeat-01', name: 'Sunrise Drive', mood: 'upbeat', durationSec: 30, bpm: 120, genre: 'pop', url: 'https://cdn.lazynext.local/audio/m-upbeat-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-upbeat-01-preview.mp3' },
  { trackId: 'm-upbeat-02', name: 'Bright Horizon', mood: 'upbeat', durationSec: 45, bpm: 128, genre: 'electronic', url: 'https://cdn.lazynext.local/audio/m-upbeat-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-upbeat-02-preview.mp3' },
  { trackId: 'm-energetic-01', name: 'Pulse Racer', mood: 'energetic', durationSec: 30, bpm: 140, genre: 'electronic', url: 'https://cdn.lazynext.local/audio/m-energetic-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-energetic-01-preview.mp3' },
  { trackId: 'm-energetic-02', name: 'Adrenaline', mood: 'energetic', durationSec: 25, bpm: 150, genre: 'rock', url: 'https://cdn.lazynext.local/audio/m-energetic-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-energetic-02-preview.mp3' },
  { trackId: 'm-calm-01', name: 'Gentle Tide', mood: 'calm', durationSec: 60, bpm: 70, genre: 'ambient', url: 'https://cdn.lazynext.local/audio/m-calm-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-calm-01-preview.mp3' },
  { trackId: 'm-calm-02', name: 'Morning Mist', mood: 'calm', durationSec: 45, bpm: 75, genre: 'acoustic', url: 'https://cdn.lazynext.local/audio/m-calm-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-calm-02-preview.mp3' },
  { trackId: 'm-dramatic-01', name: 'Final Act', mood: 'dramatic', durationSec: 40, bpm: 90, genre: 'orchestral', url: 'https://cdn.lazynext.local/audio/m-dramatic-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-dramatic-01-preview.mp3' },
  { trackId: 'm-dramatic-02', name: 'Edge of Storm', mood: 'dramatic', durationSec: 35, bpm: 95, genre: 'cinematic', url: 'https://cdn.lazynext.local/audio/m-dramatic-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-dramatic-02-preview.mp3' },
  { trackId: 'm-inspirational-01', name: 'Rise Above', mood: 'inspirational', durationSec: 45, bpm: 100, genre: 'orchestral', url: 'https://cdn.lazynext.local/audio/m-inspirational-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-inspirational-01-preview.mp3' },
  { trackId: 'm-inspirational-02', name: 'New Dawn', mood: 'inspirational', durationSec: 50, bpm: 110, genre: 'pop', url: 'https://cdn.lazynext.local/audio/m-inspirational-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-inspirational-02-preview.mp3' },
  { trackId: 'm-corporate-01', name: 'Boardroom', mood: 'corporate', durationSec: 30, bpm: 105, genre: 'corporate', url: 'https://cdn.lazynext.local/audio/m-corporate-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-corporate-01-preview.mp3' },
  { trackId: 'm-corporate-02', name: 'Growth Curve', mood: 'corporate', durationSec: 40, bpm: 115, genre: 'corporate', url: 'https://cdn.lazynext.local/audio/m-corporate-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-corporate-02-preview.mp3' },
  { trackId: 'm-playful-01', name: 'Bouncy Steps', mood: 'playful', durationSec: 25, bpm: 130, genre: 'pop', url: 'https://cdn.lazynext.local/audio/m-playful-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-playful-01-preview.mp3' },
  { trackId: 'm-playful-02', name: 'Fun Fair', mood: 'playful', durationSec: 30, bpm: 135, genre: 'electronic', url: 'https://cdn.lazynext.local/audio/m-playful-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-playful-02-preview.mp3' },
  { trackId: 'm-tense-01', name: 'Holding Breath', mood: 'tense', durationSec: 35, bpm: 85, genre: 'cinematic', url: 'https://cdn.lazynext.local/audio/m-tense-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-tense-01-preview.mp3' },
  { trackId: 'm-tense-02', name: 'Countdown', mood: 'tense', durationSec: 30, bpm: 100, genre: 'electronic', url: 'https://cdn.lazynext.local/audio/m-tense-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-tense-02-preview.mp3' },
  { trackId: 'm-sad-01', name: 'Falling Leaves', mood: 'sad', durationSec: 50, bpm: 60, genre: 'acoustic', url: 'https://cdn.lazynext.local/audio/m-sad-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-sad-01-preview.mp3' },
  { trackId: 'm-sad-02', name: 'Empty Room', mood: 'sad', durationSec: 45, bpm: 65, genre: 'piano', url: 'https://cdn.lazynext.local/audio/m-sad-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-sad-02-preview.mp3' },
  { trackId: 'm-luxurious-01', name: 'Velvet Lounge', mood: 'luxurious', durationSec: 40, bpm: 80, genre: 'jazz', url: 'https://cdn.lazynext.local/audio/m-luxurious-01.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-luxurious-01-preview.mp3' },
  { trackId: 'm-luxurious-02', name: 'Gold Standard', mood: 'luxurious', durationSec: 35, bpm: 85, genre: 'orchestral', url: 'https://cdn.lazynext.local/audio/m-luxurious-02.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-luxurious-02-preview.mp3' },
  { trackId: 'm-energetic-03', name: 'Power Chord', mood: 'energetic', durationSec: 28, bpm: 160, genre: 'rock', url: 'https://cdn.lazynext.local/audio/m-energetic-03.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-energetic-03-preview.mp3' },
  { trackId: 'm-upbeat-03', name: 'City Lights', mood: 'upbeat', durationSec: 35, bpm: 124, genre: 'pop', url: 'https://cdn.lazynext.local/audio/m-upbeat-03.mp3', license: 'royalty-free', previewUrl: 'https://cdn.lazynext.local/audio/m-upbeat-03-preview.mp3' },
];

// ── Music mood metadata ──

const MUSIC_MOOD_META: Array<{ mood: MusicMood; name: string; description: string }> = [
  { mood: 'upbeat', name: 'Upbeat', description: 'Cheerful, fast-paced tracks for positive, feel-good ads.' },
  { mood: 'energetic', name: 'Energetic', description: 'High-intensity tracks for action, sports, and hype ads.' },
  { mood: 'calm', name: 'Calm', description: 'Relaxed, soothing tracks for lifestyle and wellness ads.' },
  { mood: 'dramatic', name: 'Dramatic', description: 'Cinematic, emotional tracks for storytelling and trailers.' },
  { mood: 'inspirational', name: 'Inspirational', description: 'Uplifting tracks for motivation and brand stories.' },
  { mood: 'corporate', name: 'Corporate', description: 'Professional, clean tracks for B2B and product demos.' },
  { mood: 'playful', name: 'Playful', description: 'Fun, quirky tracks for casual and kids-oriented ads.' },
  { mood: 'tense', name: 'Tense', description: 'Suspenseful tracks for urgency and countdown offers.' },
  { mood: 'sad', name: 'Sad', description: 'Melancholic tracks for emotional and cause-driven ads.' },
  { mood: 'luxurious', name: 'Luxurious', description: 'Elegant, premium tracks for high-end brand ads.' },
];

// ── Model resolution ──

const AUDIO_STUDIO_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const AUDIO_STUDIO_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const AUDIO_STUDIO_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 4000);

/**
 * Resolve the LLM model for a given plan tier.
 * Falls back to the module-level AUDIO_STUDIO_MODEL (which respects the CREATIVE_MODEL env override).
 */
function resolveModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

// ── Helpers ──

const VALID_GENDERS: ReadonlySet<VoiceGender> = new Set(['male', 'female', 'neutral']);
const VALID_TONES: ReadonlySet<VoiceTone> = new Set([
  'energetic',
  'calm',
  'professional',
  'friendly',
  'dramatic',
  'narrative',
  'conversational',
  'authoritative',
]);
const VALID_LANGUAGES: ReadonlySet<VoiceLanguage> = new Set([
  'en', 'zh', 'ja', 'es', 'ko', 'pt', 'fr', 'de', 'ar', 'hi', 'vi', 'th', 'id',
]);
const VALID_MOODS: ReadonlySet<MusicMood> = new Set([
  'upbeat', 'energetic', 'calm', 'dramatic', 'inspirational',
  'corporate', 'playful', 'tense', 'sad', 'luxurious',
]);
const VALID_FORMATS: ReadonlySet<AudioFormat> = new Set(['mp3', 'wav', 'ogg', 'aac']);

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_audio_studio_output');
  return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
}

function clampPitch(p: unknown): number {
  const n = Number(p);
  if (!Number.isFinite(n)) return 1.0;
  return Math.max(0.5, Math.min(2.0, n));
}

function clampSpeed(p: unknown): number {
  const n = Number(p);
  if (!Number.isFinite(n)) return 1.0;
  return Math.max(0.5, Math.min(2.0, n));
}

/** True when running against the local mock Atlas server (or no real key configured). */
function isDryRun(): boolean {
  const base = process.env.ATLASCLOUD_BASE || '';
  if (base.includes('localhost') || base.includes('127.0.0.1')) return true;
  return !process.env.ATLASCLOUD_API_KEY;
}

/**
 * SSRF protection — reject localhost, private IPs, and cloud metadata endpoints.
 * Returns true when the URL is safe to fetch.
 */
export function isUrlSafe(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  // Only allow http/https
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  // Reject localhost and loopback
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return false;
  // Reject IPv4 loopback (127.x.x.x)
  if (/^127\.\d+\.\d+\.\d+$/.test(host)) return false;
  // Reject private IPv4 ranges (10.x, 172.16-31.x, 192.168.x)
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return false;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return false;
  const m172 = host.match(/^172\.(\d+)\.\d+\.\d+$/);
  if (m172) {
    const second = Number(m172[1]);
    if (second >= 16 && second <= 31) return false;
  }
  // Reject cloud metadata endpoints
  if (host === '169.254.169.254') return false;
  if (host === 'metadata.google.internal') return false;
  // Reject IPv6 link-local / unique-local
  if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return false;
  return true;
}

// ── Voice selection ──

/**
 * Select a voice profile by explicit voiceId, or by matching gender/tone/language.
 * Falls back to the first profile if no match is found.
 */
function selectVoice(request: TTSRequest): VoiceProfile {
  if (request.voiceId) {
    const exact = VOICE_PROFILES.find((v) => v.voiceId === request.voiceId);
    if (exact) return exact;
  }
  // Score-based matching on gender/tone/language
  const candidates = VOICE_PROFILES.filter((v) => {
    if (request.gender && v.gender !== request.gender) return false;
    if (request.tone && v.tone !== request.tone) return false;
    if (request.language && v.language !== request.language) return false;
    return true;
  });
  if (candidates.length) return candidates[0];
  return VOICE_PROFILES[0];
}

// ── AI instruction generation ──

const TTS_SYS =
  'You are a voiceover director. Given ad copy and a voice profile, produce concise ' +
  'prosody and delivery instructions (pacing, emphasis, pauses) for a TTS engine. ' +
  'Return ONLY valid JSON: { "delivery": string, "notes": string }.';

/**
 * Use atlasChat to generate TTS delivery instructions. Falls back to a
 * deterministic description if the LLM call fails (resilient in mock/offline mode).
 */
async function generateDeliveryInstructions(
  request: TTSRequest,
  voice: VoiceProfile,
  planTier?: PlanTier,
): Promise<{ delivery: string; notes: string }> {
  const userPrompt = `Ad copy to be voiced:
${request.text}

Voice profile: ${voice.name} (${voice.gender}, ${voice.tone}, ${voice.language}${voice.accent ? ', ' + voice.accent : ''}).
Pitch: ${clampPitch(request.pitch)}, Speed: ${clampSpeed(request.speed)}.

Return JSON: { "delivery": string, "notes": string }`;

  try {
    const raw = await atlasChat(
      [{ role: 'system', content: TTS_SYS }, { role: 'user', content: userPrompt }],
      resolveModel(planTier),
      AUDIO_STUDIO_MAX_TOKENS,
      AUDIO_STUDIO_TIMEOUT_MS,
    );
    const j = extractJson(raw);
    return {
      delivery: asStr(j.delivery, `Deliver in a ${voice.tone} tone at ${clampSpeed(request.speed)}x speed.`),
      notes: asStr(j.notes),
    };
  } catch {
    return {
      delivery: `Deliver in a ${voice.tone} tone at ${clampSpeed(request.speed)}x speed with ${voice.gender} voice.`,
      notes: '',
    };
  }
}

// ── Validation ──

/**
 * Validate a TTS request. Returns { valid, errors } — never throws.
 */
export function validateTTSRequest(request: TTSRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['request_required'] };
  }

  if (!isString(request.text) || !request.text.trim()) {
    errors.push('text_required');
  } else if (request.text.length > 5000) {
    errors.push('text_too_long');
  }

  if (request.gender && !VALID_GENDERS.has(request.gender)) {
    errors.push('gender_invalid');
  }
  if (request.tone && !VALID_TONES.has(request.tone)) {
    errors.push('tone_invalid');
  }
  if (request.language && !VALID_LANGUAGES.has(request.language)) {
    errors.push('language_invalid');
  }
  if (request.format && !VALID_FORMATS.has(request.format)) {
    errors.push('format_invalid');
  }
  if (request.pitch !== undefined) {
    const p = Number(request.pitch);
    if (!Number.isFinite(p) || p < 0.5 || p > 2.0) errors.push('pitch_invalid');
  }
  if (request.speed !== undefined) {
    const s = Number(request.speed);
    if (!Number.isFinite(s) || s < 0.5 || s > 2.0) errors.push('speed_invalid');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an audio mix request. Returns { valid, errors } — never throws.
 */
export function validateMixRequest(request: AudioMixRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['request_required'] };
  }

  if (!isString(request.voiceoverUrl) || !request.voiceoverUrl.trim()) {
    errors.push('voiceover_url_required');
  } else if (!isUrlSafe(request.voiceoverUrl)) {
    errors.push('voiceover_url_unsafe');
  }

  if (request.musicUrl !== undefined && request.musicUrl !== '') {
    if (!isString(request.musicUrl) || !request.musicUrl.trim()) {
      errors.push('music_url_invalid');
    } else if (!isUrlSafe(request.musicUrl)) {
      errors.push('music_url_unsafe');
    }
  }

  if (
    typeof request.musicVolume !== 'number' ||
    !Number.isFinite(request.musicVolume) ||
    request.musicVolume < 0 ||
    request.musicVolume > 100
  ) {
    errors.push('music_volume_invalid');
  }
  if (
    typeof request.voiceVolume !== 'number' ||
    !Number.isFinite(request.voiceVolume) ||
    request.voiceVolume < 0 ||
    request.voiceVolume > 100
  ) {
    errors.push('voice_volume_invalid');
  }

  if (request.fadeInSec !== undefined) {
    const f = Number(request.fadeInSec);
    if (!Number.isFinite(f) || f < 0 || f > 60) errors.push('fade_in_invalid');
  }
  if (request.fadeOutSec !== undefined) {
    const f = Number(request.fadeOutSec);
    if (!Number.isFinite(f) || f < 0 || f > 60) errors.push('fade_out_invalid');
  }
  if (request.crossfadeSec !== undefined) {
    const f = Number(request.crossfadeSec);
    if (!Number.isFinite(f) || f < 0 || f > 30) errors.push('crossfade_invalid');
  }
  if (request.outputFormat && !VALID_FORMATS.has(request.outputFormat)) {
    errors.push('output_format_invalid');
  }

  return { valid: errors.length === 0, errors };
}

// ── Duration estimation ──

/**
 * Estimate TTS duration from word count and speed.
 * Assumes ~150 words per minute at 1.0x speed.
 */
export function estimateTTSDuration(text: string, speed?: number): number {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  const s = clampSpeed(speed);
  const minutes = words / 150;
  return Math.round((minutes / s) * 60 * 10) / 10; // 1 decimal place
}

// ── Public API ──

/**
 * Return voice profiles, optionally filtered by gender/tone/language.
 */
export function getVoiceProfiles(filters?: {
  gender?: VoiceGender;
  tone?: VoiceTone;
  language?: VoiceLanguage;
}): VoiceProfile[] {
  if (!filters) return [...VOICE_PROFILES];
  return VOICE_PROFILES.filter((v) => {
    if (filters.gender && v.gender !== filters.gender) return false;
    if (filters.tone && v.tone !== filters.tone) return false;
    if (filters.language && v.language !== filters.language) return false;
    return true;
  });
}

/**
 * Return music tracks, optionally filtered by mood/genre.
 */
export function getMusicLibrary(filters?: { mood?: MusicMood; genre?: string }): MusicTrack[] {
  if (!filters) return [...MUSIC_LIBRARY];
  return MUSIC_LIBRARY.filter((t) => {
    if (filters.mood && t.mood !== filters.mood) return false;
    if (filters.genre && t.genre !== filters.genre) return false;
    return true;
  });
}

/**
 * Return the catalog of music moods with display metadata.
 */
export function getMusicMoods(): Array<{ mood: MusicMood; name: string; description: string }> {
  return [...MUSIC_MOOD_META];
}

/**
 * Generate a TTS voiceover. Validates the request, selects a voice profile,
 * uses atlasChat to generate delivery instructions, and returns a TTSResult.
 * In dry-run mode (or when the real TTS API is not yet wired up) returns a
 * placeholder audio URL.
 */
export async function generateVoiceover(
  request: TTSRequest,
  planTier?: PlanTier,
): Promise<TTSResult> {
  const validation = validateTTSRequest(request);
  if (!validation.valid) {
    throw new Error(`invalid_tts_request: ${validation.errors.join(', ')}`);
  }

  const voice = selectVoice(request);
  const format: AudioFormat = request.format || 'mp3';
  const speed = clampSpeed(request.speed);
  const pitch = clampPitch(request.pitch);
  const wordCount = request.text.trim().split(/\s+/).filter(Boolean).length;
  const durationSec = estimateTTSDuration(request.text, speed);
  const dryRun = isDryRun();

  // Exercise the prompt engineering pipeline (resilient fallback on failure).
  await generateDeliveryInstructions(request, voice, planTier);

  // Placeholder audio URL — deterministic per voice/text so the UI can render.
  const seed = encodeURIComponent(`${voice.voiceId}-${wordCount}-${format}`);
  const audioUrl = dryRun
    ? `https://cdn.lazynext.local/audio/tts-placeholder-${seed}.${format}`
    : `https://cdn.lazynext.local/audio/tts-${seed}.${format}`;

  // Rough file size estimate: ~16kbps for voice at mp3, scaled by duration.
  const fileSize = dryRun ? 0 : Math.round(durationSec * 16 * 1024 / 8);

  return {
    audioUrl,
    durationSec,
    voiceUsed: { ...voice, pitch, speed },
    format,
    fileSize,
    text: request.text,
    wordCount,
    estimatedCost: TTS_CREDIT_COST,
  };
}

/**
 * Select music tracks matching the request. Filters by mood, duration, BPM
 * range, and genre. Returns matching tracks sorted by relevance (closest BPM
 * to the midpoint of the requested range, then closest duration).
 */
export async function selectMusic(request: MusicSelectionRequest): Promise<MusicTrack[]> {
  if (!request || !request.mood || !VALID_MOODS.has(request.mood)) {
    throw new Error('invalid_mood');
  }

  let tracks = MUSIC_LIBRARY.filter((t) => t.mood === request.mood);

  if (request.genre) {
    const g = request.genre.toLowerCase().trim();
    tracks = tracks.filter((t) => t.genre.toLowerCase().includes(g));
  }

  if (request.bpmRange) {
    const min = Number(request.bpmRange.min);
    const max = Number(request.bpmRange.max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      tracks = tracks.filter((t) => t.bpm >= min && t.bpm <= max);
    }
  }

  if (request.durationSec && Number.isFinite(request.durationSec) && request.durationSec > 0) {
    const target = request.durationSec;
    // Keep tracks within 20s of the requested duration, then sort by closeness.
    tracks = tracks
      .filter((t) => Math.abs(t.durationSec - target) <= 20)
      .sort((a, b) => Math.abs(a.durationSec - target) - Math.abs(b.durationSec - target));
  }

  // If a BPM range was given, sort by closeness to the midpoint.
  if (request.bpmRange) {
    const min = Number(request.bpmRange.min);
    const max = Number(request.bpmRange.max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      const mid = (min + max) / 2;
      tracks = [...tracks].sort(
        (a, b) => Math.abs(a.bpm - mid) - Math.abs(b.bpm - mid),
      );
    }
  }

  return tracks;
}

/**
 * Mix a voiceover with optional background music. Validates URLs (SSRF
 * protection), and in dry-run mode returns a placeholder mixed URL. In real
 * mode, would call an audio mixing service.
 */
export async function mixAudio(
  request: AudioMixRequest,
  planTier?: PlanTier,
): Promise<AudioMixResult> {
  const validation = validateMixRequest(request);
  if (!validation.valid) {
    throw new Error(`invalid_mix_request: ${validation.errors.join(', ')}`);
  }

  const format: AudioFormat = request.outputFormat || 'mp3';
  const dryRun = isDryRun();

  // Estimate mixed duration as the longer of the two tracks (placeholder).
  // In a real implementation we'd probe the audio files for their durations.
  const durationSec = 30; // placeholder
  const fileSize = dryRun ? 0 : Math.round(durationSec * 32 * 1024 / 8);

  const seed = encodeURIComponent(`${request.voiceoverUrl}-${format}`);
  const mixedAudioUrl = dryRun
    ? `https://cdn.lazynext.local/audio/mix-placeholder-${seed}.${format}`
    : `https://cdn.lazynext.local/audio/mix-${seed}.${format}`;

  const tracks: AudioMixResult['tracks'] = [
    { type: 'voiceover', url: request.voiceoverUrl, volume: request.voiceVolume },
  ];
  if (request.musicUrl) {
    tracks.push({ type: 'music', url: request.musicUrl, volume: request.musicVolume });
  }

  return {
    mixedAudioUrl,
    durationSec,
    format,
    fileSize,
    tracks,
  };
}
