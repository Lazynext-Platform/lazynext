/**
 * Narrative Ad Builder — story-driven ad creator with narrative arcs, character
 * development, and plot templates.
 *
 * Inspired by #12 (Narriq_Ads). Supports 8 narrative structures (3-act,
 * hero's journey, problem-solution, before/after, testimony, suspense/reveal,
 * emotional arc, documentary) and 8 genres.
 *
 * All generation uses the existing atlasChat() from src/lib/atlas.ts — no new
 * LLM dependency. Credit cost is exported as NARRATIVE_COST for the route layer.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

// ── Credit cost ──
export const NARRATIVE_COST = 5;

const CREATIVE_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const CREATIVE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const CREATIVE_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 6000);

/**
 * Resolve the creative LLM model for a given plan tier.
 * Falls back to the module-level CREATIVE_MODEL (which respects the CREATIVE_MODEL env override).
 */
function resolveCreativeModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

// ── Types ──

export type NarrativeStructure =
  | 'three_act'
  | 'heros_journey'
  | 'problem_solution'
  | 'before_after'
  | 'testimony'
  | 'suspense_reveal'
  | 'emotional_arc'
  | 'documentary';

export type Genre =
  | 'drama'
  | 'comedy'
  | 'inspirational'
  | 'educational'
  | 'lifestyle'
  | 'documentary'
  | 'fantasy'
  | 'realistic';

export interface NarrativeCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'mentor' | 'supporting' | 'narrator';
  description: string;
  motivation: string;
  arc: string; // character development description
  personalityTraits: string[];
}

export interface NarrativeScene {
  act: number; // 1, 2, or 3
  sceneNumber: number;
  title: string;
  description: string;
  characters: string[]; // character names present
  setting: string;
  mood: string;
  durationSec: number;
  dialogue?: Array<{ character: string; line: string }>;
  voiceover?: string;
  visualDirection: string;
  cameraAngle: string;
  transitionTo: string; // transition to next scene
}

export interface NarrativeAdRequest {
  productName: string;
  productDescription?: string;
  brandName?: string;
  structure: NarrativeStructure;
  genre: Genre;
  targetAudience?: string;
  durationSec?: number; // target total duration
  characters?: Array<{ name: string; role: string; description: string }>;
  keyMessage?: string;
  tone?: string;
}

export interface NarrativeAdResult {
  structure: NarrativeStructure;
  genre: Genre;
  title: string;
  logline: string; // one-sentence summary
  characters: NarrativeCharacter[];
  scenes: NarrativeScene[];
  totalDurationSec: number;
  theme: string;
  moral: string; // the takeaway message
  emotionalJourney: Array<{ timeSec: number; emotion: string; intensity: number }>;
  productIntegration: {
    placement: string; // when/how product appears
    revealType: string; // how product is revealed
    ctaPlacement: string;
    brandMentions: string[];
  };
  storyboard: Array<{
    sceneNumber: number;
    visualDescription: string;
    textOverlay?: string;
    durationSec: number;
  }>;
  script: string; // full script text
  adaptationNotes: string; // notes for adapting to different platforms
}

// ── Narrative structures ──

export const NARRATIVE_STRUCTURES: Array<{
  type: NarrativeStructure;
  name: string;
  description: string;
  acts: number;
}> = [
  {
    type: 'three_act',
    name: '3-Act Structure',
    description:
      'Classic setup, confrontation, and resolution. Establish the world, introduce conflict, then deliver the payoff.',
    acts: 3,
  },
  {
    type: 'heros_journey',
    name: "Hero's Journey",
    description:
      "The protagonist receives a call to adventure, faces trials, transforms, and returns changed — with the product as the key.",
    acts: 3,
  },
  {
    type: 'problem_solution',
    name: 'Problem-Solution',
    description:
      'Open on a relatable pain point, escalate the frustration, then reveal the product as the elegant solution.',
    acts: 2,
  },
  {
    type: 'before_after',
    name: 'Before & After',
    description:
      'Show the "before" state and its cost, then the transformation enabled by the product — a clear contrast arc.',
    acts: 2,
  },
  {
    type: 'testimony',
    name: 'Testimony',
    description:
      'A character gives a first-person account of their experience, building trust through authenticity and emotional honesty.',
    acts: 2,
  },
  {
    type: 'suspense_reveal',
    name: 'Suspense & Reveal',
    description:
      'Build curiosity and tension through withholding, then deliver a satisfying reveal where the product is the answer.',
    acts: 2,
  },
  {
    type: 'emotional_arc',
    name: 'Emotional Arc',
    description:
      'Guide the viewer through a deliberate emotional journey (e.g. frustration → hope → triumph) anchored by the product.',
    acts: 3,
  },
  {
    type: 'documentary',
    name: 'Documentary',
    description:
      'A grounded, factual narrative with a narrator voiceover, real-world stakes, and the product as the through-line.',
    acts: 2,
  },
];

