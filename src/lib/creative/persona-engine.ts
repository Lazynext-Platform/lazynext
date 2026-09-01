/**
 * Audience Persona Engine.
 *
 * AI-powered audience persona creation with demographics, psychographics,
 * pain points, channel preferences, and targeting recommendations. Includes
 * audience overlap analysis and persona-based creative adaptation.
 *
 * Uses the existing atlasChat() from src/lib/atlas.ts — no new LLM dependency.
 * Credit cost: PERSONA_COST (6 credits).
 */
import {
  atlasChat,
  resolveModel,
  extractJson,
  isDryRun,
  asStr,
  asStrArr as toolkitAsStrArr,
  CREATIVE_TIMEOUT_MS,
} from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

// ── Types ──

export type PersonaArchetype = 'decision_maker' | 'influencer' | 'end_user' | 'gatekeeper' | 'advocate';
export type ChannelPreference =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'email'
  | 'search'
  | 'display';
export type ContentPreference = 'video' | 'image' | 'text' | 'interactive' | 'podcast' | 'live_stream';
export type BuyingMotivation =
  | 'price'
  | 'quality'
  | 'convenience'
  | 'status'
  | 'social_proof'
  | 'innovation'
  | 'safety'
  | 'experience';

export interface Demographics {
  ageRange: { min: number; max: number };
  gender: 'male' | 'female' | 'all' | 'non-binary';
  incomeLevel: 'low' | 'lower_middle' | 'middle' | 'upper_middle' | 'high';
  education: 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate';
  location: 'urban' | 'suburban' | 'rural' | 'global';
  occupation?: string;
  familyStatus?: 'single' | 'married' | 'parent' | 'empty_nester';
}

export interface Psychographics {
  values: string[];
  interests: string[];
  lifestyle: string[];
  personalityTraits: string[];
  attitudes: string[];
  opinions: string[];
}

export interface PainPoint {
  painId: string;
  category: 'functional' | 'emotional' | 'social' | 'financial' | 'time';
  description: string;
  severity: number; // 1-10
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasionally';
  currentSolution?: string;
}

export interface ChannelAffinity {
  channel: ChannelPreference;
  affinity: number; // 0-100
  preferredContent: ContentPreference[];
  bestTimeToReach: string;
  avgSessionDuration: number;
}

export interface BuyingBehavior {
  motivation: BuyingMotivation;
  researchDepth: 'minimal' | 'moderate' | 'extensive';
  decisionSpeed: 'impulse' | 'quick' | 'considered' | 'lengthy';
  priceSensitivity: number; // 1-10
  brandLoyalty: number; // 1-10
  reviewReliance: number; // 1-10
  socialProofReliance: number; // 1-10
}

export interface Persona {
  personaId: string;
  name: string;
  archetype: PersonaArchetype;
  tagline: string;
  description: string;
  demographics: Demographics;
  psychographics: Psychographics;
  painPoints: PainPoint[];
  channelAffinities: ChannelAffinity[];
  buyingBehavior: BuyingBehavior;
  keyMessages: string[]; // messages that resonate with this persona
  preferredTone: string[];
  preferredFormats: ContentPreference[];
  objections: Array<{ objection: string; rebuttal: string }>;
  successStories: string[]; // brands/campaigns that successfully targeted this persona
  createdAt: string;
}

export interface PersonaOverlap {
  personaA: string;
  personaB: string;
  overlapScore: number; // 0-100
  sharedChannels: ChannelPreference[];
  sharedInterests: string[];
  sharedPainPoints: string[];
  recommendation: string;
}

export interface TargetingRecommendation {
  platform: ChannelPreference;
  audienceSize: number;
  targetingCriteria: string[];
  lookalikePotential: number; // 0-100
  estimatedCpm: number;
  bestAdFormats: string[];
  recommended: boolean;
  reasoning: string;
}

export interface PersonaEngineResult {
  personas: Persona[];
  overlaps: PersonaOverlap[];
  targetingRecommendations: TargetingRecommendation[];
  insights: Array<{
    insightId: string;
    type: 'audience_insight' | 'channel_insight' | 'messaging_insight' | 'competitive_insight';
    title: string;
    description: string;
    actionableRecommendation: string;
  }>;
  creativeAdaptations: Array<{
    personaId: string;
    personaName: string;
    hookStyle: string;
    toneStyle: string;
    ctaStyle: string;
    formatRecommendation: string;
  }>;
  dryRun?: boolean;
}

// ── Credit cost ──
export const PERSONA_COST = 6;

