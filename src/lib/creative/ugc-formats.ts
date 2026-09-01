/**
 * UGC Ad Formats — testimonial, reaction, unboxing, before/after, tutorial,
 * review, and comparison templates with hook-first UGC scripts and native
 * platform formats (TikTok / Reels / Shorts).
 *
 * Inspired by #5 (ugc-ad-ai) and #10 (Open-AI-UGC).
 *
 * All generation uses the existing atlasChat() from src/lib/atlas.ts — no new
 * LLM dependency. Credit cost is exported as UGC_COST for the route layer.
 */
import {
  atlasChat,
  resolveModel,
  extractJson,
  asStr,
  asStrArr as toolkitAsStrArr,
  CREATIVE_TIMEOUT_MS,
  CREATIVE_MAX_TOKENS,
} from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

// ── Credit cost ──
export const UGC_COST = 4;

function resolveCreativeModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

// ── Types ──

export type UgcFormatType =
  | 'testimonial'
  | 'reaction'
  | 'unboxing'
  | 'before_after'
  | 'tutorial'
  | 'review'
  | 'comparison';

export type PlatformFormat =
  | 'tiktok'
  | 'reels'
  | 'shorts'
  | 'snapchat'
  | 'facebook_story';

export type CreatorPersona =
  | 'enthusiastic_customer'
  | 'expert_reviewer'
  | 'casual_user'
  | 'influencer'
  | 'everyday_person';

export interface UgcScene {
  sceneNumber: number;
  durationSec: number;
  shotType: string;
  description: string;
  textOverlay?: string;
  voiceover?: string;
  bRoll?: string;
}

export interface UgcTemplate {
  type: UgcFormatType;
  name: string;
  description: string;
  structure: UgcScene[];
  durationSec: number;
  hookType: string;
  recommendedPlatforms: PlatformFormat[];
}

export interface UgcAdRequest {
  productName: string;
  productDescription?: string;
  format: UgcFormatType;
  platform: PlatformFormat;
  persona: CreatorPersona;
  durationSec?: number;
  brandName?: string;
  keyBenefits?: string[];
  targetAudience?: string;
}

export interface UgcAdResult {
  format: UgcFormatType;
  platform: PlatformFormat;
  persona: CreatorPersona;
  scenes: UgcScene[];
  hookText: string;
  scriptText: string;
  captionText: string;
  hashtags: string[];
  callToAction: string;
  estimatedDurationSec: number;
  visualNotes: string;
  audioNotes: string;
}

// ── Helpers (mirrors intelligence.ts) ──

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_ugc_output');
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

// ── UGC Templates (one per format type) ──