export const GENRES: Array<{ type: Genre; name: string; description: string }> = [
  {
    type: 'drama',
    name: 'Drama',
    description: 'Earnest, emotionally charged storytelling with real stakes and character depth.',
  },
  {
    type: 'comedy',
    name: 'Comedy',
    description: 'Humor-driven, lighthearted, uses wit and timing to make the product memorable.',
  },
  {
    type: 'inspirational',
    name: 'Inspirational',
    description: 'Uplifting, aspirational — focuses on transformation and what is possible.',
  },
  {
    type: 'educational',
    name: 'Educational',
    description: 'Teaches the viewer something valuable while naturally integrating the product.',
  },
  {
    type: 'lifestyle',
    name: 'Lifestyle',
    description: 'Aspirational day-in-the-life framing that positions the product as part of a desired lifestyle.',
  },
  {
    type: 'documentary',
    name: 'Documentary',
    description: 'Grounded, journalistic tone with real-world context and credible narration.',
  },
  {
    type: 'fantasy',
    name: 'Fantasy',
    description: 'Imaginative, world-building narrative that uses metaphor and spectacle to showcase the product.',
  },
  {
    type: 'realistic',
    name: 'Realistic',
    description: 'Naturalistic, slice-of-life storytelling that feels authentic and relatable.',
  },
];

// ── Helpers (mirrors intelligence.ts / ugc-formats.ts) ──

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_narrative_output');
  return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => asStr(x)).filter(Boolean).slice(0, 30) : [];
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

// ── Validation ──

const VALID_STRUCTURES: NarrativeStructure[] = NARRATIVE_STRUCTURES.map((s) => s.type);
const VALID_GENRES: Genre[] = GENRES.map((g) => g.type);

/**
 * Validate a NarrativeAdRequest. Returns { valid, errors }.
 */
export function validateNarrativeRequest(request: NarrativeAdRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!request.productName || !request.productName.trim()) {
    errors.push('product_name_required');
  }
  if (!request.structure || !VALID_STRUCTURES.includes(request.structure)) {
    errors.push('invalid_structure');
  }
  if (!request.genre || !VALID_GENRES.includes(request.genre)) {
    errors.push('invalid_genre');
  }
  return { valid: errors.length === 0, errors };
}

/** Returns the catalog of available narrative structures. */
export function getNarrativeStructures(): typeof NARRATIVE_STRUCTURES {
  return NARRATIVE_STRUCTURES;
}

/** Returns the catalog of available genres. */
export function getGenres(): typeof GENRES {
  return GENRES;
}

// ── System prompt ──