const PERSONA_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 8000);

// ── Archetype / channel metadata ──

const ARCHETYPES: Array<{ archetype: PersonaArchetype; name: string; description: string }> = [
  { archetype: 'decision_maker', name: 'Decision Maker', description: 'Holds the budget authority and final say on purchases.' },
  { archetype: 'influencer', name: 'Influencer', description: 'Shapes opinions and recommendations within a network or organization.' },
  { archetype: 'end_user', name: 'End User', description: 'The person who actually uses the product day to day.' },
  { archetype: 'gatekeeper', name: 'Gatekeeper', description: 'Controls access to the decision maker or the product itself.' },
  { archetype: 'advocate', name: 'Advocate', description: 'Promotes the product to others and drives word of mouth.' },
];

const CHANNELS: Array<{ channel: ChannelPreference; name: string; description: string }> = [
  { channel: 'tiktok', name: 'TikTok', description: 'Short-form vertical video, trend-driven, younger-skewing audience.' },
  { channel: 'instagram', name: 'Instagram', description: 'Visual storytelling, Reels, Stories, and shoppable posts.' },
  { channel: 'youtube', name: 'YouTube', description: 'Long- and short-form video with strong search and discovery.' },
  { channel: 'facebook', name: 'Facebook', description: 'Broad demographic reach with detailed interest targeting.' },
  { channel: 'linkedin', name: 'LinkedIn', description: 'Professional B2B targeting by role, industry, and seniority.' },
  { channel: 'twitter', name: 'Twitter / X', description: 'Real-time conversation and thought-leadership amplification.' },
  { channel: 'email', name: 'Email', description: 'Owned, direct lifecycle messaging with high retention.' },
  { channel: 'search', name: 'Search', description: 'Intent-based capture via paid and organic search.' },
  { channel: 'display', name: 'Display', description: 'Programmatic banner and native placements for awareness.' },
];

// ── Helpers ──

function asStrArr(v: unknown): string[] {
  return toolkitAsStrArr(v, 30);
}

function asNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

const ARCHETYPE_SET = new Set<PersonaArchetype>(ARCHETYPES.map((a) => a.archetype));
const CHANNEL_SET = new Set<ChannelPreference>(CHANNELS.map((c) => c.channel));
const CONTENT_SET = new Set<ContentPreference>(['video', 'image', 'text', 'interactive', 'podcast', 'live_stream']);
const MOTIVATION_SET = new Set<BuyingMotivation>([
  'price', 'quality', 'convenience', 'status', 'social_proof', 'innovation', 'safety', 'experience',
]);

function asArchetype(v: unknown): PersonaArchetype {
  const s = asStr(v, 'end_user');
  return ARCHETYPE_SET.has(s as PersonaArchetype) ? (s as PersonaArchetype) : 'end_user';
}

function asChannel(v: unknown): ChannelPreference {
  const s = asStr(v, 'search');
  return CHANNEL_SET.has(s as ChannelPreference) ? (s as ChannelPreference) : 'search';
}

function asContent(v: unknown): ContentPreference {
  const s = asStr(v, 'video');
  return CONTENT_SET.has(s as ContentPreference) ? (s as ContentPreference) : 'video';
}

function asContentArr(v: unknown): ContentPreference[] {
  return Array.isArray(v) ? v.map((x) => asContent(x)).filter((c, i, arr) => arr.indexOf(c) === i).slice(0, 6) : [];
}

function asMotivation(v: unknown): BuyingMotivation {
  const s = asStr(v, 'quality');
  return MOTIVATION_SET.has(s as BuyingMotivation) ? (s as BuyingMotivation) : 'quality';
}

function asStrUnion<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = asStr(v, fallback);
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

// ── System prompt ──