export const UGC_TEMPLATES: Record<UgcFormatType, UgcTemplate> = {
  testimonial: {
    type: 'testimonial',
    name: 'Customer Testimonial',
    description:
      'A real customer shares their authentic experience with the product, focusing on the transformation and emotional payoff.',
    durationSec: 30,
    hookType: 'relatable_problem',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      {
        sceneNumber: 1,
        durationSec: 3,
        shotType: 'close-up selfie',
        description: 'Creator looks into camera with a relatable problem statement.',
        textOverlay: 'POV: you finally found the solution',
        voiceover: "I never thought I'd say this about a product...",
        bRoll: 'Creator holding product',
      },
      {
        sceneNumber: 2,
        durationSec: 6,
        shotType: 'medium shot',
        description: 'Creator explains the before state and frustration.',
        voiceover: 'Before I found this, I was struggling with...',
        bRoll: 'B-roll of the problem',
      },
      {
        sceneNumber: 3,
        durationSec: 8,
        shotType: 'product demo',
        description: 'Creator demonstrates the product in use.',
        voiceover: 'Then I tried [product] and everything changed.',
        bRoll: 'Product in action',
      },
      {
        sceneNumber: 4,
        durationSec: 6,
        shotType: 'close-up selfie',
        description: 'Creator shares the result and emotional payoff.',
        voiceover: 'Now I feel confident and ready to recommend it.',
        textOverlay: 'Highly recommend!',
      },
      {
        sceneNumber: 5,
        durationSec: 4,
        shotType: 'product hero',
        description: 'Product close-up with CTA overlay.',
        textOverlay: 'Link in bio',
        voiceover: 'Get yours today — link in bio.',
      },
    ],
  },
  reaction: {
    type: 'reaction',
    name: 'First Reaction',
    description:
      'Creator reacts to the product for the first time — genuine surprise and excitement drive curiosity and engagement.',
    durationSec: 25,
    hookType: 'curiosity_gap',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts', 'snapchat'],
    structure: [
      {
        sceneNumber: 1,
        durationSec: 3,
        shotType: 'close-up selfie',
        description: 'Creator holds unopened package with excited expression.',
        textOverlay: 'Wait for it...',
        voiceover: 'Okay, I have no idea what this is going to be like.',
      },
      {
        sceneNumber: 2,
        durationSec: 5,
        shotType: 'medium shot',
        description: 'Creator opens / reveals the product with genuine reaction.',
        voiceover: 'Oh wow — okay, this is actually really cool.',
        bRoll: 'Unboxing reveal',
      },
      {
        sceneNumber: 3,
        durationSec: 8,
        shotType: 'product demo',
        description: 'Creator tries the product and reacts in real time.',
        voiceover: "I wasn't expecting it to work this well.",
        bRoll: 'Product in use',
      },
      {
        sceneNumber: 4,
        durationSec: 5,
        shotType: 'close-up selfie',
        description: 'Creator summarizes reaction and gives verdict.',
        voiceover: 'Honestly? 10 out of 10. You need this.',
        textOverlay: '10/10 would buy again',
      },
      {
        sceneNumber: 5,
        durationSec: 4,
        shotType: 'product hero',
        description: 'Product shot with CTA.',
        textOverlay: 'Try it yourself',
        voiceover: 'Link in bio to get yours.',
      },
    ],
  },
  unboxing: {
    type: 'unboxing',
    name: 'Unboxing & First Look',
    description:
      'ASMR-style unboxing that builds anticipation through packaging details and first impressions.',
    durationSec: 35,
    hookType: 'sensory_hook',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      {
        sceneNumber: 1,
        durationSec: 4,
        shotType: 'close-up hands',
        description: 'Hands rest on the sealed package, building anticipation.',
        textOverlay: 'Unboxing [product]',
        bRoll: 'Package on table',
        voiceover: "Let's see what's inside.",
      },
      {
        sceneNumber: 2,
        durationSec: 8,
        shotType: 'close-up hands',
        description: 'Slow unboxing with ASMR audio — peeling, opening, revealing.',
        voiceover: 'The packaging alone feels premium.',
        bRoll: 'ASMR unboxing audio',
      },
      {
        sceneNumber: 3,
        durationSec: 6,
        shotType: 'product hero',
        description: 'First full reveal of the product.',
        textOverlay: 'First look!',
        voiceover: 'Okay, this looks even better in person.',
      },
      {
        sceneNumber: 4,
        durationSec: 10,
        shotType: 'product demo',
        description: 'Creator shows key features and accessories.',
        voiceover: "Here's what comes in the box and why it matters.",
        bRoll: 'Feature close-ups',
      },
      {
        sceneNumber: 5,
        durationSec: 4,
        shotType: 'close-up selfie',
        description: 'Creator gives first-impression verdict and CTA.',
        voiceover: 'First impression: obsessed. Link in bio.',
        textOverlay: 'Link in bio',
      },
    ],
  },
  before_after: {
    type: 'before_after',
    name: 'Before & After',
    description:
      'Dramatic before/after transformation that proves the product works visually.',
    durationSec: 30,
    hookType: 'transformation',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts', 'facebook_story'],
    structure: [
      {
        sceneNumber: 1,
        durationSec: 4,
        shotType: 'before shot',
        description: 'Show the "before" state clearly and honestly.',
        textOverlay: 'BEFORE',
        voiceover: "This is what I was dealing with before...",
        bRoll: 'Before state',
      },
      {
        sceneNumber: 2,
        durationSec: 3,
        shotType: 'transition',
        description: 'Quick transition / wipe to the after state.',
        textOverlay: 'After using [product] for 2 weeks...',
        voiceover: 'Fast forward two weeks.',
      },
      {
        sceneNumber: 3,
        durationSec: 8,
        shotType: 'after shot',
        description: 'Reveal the "after" state with visible improvement.',
        textOverlay: 'AFTER',
        voiceover: 'And this is the result. I am honestly shocked.',
        bRoll: 'After state',
      },
      {
        sceneNumber: 4,
        durationSec: 8,
        shotType: 'product demo',
        description: 'Show how the product was used to achieve the result.',
        voiceover: "Here's exactly how I used it.",
        bRoll: 'Product in use',
      },
      {
        sceneNumber: 5,
        durationSec: 4,
        shotType: 'close-up selfie',
        description: 'Creator endorses product and CTA.',
        voiceover: 'If you have the same struggle, try it. Link in bio.',
        textOverlay: 'Link in bio',
      },
    ],
  },
  tutorial: {
    type: 'tutorial',
    name: 'How-To Tutorial',
    description:
      'Educational step-by-step tutorial showing how to get the most out of the product.',
    durationSec: 45,
    hookType: 'value_promise',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      {
        sceneNumber: 1,
        durationSec: 4,
        shotType: 'close-up selfie',
        description: 'Creator states the value promise / what viewers will learn.',
        textOverlay: 'How to get the most out of [product]',
        voiceover: "Here's the hack nobody tells you about [product].",
      },
      {
        sceneNumber: 2,
        durationSec: 10,
        shotType: 'product demo',
        description: 'Step 1 — setup or preparation.',
        textOverlay: 'Step 1',
        voiceover: 'First, set it up like this.',
        bRoll: 'Step 1 demo',
      },
      {
        sceneNumber: 3,
        durationSec: 12,
        shotType: 'product demo',
        description: 'Step 2 — the main technique or usage.',
        textOverlay: 'Step 2',
        voiceover: 'Now here is the part that makes the biggest difference.',
        bRoll: 'Step 2 demo',
      },
      {
        sceneNumber: 4,
        durationSec: 10,
        shotType: 'product demo',
        description: 'Step 3 — finishing / result.',
        textOverlay: 'Step 3',
        voiceover: 'Finish it off and look at that result.',
        bRoll: 'Final result',
      },
      {
        sceneNumber: 5,
        durationSec: 5,
        shotType: 'close-up selfie',
        description: 'Recap and CTA.',
        voiceover: 'Save this for later and grab yours — link in bio.',
        textOverlay: 'Save & share',
      },
    ],
  },
  review: {
    type: 'review',
    name: 'Honest Review',
    description:
      'Balanced, trustworthy review covering pros, cons, and final verdict to build credibility.',
    durationSec: 40,
    hookType: 'honest_take',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts', 'facebook_story'],
    structure: [
      {
        sceneNumber: 1,
        durationSec: 4,
        shotType: 'close-up selfie',
        description: 'Creator sets up an honest, no-BS review framing.',
        textOverlay: 'Honest review: [product]',
        voiceover: "I have been using this for a month. Here is my honest take.",
      },
      {
        sceneNumber: 2,
        durationSec: 10,
        shotType: 'product demo',
        description: 'Cover the pros / what works well.',
        textOverlay: 'The good',
        voiceover: "Here is what I genuinely love about it.",
        bRoll: 'Pros demo',
      },
      {
        sceneNumber: 3,
        durationSec: 8,
        shotType: 'medium shot',
        description: 'Cover the cons / what could be better.',
        textOverlay: 'The not-so-good',
        voiceover: "Now, things I wish were different.",
      },
      {
        sceneNumber: 4,
        durationSec: 8,
        shotType: 'product demo',
        description: 'Who this is / is not for.',
        textOverlay: 'Who is this for?',
        voiceover: "I would recommend this if you are... but skip it if you are...",
        bRoll: 'Use-case examples',
      },
      {
        sceneNumber: 5,
        durationSec: 5,
        shotType: 'close-up selfie',
        description: 'Final verdict and CTA.',
        textOverlay: 'Verdict: 8.5/10',
        voiceover: 'Final verdict: worth it. Link in bio.',
      },
    ],
  },
  comparison: {
    type: 'comparison',
    name: 'Product Comparison',
    description:
      'Side-by-side comparison against an alternative, highlighting why this product wins.',
    durationSec: 40,
    hookType: 'versus',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      {
        sceneNumber: 1,
        durationSec: 4,
        shotType: 'split screen',
        description: 'Introduce the two products being compared.',
        textOverlay: '[product] vs the alternative',
        voiceover: "I tried both so you do not have to. Here is the winner.",
      },
      {
        sceneNumber: 2,
        durationSec: 10,
        shotType: 'side-by-side demo',
        description: 'Compare on key feature #1.',
        textOverlay: 'Feature 1',
        voiceover: "First up, let's compare on [feature].",
        bRoll: 'Side-by-side demo',
      },
      {
        sceneNumber: 3,
        durationSec: 10,
        shotType: 'side-by-side demo',
        description: 'Compare on key feature #2.',
        textOverlay: 'Feature 2',
        voiceover: "Now the thing that actually matters most: [feature].",
        bRoll: 'Side-by-side demo',
      },
      {
        sceneNumber: 4,
        durationSec: 8,
        shotType: 'close-up selfie',
        description: 'Declare the winner with reasoning.',
        textOverlay: 'The winner: [product]',
        voiceover: "For me, [product] wins because...",
      },
      {
        sceneNumber: 5,
        durationSec: 5,
        shotType: 'product hero',
        description: 'Winning product hero shot with CTA.',
        textOverlay: 'Get the winner — link in bio',
        voiceover: 'Grab the winner — link in bio.',
      },
    ],
  },
};