const NARRATIVE_SYS_PROMPT = `You are a world-class narrative advertising writer and story architect. You craft story-driven ads that follow established narrative structures and genres, with rich character development, scene-by-scene breakdowns, and seamless product integration.

You understand that a great narrative ad is NOT a hard sell — it is a story that earns attention, makes the viewer feel something, and naturally positions the product as the catalyst for transformation.

Rules:
- Follow the selected narrative structure faithfully (act breakdown, beats, arc).
- Write in the voice and conventions of the selected genre.
- Every character must have a clear motivation and a discernible arc.
- Every scene must have: act, sceneNumber, title, description, characters present, setting, mood, durationSec, visualDirection, cameraAngle, and transitionTo.
- Include dialogue (character + line) and/or voiceover where it serves the story; omit when silence is stronger.
- Product integration must feel organic — never forced. The product is the turning point, not a billboard.
- Provide an emotional journey timeline mapping time → emotion → intensity (0-100).
- Provide a storyboard (one entry per scene) with visual description and optional text overlay.
- Provide the full script as readable text.
- Provide adaptation notes for repurposing across platforms (TikTok, Reels, Shorts, YouTube, TV).
- All text fields must be in clear, vivid English.
- Output ONLY valid JSON, no markdown, no explanation.

Output schema:
{
  "title": "ENGLISH: the ad's title",
  "logline": "ENGLISH: one-sentence summary of the story",
  "theme": "ENGLISH: the central theme",
  "moral": "ENGLISH: the takeaway message",
  "characters": [
    {
      "name": "ENGLISH: character name",
      "role": "protagonist | antagonist | mentor | supporting | narrator",
      "description": "ENGLISH: who they are",
      "motivation": "ENGLISH: what they want",
      "arc": "ENGLISH: how they change",
      "personalityTraits": ["ENGLISH: trait", "..."]
    }
  ],
  "scenes": [
    {
      "act": 1,
      "sceneNumber": 1,
      "title": "ENGLISH: scene title",
      "description": "ENGLISH: what happens",
      "characters": ["name", "..."],
      "setting": "ENGLISH: where and when",
      "mood": "ENGLISH: emotional tone",
      "durationSec": 5,
      "dialogue": [{ "character": "name", "line": "ENGLISH: spoken line" }],
      "voiceover": "ENGLISH: narrator line or empty",
      "visualDirection": "ENGLISH: what we see",
      "cameraAngle": "ENGLISH: camera direction",
      "transitionTo": "ENGLISH: how we move to the next scene"
    }
  ],
  "emotionalJourney": [
    { "timeSec": 0, "emotion": "ENGLISH: emotion", "intensity": 50 }
  ],
  "productIntegration": {
    "placement": "ENGLISH: when and how the product appears",
    "revealType": "ENGLISH: how the product is revealed",
    "ctaPlacement": "ENGLISH: where the CTA lives",
    "brandMentions": ["ENGLISH: brand mention context", "..."]
  },
  "storyboard": [
    {
      "sceneNumber": 1,
      "visualDescription": "ENGLISH: the visual",
      "textOverlay": "ENGLISH: on-screen text or empty",
      "durationSec": 5
    }
  ],
  "script": "ENGLISH: the full readable script text",
  "adaptationNotes": "ENGLISH: notes for adapting to different platforms"
}`;

// ── Generation ──

/**
 * Generate a complete narrative ad (characters, scenes, emotional journey,
 * product integration, storyboard, full script) following the selected
 * narrative structure and genre.
 */