const PERSONA_SYS = `You are an expert audience research strategist and marketing persona architect.

You generate richly detailed, realistic buyer personas for a product. For each persona you produce:
- A memorable name, archetype, tagline, and description.
- Demographics (age range, gender, income level, education, location, optional occupation/family status).
- Psychographics (values, interests, lifestyle, personality traits, attitudes, opinions).
- 3-6 pain points (each with category, severity 1-10, frequency, and optional current solution).
- 2-5 channel affinities (channel, affinity 0-100, preferred content types, best time to reach, avg session duration in seconds).
- Buying behavior (motivation, research depth, decision speed, price sensitivity, brand loyalty, review reliance, social proof reliance — all 1-10).
- 3-6 key messages that resonate, preferred tones, preferred content formats.
- 2-4 objections with rebuttals.
- 2-4 success stories (brands/campaigns that targeted this persona well).

Archetypes MUST be one of: decision_maker, influencer, end_user, gatekeeper, advocate.
Channels MUST be one of: tiktok, instagram, youtube, facebook, linkedin, twitter, email, search, display.
Content types MUST be one of: video, image, text, interactive, podcast, live_stream.
Buying motivations MUST be one of: price, quality, convenience, status, social_proof, innovation, safety, experience.

Then produce supporting analysis:
- overlaps: for each unique persona pair, an overlap score (0-100), shared channels, shared interests, shared pain points, and a recommendation.
- targetingRecommendations: per relevant platform, audience size, targeting criteria, lookalike potential (0-100), estimated CPM, best ad formats, recommended boolean, and reasoning.
- insights: 3-6 categorized insights (audience_insight, channel_insight, messaging_insight, competitive_insight) with title, description, and actionable recommendation.
- creativeAdaptations: per persona, hook style, tone style, CTA style, and format recommendation.

Return ONLY valid JSON matching this shape:
{
  "personas": [ { "personaId": "p_1", "name": "...", "archetype": "...", "tagline": "...", "description": "...",
    "demographics": { "ageRange": { "min": 25, "max": 34 }, "gender": "all", "incomeLevel": "middle", "education": "bachelors", "location": "urban", "occupation": "...", "familyStatus": "single" },
    "psychographics": { "values": [], "interests": [], "lifestyle": [], "personalityTraits": [], "attitudes": [], "opinions": [] },
    "painPoints": [ { "painId": "pp_1", "category": "functional", "description": "...", "severity": 7, "frequency": "daily", "currentSolution": "..." } ],
    "channelAffinities": [ { "channel": "tiktok", "affinity": 85, "preferredContent": ["video"], "bestTimeToReach": "7-10pm", "avgSessionDuration": 600 } ],
    "buyingBehavior": { "motivation": "quality", "researchDepth": "moderate", "decisionSpeed": "considered", "priceSensitivity": 6, "brandLoyalty": 5, "reviewReliance": 7, "socialProofReliance": 8 },
    "keyMessages": [], "preferredTone": [], "preferredFormats": ["video"],
    "objections": [ { "objection": "...", "rebuttal": "..." } ], "successStories": [], "createdAt": "ISO8601" } ],
  "overlaps": [ { "personaA": "p_1", "personaB": "p_2", "overlapScore": 62, "sharedChannels": [], "sharedInterests": [], "sharedPainPoints": [], "recommendation": "..." } ],
  "targetingRecommendations": [ { "platform": "tiktok", "audienceSize": 1200000, "targetingCriteria": [], "lookalikePotential": 78, "estimatedCpm": 4.5, "bestAdFormats": [], "recommended": true, "reasoning": "..." } ],
  "insights": [ { "insightId": "ins_1", "type": "audience_insight", "title": "...", "description": "...", "actionableRecommendation": "..." } ],
  "creativeAdaptations": [ { "personaId": "p_1", "personaName": "...", "hookStyle": "...", "toneStyle": "...", "ctaStyle": "...", "formatRecommendation": "..." } ]
}`;

// ── Parsing ──