// ── Platform hashtag generation ──

const PLATFORM_BASE_HASHTAGS: Record<PlatformFormat, string[]> = {
  tiktok: ['fyp', 'foryou', 'tiktokmademebuyit', 'tiktokshop'],
  reels: ['reels', 'reelsinstagram', 'instagood', 'explore'],
  shorts: ['shorts', 'youtubeshorts', 'shortsfeed', 'ytshorts'],
  snapchat: ['snapchat', 'snap', 'spotlight'],
  facebook_story: ['facebookstory', 'fbstory', 'story'],
};

const CATEGORY_HASHTAGS: Record<string, string[]> = {
  beauty: ['beauty', 'skincare', 'makeup', 'beautytok'],
  tech: ['tech', 'gadgets', 'techtok', 'unboxing'],
  fitness: ['fitness', 'workout', 'gymtok', 'fitnesstips'],
  food: ['food', 'foodie', 'recipe', 'foodtok'],
  fashion: ['fashion', 'ootd', 'style', 'fashiontok'],
  home: ['home', 'homedecor', 'amazonfinds', 'homehacks'],
  default: ['viral', 'trending', 'musthave', 'productreview'],
};

/**
 * Returns platform-appropriate hashtags for a UGC ad.
 * Combines platform-specific tags with category-relevant tags.
 */