export async function generateNarrativeAd(
  request: NarrativeAdRequest,
  planTier?: PlanTier,
): Promise<NarrativeAdResult> {
  const structure = NARRATIVE_STRUCTURES.find((s) => s.type === request.structure);
  const genre = GENRES.find((g) => g.type === request.genre);
  const targetDuration = request.durationSec ?? 60;

  const parts: string[] = [`Product: ${request.productName}`];
  if (request.productDescription) parts.push(`Product description: ${request.productDescription}`);
  if (request.brandName) parts.push(`Brand: ${request.brandName}`);
  if (request.targetAudience) parts.push(`Target audience: ${request.targetAudience}`);
  if (request.keyMessage) parts.push(`Key message: ${request.keyMessage}`);
  if (request.tone) parts.push(`Tone: ${request.tone}`);
  parts.push(`Narrative structure: ${structure?.name ?? request.structure} (${request.structure})`);
  if (structure) {
    parts.push(`Structure description: ${structure.description}`);
    parts.push(`Number of acts: ${structure.acts}`);
  }
  parts.push(`Genre: ${genre?.name ?? request.genre} (${request.genre})`);
  if (genre) parts.push(`Genre description: ${genre.description}`);
  parts.push(`Target total duration: ${targetDuration} seconds`);
  if (request.characters && request.characters.length) {
    parts.push('Seed characters (adapt and expand as needed):');
    for (const c of request.characters) {
      parts.push(`  - ${c.name} (${c.role}): ${c.description}`);
    }
  }
  parts.push('Output the narrative ad JSON now.');

  const raw = await atlasChat(
    [{ role: 'system', content: NARRATIVE_SYS_PROMPT }, { role: 'user', content: parts.join('\n') }],
    resolveCreativeModel(planTier), CREATIVE_MAX_TOKENS, CREATIVE_TIMEOUT_MS,
  );
  const j = extractJson(raw);

  // ── Characters ──
  const characters: NarrativeCharacter[] = (Array.isArray(j.characters) ? j.characters : [])
    .slice(0, 12)
    .map((c) => {
      const o = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
      const role = asStr(o.role, 'supporting') as NarrativeCharacter['role'];
      const validRoles: NarrativeCharacter['role'][] = [
        'protagonist', 'antagonist', 'mentor', 'supporting', 'narrator',
      ];
      return {
        name: asStr(o.name, 'Character'),
        role: validRoles.includes(role) ? role : 'supporting',
        description: asStr(o.description),
        motivation: asStr(o.motivation),
        arc: asStr(o.arc),
        personalityTraits: asStrArr(o.personalityTraits),
      };
    })
    .filter((c) => c.name);

  // ── Scenes ──
  const scenes: NarrativeScene[] = (Array.isArray(j.scenes) ? j.scenes : [])
    .slice(0, 20)
    .map((s, idx) => {
      const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
      const dialogue = Array.isArray(o.dialogue)
        ? o.dialogue
            .map((d) => {
              const dd = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
              const character = asStr(dd.character);
              const line = asStr(dd.line);
              return character && line ? { character, line } : null;
            })
            .filter((d): d is { character: string; line: string } => d !== null)
            .slice(0, 20)
        : undefined;
      return {
        act: asNum(o.act, 1, 1, 3),
        sceneNumber: asNum(o.sceneNumber, idx + 1, 1, 99),
        title: asStr(o.title, `Scene ${idx + 1}`),
        description: asStr(o.description),
        characters: asStrArr(o.characters),
        setting: asStr(o.setting),
        mood: asStr(o.mood),
        durationSec: asNum(o.durationSec, 5, 2, 60),
        dialogue: dialogue && dialogue.length ? dialogue : undefined,
        voiceover: asStr(o.voiceover) || undefined,
        visualDirection: asStr(o.visualDirection),
        cameraAngle: asStr(o.cameraAngle),
        transitionTo: asStr(o.transitionTo),
      };
    });

  // ── Emotional journey ──
  const emotionalJourney = (Array.isArray(j.emotionalJourney) ? j.emotionalJourney : [])
    .slice(0, 30)
    .map((e) => {
      const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
      return {
        timeSec: Math.max(0, asNum(o.timeSec, 0, 0, 600)),
        emotion: asStr(o.emotion),
        intensity: asNum(o.intensity, 50, 0, 100),
      };
    });

  // ── Product integration ──
  const pi = (j.productIntegration && typeof j.productIntegration === 'object'
    ? j.productIntegration
    : {}) as Record<string, unknown>;

  // ── Storyboard ──
  const storyboard = (Array.isArray(j.storyboard) ? j.storyboard : [])
    .slice(0, 20)
    .map((sb, idx) => {
      const o = (sb && typeof sb === 'object' ? sb : {}) as Record<string, unknown>;
      return {
        sceneNumber: asNum(o.sceneNumber, idx + 1, 1, 99),
        visualDescription: asStr(o.visualDescription),
        textOverlay: asStr(o.textOverlay) || undefined,
        durationSec: asNum(o.durationSec, 5, 2, 60),
      };
    });

  const totalDurationSec =
    scenes.reduce((sum, s) => sum + s.durationSec, 0) || targetDuration;

  return {
    structure: request.structure,
    genre: request.genre,
    title: asStr(j.title),
    logline: asStr(j.logline),
    characters,
    scenes,
    totalDurationSec,
    theme: asStr(j.theme),
    moral: asStr(j.moral),
    emotionalJourney,
    productIntegration: {
      placement: asStr(pi.placement),
      revealType: asStr(pi.revealType),
      ctaPlacement: asStr(pi.ctaPlacement),
      brandMentions: asStrArr(pi.brandMentions),
    },
    storyboard,
    script: asStr(j.script),
    adaptationNotes: asStr(j.adaptationNotes),
  };
}