function parsePersona(o: Record<string, unknown>, idx: number): Persona {
  const d = (o.demographics && typeof o.demographics === 'object' ? o.demographics : {}) as Record<string, unknown>;
  const ar = (d.ageRange && typeof d.ageRange === 'object' ? d.ageRange : {}) as Record<string, unknown>;
  const ps = (o.psychographics && typeof o.psychographics === 'object' ? o.psychographics : {}) as Record<string, unknown>;
  const bb = (o.buyingBehavior && typeof o.buyingBehavior === 'object' ? o.buyingBehavior : {}) as Record<string, unknown>;

  const painPoints: PainPoint[] = (Array.isArray(o.painPoints) ? o.painPoints : []).slice(0, 8).map((p, i) => {
    const po = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    return {
      painId: asStr(po.painId, `pp_${idx + 1}_${i + 1}`),
      category: asStrUnion(po.category, ['functional', 'emotional', 'social', 'financial', 'time'], 'functional'),
      description: asStr(po.description),
      severity: asNum(po.severity, 5, 1, 10),
      frequency: asStrUnion(po.frequency, ['daily', 'weekly', 'monthly', 'occasionally'], 'weekly'),
      currentSolution: asStr(po.currentSolution, '') || undefined,
    };
  });

  const channelAffinities: ChannelAffinity[] = (Array.isArray(o.channelAffinities) ? o.channelAffinities : [])
    .slice(0, 6)
    .map((c) => {
      const co = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
      return {
        channel: asChannel(co.channel),
        affinity: asNum(co.affinity, 50, 0, 100),
        preferredContent: asContentArr(co.preferredContent),
        bestTimeToReach: asStr(co.bestTimeToReach),
        avgSessionDuration: Math.max(0, asNum(co.avgSessionDuration, 300, 0, 7200)),
      };
    });

  const objections = (Array.isArray(o.objections) ? o.objections : []).slice(0, 6).map((ob) => {
    const oo = (ob && typeof ob === 'object' ? ob : {}) as Record<string, unknown>;
    return { objection: asStr(oo.objection), rebuttal: asStr(oo.rebuttal) };
  }).filter((x) => x.objection);

  return {
    personaId: asStr(o.personaId, `p_${idx + 1}`),
    name: asStr(o.name, `Persona ${idx + 1}`),
    archetype: asArchetype(o.archetype),
    tagline: asStr(o.tagline),
    description: asStr(o.description),
    demographics: {
      ageRange: { min: asNum(ar.min, 25, 13, 100), max: asNum(ar.max, 34, 13, 100) },
      gender: asStrUnion(d.gender, ['male', 'female', 'all', 'non-binary'], 'all'),
      incomeLevel: asStrUnion(d.incomeLevel, ['low', 'lower_middle', 'middle', 'upper_middle', 'high'], 'middle'),
      education: asStrUnion(d.education, ['high_school', 'some_college', 'bachelors', 'masters', 'doctorate'], 'bachelors'),
      location: asStrUnion(d.location, ['urban', 'suburban', 'rural', 'global'], 'urban'),
      occupation: asStr(d.occupation, '') || undefined,
      familyStatus: d.familyStatus
        ? asStrUnion(d.familyStatus, ['single', 'married', 'parent', 'empty_nester'] as const, 'single')
        : undefined,
    },
    psychographics: {
      values: asStrArr(ps.values),
      interests: asStrArr(ps.interests),
      lifestyle: asStrArr(ps.lifestyle),
      personalityTraits: asStrArr(ps.personalityTraits),
      attitudes: asStrArr(ps.attitudes),
      opinions: asStrArr(ps.opinions),
    },
    painPoints,
    channelAffinities,
    buyingBehavior: {
      motivation: asMotivation(bb.motivation),
      researchDepth: asStrUnion(bb.researchDepth, ['minimal', 'moderate', 'extensive'], 'moderate'),
      decisionSpeed: asStrUnion(bb.decisionSpeed, ['impulse', 'quick', 'considered', 'lengthy'], 'considered'),
      priceSensitivity: asNum(bb.priceSensitivity, 5, 1, 10),
      brandLoyalty: asNum(bb.brandLoyalty, 5, 1, 10),
      reviewReliance: asNum(bb.reviewReliance, 5, 1, 10),
      socialProofReliance: asNum(bb.socialProofReliance, 5, 1, 10),
    },
    keyMessages: asStrArr(o.keyMessages),
    preferredTone: asStrArr(o.preferredTone),
    preferredFormats: asContentArr(o.preferredFormats),
    objections,
    successStories: asStrArr(o.successStories),
    createdAt: asStr(o.createdAt, new Date().toISOString()),
  };
}

function parseOverlap(o: Record<string, unknown>): PersonaOverlap {
  return {
    personaA: asStr(o.personaA),
    personaB: asStr(o.personaB),
    overlapScore: asNum(o.overlapScore, 0, 0, 100),
    sharedChannels: (Array.isArray(o.sharedChannels) ? o.sharedChannels : [])
      .map((c) => asChannel(c))
      .filter((c, i, arr) => arr.indexOf(c) === i)
      .slice(0, 9),
    sharedInterests: asStrArr(o.sharedInterests),
    sharedPainPoints: asStrArr(o.sharedPainPoints),
    recommendation: asStr(o.recommendation),
  };
}

function parseTargeting(o: Record<string, unknown>): TargetingRecommendation {
  return {
    platform: asChannel(o.platform),
    audienceSize: Math.max(0, asNum(o.audienceSize, 0, 0, 1_000_000_000)),
    targetingCriteria: asStrArr(o.targetingCriteria),
    lookalikePotential: asNum(o.lookalikePotential, 50, 0, 100),
    estimatedCpm: Math.max(0, asNum(o.estimatedCpm, 5, 0, 1000)),
    bestAdFormats: asStrArr(o.bestAdFormats),
    recommended: typeof o.recommended === 'boolean' ? o.recommended : false,
    reasoning: asStr(o.reasoning),
  };
}