export function getPlatformHashtags(
  platform: PlatformFormat,
  productCategory?: string,
): string[] {
  const platformTags = PLATFORM_BASE_HASHTAGS[platform] ?? [];
  const category = (productCategory || '').toLowerCase().trim();
  const categoryTags =
    CATEGORY_HASHTAGS[category] ?? CATEGORY_HASHTAGS.default;
  // Deduplicate while preserving order (platform tags first).
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...platformTags, ...categoryTags]) {
    const clean = tag.replace(/^#/, '').toLowerCase();
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out.slice(0, 12);
}

// ── Persona guidelines ──

export interface PersonaGuidelines {
  persona: CreatorPersona;
  name: string;
  voice: string;
  style: string;
  doSay: string[];
  avoid: string[];
  energyLevel: 'low' | 'medium' | 'high';
}

const PERSONA_GUIDELINES: Record<CreatorPersona, PersonaGuidelines> = {
  enthusiastic_customer: {
    persona: 'enthusiastic_customer',
    name: 'Enthusiastic Customer',
    voice: 'Excited, genuine, personal — speaks from first-hand experience.',
    style: 'Fast-paced, high energy, lots of "I" statements and emotional reactions.',
    doSay: [
      'I am obsessed with this',
      'It literally changed my routine',
      'You guys have to try this',
    ],
    avoid: ['corporate jargon', 'overly technical claims', 'scripted-sounding lines'],
    energyLevel: 'high',
  },
  expert_reviewer: {
    persona: 'expert_reviewer',
    name: 'Expert Reviewer',
    voice: 'Authoritative, analytical, balanced — backs claims with reasoning.',
    style: 'Calm, structured, covers pros and cons honestly to build trust.',
    doSay: [
      'After testing this for [time], here is my assessment',
      'The build quality is [specific]',
      'Compared to alternatives, this excels at [feature]',
    ],
    avoid: ['hype without evidence', 'ignoring downsides', 'vague superlatives'],
    energyLevel: 'medium',
  },
  casual_user: {
    persona: 'casual_user',
    name: 'Casual User',
    voice: 'Relaxed, conversational, relatable — like talking to a friend.',
    style: 'Low pressure, natural, mentions the product as part of daily life.',
    doSay: [
      'So I have been using this for a bit',
      'It is honestly pretty great',
      'Not gonna lie, I was surprised',
    ],
    avoid: ['salesy language', 'exaggerated claims', 'forced enthusiasm'],
    energyLevel: 'low',
  },
  influencer: {
    persona: 'influencer',
    name: 'Influencer',
    voice: 'Aspirational, trend-aware, confident — positions product as a must-have.',
    style: 'Polished but authentic, leverages personal brand and aesthetic.',
    doSay: [
      'My followers have been asking about this',
      'This is my new go-to',
      'Run, do not walk',
    ],
    avoid: ['overly casual slang if it does not fit brand', 'negative framing', 'long explanations'],
    energyLevel: 'high',
  },
  everyday_person: {
    persona: 'everyday_person',
    name: 'Everyday Person',
    voice: 'Normal, unscripted, authentic — the most relatable UGC persona.',
    style: 'Imperfect, genuine, feels like a real customer not a creator.',
    doSay: [
      'I do not usually post about products but',
      'Just wanted to share because it actually helped',
      'No one asked me to say this',
    ],
    avoid: ['polished influencer speak', 'perfect lighting / staging cues', 'catchphrase endings'],
    energyLevel: 'medium',
  },
};

/**
 * Returns persona voice/style guidelines for UGC script generation.
 */
export function getPersonaGuidelines(persona: CreatorPersona): PersonaGuidelines {
  return PERSONA_GUIDELINES[persona] ?? PERSONA_GUIDELINES.everyday_person;
}

// ── UGC ad generation ──

const UGC_SYS_PROMPT = `You are a world-class UGC (user-generated content) ad scriptwriter for short-form video platforms (TikTok, Instagram Reels, YouTube Shorts, Snapchat, Facebook Stories).

You write hook-first, native-feeling UGC scripts that do NOT look like ads. The first 3 seconds MUST stop the scroll.

Rules:
- Write in the voice of the specified creator persona.
- Every scene has a shot type, visual description, optional text overlay, optional voiceover, and optional B-roll note.
- The hook (scene 1) is the most important part — make it scroll-stopping.
- Keep language natural and conversational — never scripted or salesy.
- Output ONLY valid JSON, no markdown, no explanation.

Output schema:
{
  "hookText": "ENGLISH: the scroll-stopping opening line",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSec": 3,
      "shotType": "close-up selfie",
      "description": "ENGLISH: what happens visually",
      "textOverlay": "ENGLISH: on-screen text or empty",
      "voiceover": "ENGLISH: spoken line or empty",
      "bRoll": "ENGLISH: B-roll note or empty"
    }
  ],
  "scriptText": "ENGLISH: the full spoken script concatenated",
  "captionText": "ENGLISH: the post caption",
  "callToAction": "ENGLISH: the CTA",
  "visualNotes": "ENGLISH: overall visual direction notes",
  "audioNotes": "ENGLISH: music / sound design notes"
}`;

/**
 * Generate a complete UGC ad (scenes, hook, script, caption, hashtags, CTA)
 * for the given product, format, platform, and persona.
 */
export async function generateUgcAd(
  request: UgcAdRequest,
  planTier?: PlanTier,
): Promise<UgcAdResult> {
  const template = UGC_TEMPLATES[request.format];
  const persona = getPersonaGuidelines(request.persona);
  const targetDuration = request.durationSec ?? template.durationSec;
  const hashtags = getPlatformHashtags(request.platform);

  const parts: string[] = [
    `Product: ${request.productName}`,
  ];
  if (request.productDescription) parts.push(`Product description: ${request.productDescription}`);
  if (request.brandName) parts.push(`Brand: ${request.brandName}`);
  if (request.keyBenefits && request.keyBenefits.length) {
    parts.push(`Key benefits: ${request.keyBenefits.join(', ')}`);
  }
  if (request.targetAudience) parts.push(`Target audience: ${request.targetAudience}`);
  parts.push(`UGC format: ${template.name} (${request.format})`);
  parts.push(`Format description: ${template.description}`);
  parts.push(`Hook type: ${template.hookType}`);
  parts.push(`Platform: ${request.platform}`);
  parts.push(`Target total duration: ${targetDuration} seconds`);
  parts.push(`Creator persona: ${persona.name}`);
  parts.push(`Persona voice: ${persona.voice}`);
  parts.push(`Persona style: ${persona.style}`);
  parts.push(`Persona energy: ${persona.energyLevel}`);
  parts.push(`Do say: ${persona.doSay.join('; ')}`);
  parts.push(`Avoid: ${persona.avoid.join('; ')}`);
  parts.push(`Reference structure (adapt, do not copy verbatim):`);
  parts.push(
    template.structure
      .map((s) => `  Scene ${s.sceneNumber} (${s.durationSec}s, ${s.shotType}): ${s.description}`)
      .join('\n'),
  );
  parts.push('Output the UGC ad JSON now.');

  const raw = await atlasChat(
    [{ role: 'system', content: UGC_SYS_PROMPT }, { role: 'user', content: parts.join('\n') }],
    resolveCreativeModel(planTier), CREATIVE_MAX_TOKENS, CREATIVE_TIMEOUT_MS,
  );
  const j = extractJson(raw);

  const scenes: UgcScene[] = (Array.isArray(j.scenes) ? j.scenes : [])
    .slice(0, 10)
    .map((s, idx) => {
      const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
      return {
        sceneNumber: asNum(o.sceneNumber, idx + 1, 1, 99),
        durationSec: asNum(o.durationSec, 5, 2, 30),
        shotType: asStr(o.shotType, 'medium shot'),
        description: asStr(o.description),
        textOverlay: asStr(o.textOverlay) || undefined,
        voiceover: asStr(o.voiceover) || undefined,
        bRoll: asStr(o.bRoll) || undefined,
      };
    });

  const estimatedDurationSec =
    scenes.reduce((sum, s) => sum + s.durationSec, 0) || targetDuration;

  return {
    format: request.format,
    platform: request.platform,
    persona: request.persona,
    scenes,
    hookText: asStr(j.hookText),
    scriptText: asStr(j.scriptText),
    captionText: asStr(j.captionText),
    hashtags,
    callToAction: asStr(j.callToAction, 'Link in bio'),
    estimatedDurationSec,
    visualNotes: asStr(j.visualNotes),
    audioNotes: asStr(j.audioNotes),
  };
}