function parseInsight(o: Record<string, unknown>, idx: number): PersonaEngineResult['insights'][number] {
  return {
    insightId: asStr(o.insightId, `ins_${idx + 1}`),
    type: asStrUnion(o.type, ['audience_insight', 'channel_insight', 'messaging_insight', 'competitive_insight'], 'audience_insight'),
    title: asStr(o.title),
    description: asStr(o.description),
    actionableRecommendation: asStr(o.actionableRecommendation),
  };
}

function parseCreativeAdaptation(o: Record<string, unknown>): PersonaEngineResult['creativeAdaptations'][number] {
  return {
    personaId: asStr(o.personaId),
    personaName: asStr(o.personaName),
    hookStyle: asStr(o.hookStyle),
    toneStyle: asStr(o.toneStyle),
    ctaStyle: asStr(o.ctaStyle),
    formatRecommendation: asStr(o.formatRecommendation),
  };
}

// ── Public API ──

/**
 * Generate audience personas for a product via atlasChat, then derive overlaps,
 * targeting recommendations, insights, and creative adaptations.
 */
export async function generatePersonas(request: {
  productName: string;
  productDescription?: string;
  market?: string;
  numberOfPersonas?: number;
  existingPersonas?: Persona[];
  planTier?: PlanTier;
}): Promise<PersonaEngineResult> {
  const count = Math.max(1, Math.min(5, request.numberOfPersonas ?? 3));

  const parts: string[] = [
    `Product: ${request.productName}`,
  ];
  if (request.productDescription) parts.push(`Product description: ${request.productDescription}`);
  if (request.market) parts.push(`Market / industry: ${request.market}`);
  parts.push(`Number of personas to generate: ${count}`);
  if (request.existingPersonas && request.existingPersonas.length) {
    parts.push(`Existing personas to build on (avoid duplicating): ${request.existingPersonas.map((p) => p.name).join(', ')}`);
  }
  parts.push('Output the persona engine JSON now.');

  if (isDryRun()) {
    return generateFallbackPersonas(request, count);
  }

  try {
    const raw = await atlasChat(
      [{ role: 'system', content: PERSONA_SYS }, { role: 'user', content: parts.join('\n') }],
      resolveModel(request.planTier),
      PERSONA_MAX_TOKENS,
      CREATIVE_TIMEOUT_MS,
    );
    const j = extractJson(raw);

  const personas: Persona[] = (Array.isArray(j.personas) ? j.personas : [])
    .slice(0, 5)
    .map((p, idx) => parsePersona((p && typeof p === 'object' ? p : {}) as Record<string, unknown>, idx))
    .filter((p) => p.name && p.description);

  const overlaps: PersonaOverlap[] = (Array.isArray(j.overlaps) ? j.overlaps : [])
    .slice(0, 20)
    .map((o) => parseOverlap((o && typeof o === 'object' ? o : {}) as Record<string, unknown>))
    .filter((o) => o.personaA && o.personaB);

  const targetingRecommendations: TargetingRecommendation[] = (Array.isArray(j.targetingRecommendations) ? j.targetingRecommendations : [])
    .slice(0, 12)
    .map((o) => parseTargeting((o && typeof o === 'object' ? o : {}) as Record<string, unknown>));

  const insights = (Array.isArray(j.insights) ? j.insights : [])
    .slice(0, 10)
    .map((o, idx) => parseInsight((o && typeof o === 'object' ? o : {}) as Record<string, unknown>, idx))
    .filter((i) => i.title);

  const creativeAdaptations = (Array.isArray(j.creativeAdaptations) ? j.creativeAdaptations : [])
    .slice(0, 5)
    .map((o) => parseCreativeAdaptation((o && typeof o === 'object' ? o : {}) as Record<string, unknown>))
    .filter((a) => a.personaId);

  // If the model omitted overlaps, compute them locally so callers always get them.
  const finalOverlaps = overlaps.length
    ? overlaps
    : computeAllOverlaps(personas);

  return {
    personas,
    overlaps: finalOverlaps,
    targetingRecommendations,
    insights,
    creativeAdaptations,
    dryRun: false,
  };
  } catch {
    return generateFallbackPersonas(request, count);
  }
}

function generateFallbackPersonas(
  request: { productName: string; productDescription?: string; market?: string },
  count: number,
): PersonaEngineResult {
  const personas: Persona[] = ([
    {
      personaId: 'persona_1',
      name: 'Practical Penny',
      archetype: 'decision_maker' as PersonaArchetype,
      tagline: 'Value-driven and practical',
      description: 'A budget-conscious decision maker who values practical solutions.',
      demographics: { ageRange: { min: 30, max: 45 }, gender: 'female' as const, incomeLevel: 'middle' as const, education: 'bachelors' as const, location: 'urban' as const },
      psychographics: { values: ['practicality', 'reliability'], interests: ['efficiency', 'value', 'reviews'], lifestyle: ['busy professional'], personalityTraits: ['analytical', 'cautious'], attitudes: ['skeptical'], opinions: ['value over flash'] },
      painPoints: [{ painId: 'pp_1', category: 'functional' as const, description: 'Wastes time on ineffective solutions', severity: 7, frequency: 'weekly' as const }],
      channelAffinities: [{ channel: 'facebook' as ChannelPreference, affinity: 80, preferredContent: ['video' as ContentPreference], bestTimeToReach: 'evening', avgSessionDuration: 20 }],
      buyingBehavior: { motivation: 'price' as BuyingMotivation, researchDepth: 'moderate' as const, decisionSpeed: 'considered' as const, priceSensitivity: 7, brandLoyalty: 5, reviewReliance: 8, socialProofReliance: 7 },
      keyMessages: ['Save time and money', 'Proven results'],
      preferredTone: ['professional', 'friendly'],
      preferredFormats: ['video' as ContentPreference, 'image' as ContentPreference],
      objections: [{ objection: 'Price too high', rebuttal: 'Long-term savings justify the cost' }],
      successStories: ['Value-focused brands with clear ROI messaging'],
      createdAt: new Date().toISOString(),
    },
    {
      personaId: 'persona_2',
      name: 'Trendsetter Tom',
      archetype: 'influencer' as PersonaArchetype,
      tagline: 'Always ahead of the curve',
      description: 'An early adopter who loves trying new products before others.',
      demographics: { ageRange: { min: 22, max: 35 }, gender: 'male' as const, incomeLevel: 'upper_middle' as const, education: 'bachelors' as const, location: 'urban' as const },
      psychographics: { values: ['innovation', 'status'], interests: ['trends', 'technology', 'social media'], lifestyle: ['social and active'], personalityTraits: ['adventurous', 'social'], attitudes: ['open-minded'], opinions: ['new is better'] },
      painPoints: [{ painId: 'pp_2', category: 'social' as const, description: 'FOMO on the latest products', severity: 5, frequency: 'daily' as const }],
      channelAffinities: [{ channel: 'tiktok' as ChannelPreference, affinity: 90, preferredContent: ['video' as ContentPreference], bestTimeToReach: 'late_night', avgSessionDuration: 45 }],
      buyingBehavior: { motivation: 'innovation' as BuyingMotivation, researchDepth: 'minimal' as const, decisionSpeed: 'impulse' as const, priceSensitivity: 4, brandLoyalty: 3, reviewReliance: 5, socialProofReliance: 8 },
      keyMessages: ['Be the first to try', 'Stay ahead of trends'],
      preferredTone: ['playful', 'casual'],
      preferredFormats: ['video' as ContentPreference, 'interactive' as ContentPreference],
      objections: [{ objection: 'Unproven product', rebuttal: 'Early adopters get the best results' }],
      successStories: ['Trendy brands with viral marketing'],
      createdAt: new Date().toISOString(),
    },
  ] as Persona[]).slice(0, count);

  return {
    personas,
    overlaps: computeAllOverlaps(personas),
    targetingRecommendations: [
      {
        platform: 'facebook',
        audienceSize: 500000,
        targetingCriteria: ['Lookalike audiences', 'Interest: shopping'],
        lookalikePotential: 70,
        estimatedCpm: 8.5,
        bestAdFormats: ['video', 'carousel'],
        recommended: true,
        reasoning: 'Practical Penny responds well to value-focused Facebook ads.',
      },
    ],
    insights: [
      {
        insightId: 'insight_1',
        type: 'audience_insight',
        title: 'Value messaging resonates across personas',
        description: 'Both personas respond to clear value propositions.',
        actionableRecommendation: 'Lead with value in ad creatives for this product.',
      },
    ],
    creativeAdaptations: personas.map((p) => ({
      personaId: p.personaId,
      personaName: p.name,
      hookStyle: 'Question-based hook',
      toneStyle: 'Conversational',
      ctaStyle: 'Soft CTA',
      formatRecommendation: '15-30s vertical video',
    })),
    dryRun: true,
  };
}

/** Compute overlap between two personas based on shared channels, interests, and pain points. */
export function calculatePersonaOverlap(a: Persona, b: Persona): PersonaOverlap {
  const aChannels = new Set(a.channelAffinities.map((c) => c.channel));
  const bChannels = new Set(b.channelAffinities.map((c) => c.channel));
  const sharedChannels: ChannelPreference[] = [...aChannels].filter((c) => bChannels.has(c));

  const aInterests = new Set(a.psychographics.interests.map((s) => s.toLowerCase()));
  const bInterests = new Set(b.psychographics.interests.map((s) => s.toLowerCase()));
  const sharedInterests = a.psychographics.interests.filter((s) => bInterests.has(s.toLowerCase()));

  const aPain = new Set(a.painPoints.map((p) => p.description.toLowerCase()));
  const bPain = new Set(b.painPoints.map((p) => p.description.toLowerCase()));
  const sharedPainPoints = a.painPoints.filter((p) => bPain.has(p.description.toLowerCase())).map((p) => p.description);

  // Weighted overlap score: channels (40%), interests (30%), pain points (30%).
  const channelScore = aChannels.size && bChannels.size
    ? (sharedChannels.length / Math.max(aChannels.size, bChannels.size)) * 40
    : 0;
  const interestScore = aInterests.size && bInterests.size
    ? (sharedInterests.length / Math.max(aInterests.size, bInterests.size)) * 30
    : 0;
  const painScore = aPain.size && bPain.size
    ? (sharedPainPoints.length / Math.max(aPain.size, bPain.size)) * 30
    : 0;

  const overlapScore = Math.round(Math.min(100, channelScore + interestScore + painScore));

  let recommendation: string;
  if (overlapScore >= 70) {
    recommendation = 'High overlap — consider a unified campaign with persona-specific messaging variants rather than fully separate funnels.';
  } else if (overlapScore >= 40) {
    recommendation = 'Moderate overlap — share channels and some creative assets, but tailor hooks and offers per persona.';
  } else {
    recommendation = 'Low overlap — treat as distinct audiences with separate targeting, creative, and offers.';
  }

  return {
    personaA: a.personaId,
    personaB: b.personaId,
    overlapScore,
    sharedChannels,
    sharedInterests,
    sharedPainPoints,
    recommendation,
  };
}

function computeAllOverlaps(personas: Persona[]): PersonaOverlap[] {
  const out: PersonaOverlap[] = [];
  for (let i = 0; i < personas.length; i++) {
    for (let k = i + 1; k < personas.length; k++) {
      out.push(calculatePersonaOverlap(personas[i], personas[k]));
    }
  }
  return out;
}

/** Generate per-platform targeting recommendations derived from persona channel affinities. */
export function generateTargetingRecommendations(personas: Persona[]): TargetingRecommendation[] {
  // Aggregate affinity per channel across personas.
  const byChannel = new Map<ChannelPreference, { total: number; count: number; personas: Set<string> }>();
  for (const p of personas) {
    for (const ca of p.channelAffinities) {
      const e = byChannel.get(ca.channel) ?? { total: 0, count: 0, personas: new Set<string>() };
      e.total += ca.affinity;
      e.count += 1;
      e.personas.add(p.personaId);
      byChannel.set(ca.channel, e);
    }
  }

  const CPM_ESTIMATES: Record<ChannelPreference, number> = {
    tiktok: 4.5,
    instagram: 6.0,
    youtube: 7.5,
    facebook: 5.0,
    linkedin: 12.0,
    twitter: 6.5,
    email: 1.5,
    search: 8.0,
    display: 3.0,
  };

  const recommendations: TargetingRecommendation[] = [];
  for (const [channel, agg] of byChannel) {
    const avgAffinity = agg.count ? agg.total / agg.count : 0;
    const personaCount = agg.personas.size;
    const baseSize = Math.round(250_000 + avgAffinity * 15_000 + personaCount * 120_000);
    const lookalikePotential = Math.min(100, Math.round(avgAffinity * 0.9 + personaCount * 5));
    const recommended = avgAffinity >= 60 && personaCount >= Math.max(1, Math.ceil(personas.length / 2));

    const criteria: string[] = [];
    for (const p of personas) {
      const ca = p.channelAffinities.find((c) => c.channel === channel);
      if (!ca) continue;
      criteria.push(`${p.name}: age ${p.demographics.ageRange.min}-${p.demographics.ageRange.max}, ${p.demographics.location}`);
    }

    recommendations.push({
      platform: channel,
      audienceSize: baseSize,
      targetingCriteria: criteria.slice(0, 8),
      lookalikePotential,
      estimatedCpm: CPM_ESTIMATES[channel],
      bestAdFormats: deriveBestFormats(personas, channel),
      recommended,
      reasoning: recommended
        ? `High average affinity (${Math.round(avgAffinity)}/100) across ${personaCount} persona(s) — prioritize this channel.`
        : `Moderate affinity (${Math.round(avgAffinity)}/100) across ${personaCount} persona(s) — use as a supporting channel.`,
    });
  }

  return recommendations.sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.lookalikePotential - a.lookalikePotential);
}

function deriveBestFormats(personas: Persona[], channel: ChannelPreference): string[] {
  const formats = new Map<string, number>();
  for (const p of personas) {
    const ca = p.channelAffinities.find((c) => c.channel === channel);
    if (!ca) continue;
    for (const f of ca.preferredContent) formats.set(f, (formats.get(f) ?? 0) + ca.affinity);
    for (const f of p.preferredFormats) formats.set(f, (formats.get(f) ?? 0) + 20);
  }
  return [...formats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f);
}

/** Generate per-persona creative adaptation guidance (hook/tone/CTA/format). */
export function generateCreativeAdaptations(personas: Persona[]): PersonaEngineResult['creativeAdaptations'] {
  return personas.map((p) => {
    const topChannel = p.channelAffinities.sort((a, b) => b.affinity - a.affinity)[0];
    const topFormat = p.preferredFormats[0] ?? topChannel?.preferredContent[0] ?? 'video';

    const hookByArchetype: Record<PersonaArchetype, string> = {
      decision_maker: 'Lead with quantified ROI and risk reduction in the first 3 seconds.',
      influencer: 'Lead with a bold, shareable claim that confers social status.',
      end_user: 'Lead with a relatable pain-point scenario and the moment of relief.',
      gatekeeper: 'Lead with compliance, safety, and ease-of-approval proof points.',
      advocate: 'Lead with a community mission and the user as the hero.',
    };

    const tone = p.preferredTone.length ? p.preferredTone.join(', ') : 'confident, clear';
    const ctaByMotivation: Record<BuyingMotivation, string> = {
      price: 'Direct price/offer CTA: "Claim your discount"',
      quality: 'Quality-led CTA: "See the difference"',
      convenience: 'Frictionless CTA: "Try it in 60 seconds"',
      status: 'Aspirational CTA: "Join the leaders"',
      social_proof: 'Proof-led CTA: "See why thousands switched"',
      innovation: 'Innovation CTA: "Be an early adopter"',
      safety: 'Reassurance CTA: "Start risk-free"',
      experience: 'Experience CTA: "Feel the difference"',
    };

    return {
      personaId: p.personaId,
      personaName: p.name,
      hookStyle: hookByArchetype[p.archetype],
      toneStyle: tone,
      ctaStyle: ctaByMotivation[p.buyingBehavior.motivation],
      formatRecommendation: `Lead with ${topFormat} on ${topChannel?.channel ?? 'search'}; adapt ratio and pacing to ${p.buyingBehavior.decisionSpeed} decision speed.`,
    };
  });
}

/** Return the full list of persona archetypes with friendly names and descriptions. */
export function getPersonaArchetypes(): Array<{ archetype: PersonaArchetype; name: string; description: string }> {
  return ARCHETYPES.map((a) => ({ ...a }));
}

/** Return the full list of supported channels with friendly names and descriptions. */
export function getChannels(): Array<{ channel: ChannelPreference; name: string; description: string }> {
  return CHANNELS.map((c) => ({ ...c }));
}

/** Validate a persona generation request. */
export function validatePersonaRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const productName = typeof request.productName === 'string' ? request.productName.trim() : '';
  if (!productName) errors.push('productName is required');

  if (request.numberOfPersonas !== undefined) {
    const n = Number(request.numberOfPersonas);
    if (!Number.isFinite(n) || n < 1 || n > 5) errors.push('numberOfPersonas must be between 1 and 5');
  }

  if (request.productDescription !== undefined && typeof request.productDescription !== 'string') {
    errors.push('productDescription must be a string');
  }
  if (request.market !== undefined && typeof request.market !== 'string') {
    errors.push('market must be a string');
  }

  return { valid: errors.length === 0, errors };
}
