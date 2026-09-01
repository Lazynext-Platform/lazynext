/**
 * Brand-to-Multi-Concept Flow.
 *
 * An orchestrated pipeline: URL (or product description) → brand extraction →
 * multiple divergent ad concepts (each with its own angle, script, and
 * storyboard) in one pass.
 *
 * Inspired by AdsTurbo/product-page-to-ad-brief (#40, MIT licensed) — the only
 * ADAPTER_INTEGRATE repo from the research audit — adapted for LazyNext's
 * e-commerce creative workflow with concept diversity scoring, best-concept
 * recommendation, and cross-concept insights.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { isDryRun } from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

export const BRAND_CONCEPTS_COST = 10;

// ── Types ──

export type SourceType = 'url' | 'description';

export type EmotionalTrigger =
  | 'fear'
  | 'aspiration'
  | 'humor'
  | 'urgency'
  | 'curiosity'
  | 'social_proof'
  | 'transformation'
  | 'comparison'
  | 'nostalgia'
  | 'empowerment';

// ── Interfaces ──

export interface ConceptFrame {
  frameNumber: number;
  timestamp: string;
  visual: string;
  audio: string;
  text: string;
}

export interface AdConcept {
  id: string;
  name: string;
  angle: string;
  emotionalTrigger: EmotionalTrigger;
  hook: string;
  script: string;
  storyboard: ConceptFrame[];
  estimatedDuration: string;
  targetEmotion: string;
  cta: string;
  platformFit: Record<string, number>;
}

export interface BrandExtraction {
  brandName: string;
  category: string;
  valueProps: string[];
  targetAudience: string;
  tone: string;
  keyDifferentiators: string[];
}

export interface BrandConceptsResult {
  brand: BrandExtraction;
  concepts: AdConcept[];
  diversityScore: number;
  recommendedConceptId: string;
  recommendationReason: string;
  crossConceptInsights: string[];
  dryRun?: boolean;
}

// ── Lookup functions ──

export function getEmotionalTriggers(): Array<{
  trigger: EmotionalTrigger;
  name: string;
  description: string;
}> {
  return [
    { trigger: 'fear', name: 'Fear', description: 'Loss aversion or problem avoidance' },
    { trigger: 'aspiration', name: 'Aspiration', description: 'Desire for a better self or lifestyle' },
    { trigger: 'humor', name: 'Humor', description: 'Entertainment and shareability' },
    { trigger: 'urgency', name: 'Urgency', description: 'Scarcity and time-sensitivity' },
    { trigger: 'curiosity', name: 'Curiosity', description: 'Intrigue and information gap' },
    { trigger: 'social_proof', name: 'Social Proof', description: 'Community and validation' },
    { trigger: 'transformation', name: 'Transformation', description: 'Before/after journey' },
    { trigger: 'comparison', name: 'Comparison', description: 'Versus alternatives' },
    { trigger: 'nostalgia', name: 'Nostalgia', description: 'Emotional memory and comfort' },
    { trigger: 'empowerment', name: 'Empowerment', description: 'Confidence and capability' },
  ];
}

export function getSourceTypes(): Array<{ type: SourceType; name: string; description: string }> {
  return [
    { type: 'url', name: 'Product URL', description: 'Extract brand info from a product page URL' },
    { type: 'description', name: 'Product Description', description: 'Provide a product description directly' },
  ];
}

// ── Calculations ──

/**
 * Calculate a diversity score (0-100) for a set of concepts.
 * Measures how distinct the concepts are from each other based on
 * emotional triggers, angles, and hooks. A higher score means more diversity.
 */
export function calculateDiversityScore(concepts: AdConcept[]): number {
  if (concepts.length <= 1) return 0;

  // Trigger diversity: how many unique emotional triggers are used
  const triggers = new Set(concepts.map((c) => c.emotionalTrigger));
  const triggerDiversity = (triggers.size / concepts.length) * 100;

  // Angle diversity: measure textual overlap between angles
  const angleWords = concepts.map((c) => new Set(c.angle.toLowerCase().split(/\s+/)));
  let angleOverlapSum = 0;
  let pairs = 0;
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const shared = [...angleWords[i]].filter((w) => w.length > 3 && angleWords[j].has(w));
      const union = new Set([...angleWords[i], ...angleWords[j]]);
      angleOverlapSum += shared.length / Math.max(union.size, 1);
      pairs++;
    }
  }
  const avgAngleOverlap = pairs > 0 ? angleOverlapSum / pairs : 0;
  const angleDiversity = (1 - avgAngleOverlap) * 100;

  // Hook diversity: measure textual overlap between hooks
  const hookWords = concepts.map((c) => new Set(c.hook.toLowerCase().split(/\s+/)));
  let hookOverlapSum = 0;
  let hookPairs = 0;
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const shared = [...hookWords[i]].filter((w) => w.length > 3 && hookWords[j].has(w));
      const union = new Set([...hookWords[i], ...hookWords[j]]);
      hookOverlapSum += shared.length / Math.max(union.size, 1);
      hookPairs++;
    }
  }
  const avgHookOverlap = hookPairs > 0 ? hookOverlapSum / hookPairs : 0;
  const hookDiversity = (1 - avgHookOverlap) * 100;

  // Weighted combination: trigger diversity is most important, then angle, then hook
  const score = triggerDiversity * 0.4 + angleDiversity * 0.35 + hookDiversity * 0.25;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Score an individual concept (0-100) for recommendation purposes.
 * Considers hook strength, script length, storyboard completeness, and platform fit.
 */
export function calculateConceptScore(concept: AdConcept, targetPlatform?: string): number {
  let score = 50;

  // Hook strength: longer hooks with strong words tend to perform better
  const hookWords = concept.hook.split(/\s+/);
  const strongWords = ['you', 'now', 'stop', 'imagine', 'what', 'why', 'how', 'never', 'always', 'secret'];
  const strongCount = hookWords.filter((w) => strongWords.includes(w.toLowerCase())).length;
  score += Math.min(strongCount * 5, 15);

  // Hook length: sweet spot is 8-20 words
  if (hookWords.length >= 8 && hookWords.length <= 20) score += 10;
  else if (hookWords.length < 5) score -= 5;

  // Script completeness
  const scriptWords = concept.script.split(/\s+/);
  if (scriptWords.length >= 50) score += 10;
  else if (scriptWords.length < 20) score -= 10;

  // Storyboard completeness: 3-6 frames is ideal
  const frameCount = concept.storyboard.length;
  if (frameCount >= 3 && frameCount <= 6) score += 10;
  else if (frameCount < 3) score -= 10;

  // Platform fit: if a target platform is specified, weight its fit score
  if (targetPlatform && concept.platformFit[targetPlatform] !== undefined) {
    const fit = concept.platformFit[targetPlatform];
    score += Math.round((fit - 50) * 0.3);
  }

  // CTA presence and strength
  if (concept.cta && concept.cta.length > 5) score += 5;
  const ctaStrongWords = ['now', 'today', 'shop', 'buy', 'get', 'try', 'free'];
  if (ctaStrongWords.some((w) => concept.cta.toLowerCase().includes(w))) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Recommend the strongest concept based on concept scores.
 * Returns the concept id and a human-readable reason.
 */
export function recommendConcept(
  concepts: AdConcept[],
  targetPlatform?: string,
): { conceptId: string; reason: string } {
  if (concepts.length === 0) return { conceptId: '', reason: 'No concepts available.' };
  if (concepts.length === 1) return { conceptId: concepts[0].id, reason: 'Only one concept generated.' };

  const scored = concepts.map((c) => ({
    concept: c,
    score: calculateConceptScore(c, targetPlatform),
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const triggerName =
    getEmotionalTriggers().find((t) => t.trigger === best.concept.emotionalTrigger)?.name ||
    best.concept.emotionalTrigger;

  const reason = `Concept "${best.concept.name}" scored highest (${best.score}/100) with a strong ${triggerName.toLowerCase()} angle, ${
    best.concept.storyboard.length
  }-frame storyboard, and ${targetPlatform ? `strong ${targetPlatform} platform fit` : 'balanced platform fit'}.`;

  return { conceptId: best.concept.id, reason };
}

/**
 * Generate cross-concept insights: common themes, unique elements, and platform fit analysis.
 */
export function generateCrossConceptInsights(concepts: AdConcept[], brand: BrandExtraction): string[] {
  const insights: string[] = [];

  // Common themes: words that appear across multiple concept angles
  const allAngleWords = concepts.flatMap((c) => c.angle.toLowerCase().split(/\s+/));
  const wordCounts: Record<string, number> = {};
  for (const w of allAngleWords) {
    if (w.length > 4) wordCounts[w] = (wordCounts[w] || 0) + 1;
  }
  const commonWords = Object.entries(wordCounts)
    .filter(([, count]) => count >= Math.ceil(concepts.length / 2))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
  if (commonWords.length > 0) {
    insights.push(`Common themes across concepts: ${commonWords.join(', ')} — these resonate with the ${brand.brandName} brand positioning.`);
  }

  // Trigger distribution
  const triggerCounts: Record<string, number> = {};
  for (const c of concepts) {
    triggerCounts[c.emotionalTrigger] = (triggerCounts[c.emotionalTrigger] || 0) + 1;
  }
  const triggerList = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, count]) => `${t} (${count})`)
    .join(', ');
  insights.push(`Emotional trigger distribution: ${triggerList} — diversifying triggers maximizes audience reach.`);

  // Unique elements: concepts with rare triggers
  const rareTriggers = Object.entries(triggerCounts)
    .filter(([, count]) => count === 1)
    .map(([t]) => t);
  if (rareTriggers.length > 0) {
    insights.push(`Unique angles to test: ${rareTriggers.join(', ')} — these differentiate from the mainstream approach.`);
  }

  // Platform fit analysis
  const platforms = new Set(concepts.flatMap((c) => Object.keys(c.platformFit)));
  for (const platform of platforms) {
    const fits = concepts.map((c) => c.platformFit[platform] || 0);
    const avgFit = Math.round(fits.reduce((s, f) => s + f, 0) / fits.length);
    const bestFit = Math.max(...fits);
    if (avgFit > 0) {
      insights.push(`${platform}: average fit ${avgFit}/100, best fit ${bestFit}/100 — ${avgFit >= 70 ? 'strong platform alignment' : avgFit >= 50 ? 'moderate alignment, consider adapting' : 'weak alignment, needs platform-specific version'}.`);
    }
  }

  // CTA diversity
  const uniqueCtas = new Set(concepts.map((c) => c.cta.toLowerCase()));
  if (uniqueCtas.size === concepts.length) {
    insights.push('All concepts use unique CTAs — good for A/B testing different action drivers.');
  } else {
    insights.push(`${uniqueCtas.size} unique CTAs across ${concepts.length} concepts — consider diversifying CTAs for better testing.`);
  }

  return insights;
}

// ── Validation ──

export function validateBrandConceptsRequest(input: {
  sourceContent?: string;
  sourceType?: string;
  conceptCount?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.sourceContent || typeof input.sourceContent !== 'string' || !input.sourceContent.trim()) {
    errors.push('sourceContent is required');
  }
  if (input.sourceType && input.sourceType !== 'url' && input.sourceType !== 'description') {
    errors.push('sourceType must be "url" or "description"');
  }
  if (input.conceptCount !== undefined) {
    if (typeof input.conceptCount !== 'number' || input.conceptCount < 2 || input.conceptCount > 5) {
      errors.push('conceptCount must be between 2 and 5');
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── Helpers ──

function boundConceptCount(count: number | undefined): number {
  if (typeof count !== 'number' || isNaN(count)) return 3;
  return Math.max(2, Math.min(5, Math.round(count)));
}

const VALID_TRIGGERS: EmotionalTrigger[] = [
  'fear', 'aspiration', 'humor', 'urgency', 'curiosity',
  'social_proof', 'transformation', 'comparison', 'nostalgia', 'empowerment',
];

function coerceTrigger(value: unknown): EmotionalTrigger {
  if (typeof value === 'string' && VALID_TRIGGERS.includes(value as EmotionalTrigger)) {
    return value as EmotionalTrigger;
  }
  return 'curiosity';
}

function coercePlatformFit(value: unknown): Record<string, number> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = typeof v === 'number' ? Math.max(0, Math.min(100, v)) : 50;
    }
    return result;
  }
  return { meta: 70, tiktok: 65, youtube: 60, instagram: 65 };
}

// ── AI brand-to-concepts generation ──

export async function generateBrandConcepts(params: {
  sourceType: SourceType;
  sourceContent: string;
  productName?: string;
  targetPlatform?: string;
  conceptCount?: number;
  planTier: PlanTier;
}): Promise<BrandConceptsResult> {
  const model = getLLMModel(params.planTier);
  const conceptCount = boundConceptCount(params.conceptCount);

  if (isDryRun()) {
    return { ...generateFallbackBrandConcepts(params), dryRun: true };
  }

  const sys = `You are an expert e-commerce advertising creative director. Given a product URL or description, extract the brand identity and generate ${conceptCount} DIVERGENT ad concepts — each with a DIFFERENT emotional angle, hook, full script, and storyboard. The concepts must be maximally different from each other in tone, approach, and emotional trigger. Return JSON only.
{
  "brand": {
    "brandName":"...","category":"...","valueProps":[],"targetAudience":"...","tone":"...","keyDifferentiators":[]
  },
  "concepts": [{
    "id":"c1","name":"...","angle":"...","emotionalTrigger":"fear|aspiration|humor|urgency|curiosity|social_proof|transformation|comparison|nostalgia|empowerment",
    "hook":"first 3 seconds...","script":"full ad script...","storyboard":[{"frameNumber":1,"timestamp":"0-3s","visual":"...","audio":"...","text":"..."}],
    "estimatedDuration":"15s","targetEmotion":"...","cta":"...","platformFit":{"meta":0-100,"tiktok":0-100,"youtube":0-100,"instagram":0-100}
  }],
  "crossConceptInsights":[]
}
Source type: ${params.sourceType}
Product name: ${params.productName || 'not specified'}
Target platform: ${params.targetPlatform || 'general'}
Generate exactly ${conceptCount} concepts with distinct emotional triggers.`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        {
          role: 'user',
          content: `Generate ${conceptCount} divergent ad concepts from this ${params.sourceType}:\n${params.sourceContent.slice(0, 8000)}`,
        },
      ],
      model,
      4500,
    );
    const parsed = JSON.parse(raw);

    const brand: BrandExtraction = {
      brandName: String(parsed.brand?.brandName || params.productName || 'Unknown Brand').slice(0, 200),
      category: String(parsed.brand?.category || 'General').slice(0, 200),
      valueProps: Array.isArray(parsed.brand?.valueProps)
        ? parsed.brand.valueProps.map((v: unknown) => String(v).slice(0, 300)).slice(0, 10)
        : [],
      targetAudience: String(parsed.brand?.targetAudience || 'General audience').slice(0, 500),
      tone: String(parsed.brand?.tone || 'Professional').slice(0, 200),
      keyDifferentiators: Array.isArray(parsed.brand?.keyDifferentiators)
        ? parsed.brand.keyDifferentiators.map((d: unknown) => String(d).slice(0, 300)).slice(0, 10)
        : [],
    };

    const concepts: AdConcept[] = (parsed.concepts || []).slice(0, conceptCount).map((c: Record<string, unknown>, i: number) => ({
      id: String(c.id || `c${i + 1}`).slice(0, 50),
      name: String(c.name || `Concept ${i + 1}`).slice(0, 200),
      angle: String(c.angle || '').slice(0, 1000),
      emotionalTrigger: coerceTrigger(c.emotionalTrigger),
      hook: String(c.hook || '').slice(0, 500),
      script: String(c.script || '').slice(0, 5000),
      storyboard: Array.isArray(c.storyboard)
        ? c.storyboard.slice(0, 6).map((f: Record<string, unknown>, j: number) => ({
            frameNumber: typeof f.frameNumber === 'number' ? f.frameNumber : j + 1,
            timestamp: String(f.timestamp || `${j * 3}-${j * 3 + 3}s`).slice(0, 50),
            visual: String(f.visual || '').slice(0, 500),
            audio: String(f.audio || '').slice(0, 500),
            text: String(f.text || '').slice(0, 300),
          }))
        : [],
      estimatedDuration: String(c.estimatedDuration || '15s').slice(0, 50),
      targetEmotion: String(c.targetEmotion || '').slice(0, 200),
      cta: String(c.cta || '').slice(0, 300),
      platformFit: coercePlatformFit(c.platformFit),
    }));

    if (concepts.length === 0) {
      return generateFallbackBrandConcepts(params);
    }

    const diversityScore = calculateDiversityScore(concepts);
    const recommendation = recommendConcept(concepts, params.targetPlatform);
    const crossConceptInsights = Array.isArray(parsed.crossConceptInsights)
      ? parsed.crossConceptInsights.map((s: unknown) => String(s).slice(0, 500)).slice(0, 10)
      : generateCrossConceptInsights(concepts, brand);

    return {
      brand,
      concepts,
      diversityScore,
      recommendedConceptId: recommendation.conceptId,
      recommendationReason: recommendation.reason,
      crossConceptInsights,
    };
  } catch {
    return { ...generateFallbackBrandConcepts(params), dryRun: true };
  }
}

// ── Deterministic fallback (no AI) ──

function generateFallbackBrandConcepts(params: {
  sourceType: SourceType;
  sourceContent: string;
  productName?: string;
  targetPlatform?: string;
  conceptCount?: number;
}): BrandConceptsResult {
  const content = params.sourceContent.slice(0, 2000);
  const conceptCount = boundConceptCount(params.conceptCount);
  const productName = params.productName || 'the product';

  // Derive a simple brand name from the source
  const brandName = params.sourceType === 'url'
    ? (() => {
        try {
          const u = new URL(content.split(/\s+/)[0]);
          return u.hostname.replace(/^www\./, '').split('.')[0].replace(/\b\w/g, (c) => c.toUpperCase());
        } catch {
          return 'Your Brand';
        }
      })()
    : content.split(/\s+/).slice(0, 2).join(' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Your Brand';

  const brand: BrandExtraction = {
    brandName,
    category: 'E-commerce product',
    valueProps: ['Quality you can trust', 'Great value for money', 'Designed for everyday use'],
    targetAudience: 'Online shoppers aged 18-45 looking for practical solutions',
    tone: 'Confident and approachable',
    keyDifferentiators: ['Premium materials', 'Customer-first service', 'Fast shipping'],
  };

  // Define a pool of divergent concept templates
  const conceptTemplates: Array<Omit<AdConcept, 'id' | 'platformFit'>> = [
    {
      name: 'The Problem Solver',
      angle: 'Lead with the pain point your audience faces daily, then reveal the product as the solution they have been searching for.',
      emotionalTrigger: 'fear',
      hook: `Stop scrolling if you are tired of dealing with this every single day...`,
      script: `We have all been there. You try everything, and nothing works. It is frustrating, time-consuming, and honestly exhausting. But what if there was a better way? Meet ${productName}. Designed specifically to solve this exact problem, ${productName} changes everything. No more wasted time. No more frustration. Just results. Try ${productName} today and see the difference for yourself.`,
      storyboard: [
        { frameNumber: 1, timestamp: '0-3s', visual: 'Close-up of frustrated person dealing with the problem', audio: 'Tense, relatable background music', text: 'Sound familiar?' },
        { frameNumber: 2, timestamp: '3-6s', visual: 'Quick montage of failed attempts', audio: 'Music builds frustration', text: 'Nothing works...' },
        { frameNumber: 3, timestamp: '6-10s', visual: 'Product reveal with dramatic lighting', audio: 'Music shifts to uplifting', text: `Meet ${productName}` },
        { frameNumber: 4, timestamp: '10-13s', visual: 'Person using product with a smile', audio: 'Positive, energetic music', text: 'Problem solved.' },
        { frameNumber: 5, timestamp: '13-15s', visual: 'CTA screen with product and offer', audio: 'Confident outro', text: 'Shop now' },
      ],
      estimatedDuration: '15s',
      targetEmotion: 'Relief and confidence',
      cta: 'Shop now and solve it today',
    },
    {
      name: 'The Aspiration Story',
      angle: 'Paint a picture of the ideal life your audience wants, then show how the product bridges the gap between where they are and where they want to be.',
      emotionalTrigger: 'aspiration',
      hook: `Imagine waking up every day feeling like this...`,
      script: `Close your eyes for a second. Imagine your ideal day — everything just works, everything feels effortless. That is not a fantasy. That is what ${productName} gives you. It is not just a product. It is the upgrade your routine has been waiting for. Join thousands who have already made the switch. Your better self is one click away.`,
      storyboard: [
        { frameNumber: 1, timestamp: '0-3s', visual: 'Dreamy, aspirational lifestyle shot', audio: 'Soft, inspiring music', text: 'Imagine this...' },
        { frameNumber: 2, timestamp: '3-7s', visual: 'Smooth transition to product in beautiful setting', audio: 'Music swells', text: 'This could be you' },
        { frameNumber: 3, timestamp: '7-11s', visual: 'Happy person enjoying the product naturally', audio: 'Uplifting beat', text: `${productName} makes it real` },
        { frameNumber: 4, timestamp: '11-15s', visual: 'CTA with aspirational imagery', audio: 'Inspiring crescendo', text: 'Start your journey today' },
      ],
      estimatedDuration: '15s',
      targetEmotion: 'Desire and inspiration',
      cta: 'Start your journey today',
    },
    {
      name: 'The Social Proof Hit',
      angle: 'Lead with real customer testimonials and social validation to build instant trust and credibility.',
      emotionalTrigger: 'social_proof',
      hook: `Over 50,000 happy customers cannot be wrong...`,
      script: `Do not just take our word for it. Listen to what real customers are saying about ${productName}. "This changed my life." "I wish I found this sooner." "Best purchase I made all year." With over 50,000 five-star reviews, ${productName} is proven to deliver. Join the community. See why everyone is switching.`,
      storyboard: [
        { frameNumber: 1, timestamp: '0-3s', visual: 'Animated counter showing 50,000+ reviews', audio: 'Upbeat, trustworthy music', text: '50,000+ reviews' },
        { frameNumber: 2, timestamp: '3-7s', visual: 'Split screen of happy customer faces', audio: 'Cheerful background', text: '"This changed my life"' },
        { frameNumber: 3, timestamp: '7-11s', visual: 'Product with floating star ratings', audio: 'Music builds', text: '4.9/5 average rating' },
        { frameNumber: 4, timestamp: '11-15s', visual: 'CTA with review snippets', audio: 'Confident outro', text: 'Join 50,000+ happy customers' },
      ],
      estimatedDuration: '15s',
      targetEmotion: 'Trust and belonging',
      cta: 'Join 50,000+ happy customers',
    },
    {
      name: 'The Curiosity Teaser',
      angle: 'Create an information gap that compels the viewer to keep watching to find out the answer.',
      emotionalTrigger: 'curiosity',
      hook: `You will never guess what happens at 0:12...`,
      script: `What you are about to see might surprise you. Most people do not know this about ${productName}, but once you see it, you cannot unsee it. Keep watching. Trust us, it is worth it. Ready? Here is the secret that everyone is talking about. ${productName} is not what you think it is. It is so much more.`,
      storyboard: [
        { frameNumber: 1, timestamp: '0-3s', visual: 'Mysterious close-up, partially obscured product', audio: 'Intriguing, suspenseful music', text: 'Wait for it...' },
        { frameNumber: 2, timestamp: '3-7s', visual: 'Quick cuts building tension', audio: 'Music builds suspense', text: 'You will not believe this' },
        { frameNumber: 3, timestamp: '7-12s', visual: 'Dramatic product reveal', audio: 'Music drops, then explodes', text: 'There it is.' },
        { frameNumber: 4, timestamp: '12-15s', visual: 'CTA with product in action', audio: 'Energetic outro', text: 'See it in action' },
      ],
      estimatedDuration: '15s',
      targetEmotion: 'Intrigue and surprise',
      cta: 'See the full reveal now',
    },
    {
      name: 'The Transformation Journey',
      angle: 'Show a dramatic before-and-after transformation that proves the product works.',
      emotionalTrigger: 'transformation',
      hook: `Watch this transformation in real time...`,
      script: `This is the before. This is what most people settle for every day. Now watch what happens when you add ${productName} to the picture. The difference is night and day. This is not editing tricks. This is real. Real people, real results. If you want this kind of transformation in your life, ${productName} is your answer.`,
      storyboard: [
        { frameNumber: 1, timestamp: '0-3s', visual: 'Clear "before" shot', audio: 'Neutral, steady music', text: 'Before' },
        { frameNumber: 2, timestamp: '3-6s', visual: 'Transition effect introducing product', audio: 'Music shifts', text: 'Then ${productName}...' },
        { frameNumber: 3, timestamp: '6-10s', visual: 'Dramatic "after" reveal', audio: 'Triumphant music', text: 'After' },
        { frameNumber: 4, timestamp: '10-13s', visual: 'Side-by-side comparison', audio: 'Confident beat', text: 'Real results' },
        { frameNumber: 5, timestamp: '13-15s', visual: 'CTA with before/after', audio: 'Strong outro', text: 'Get your transformation' },
      ],
      estimatedDuration: '15s',
      targetEmotion: 'Awe and motivation',
      cta: 'Get your transformation today',
    },
  ];

  // Select the requested number of concepts from the template pool
  const selectedTemplates = conceptTemplates.slice(0, conceptCount);

  const concepts: AdConcept[] = selectedTemplates.map((tmpl, i) => ({
    ...tmpl,
    id: `c${i + 1}`,
    platformFit: {
      meta: 65 + (i % 3) * 10,
      tiktok: 70 + (i % 2) * 10,
      youtube: 60 + (i % 4) * 8,
      instagram: 68 + (i % 3) * 7,
    },
  }));

  const diversityScore = calculateDiversityScore(concepts);
  const recommendation = recommendConcept(concepts, params.targetPlatform);
  const crossConceptInsights = generateCrossConceptInsights(concepts, brand);

  return {
    brand,
    concepts,
    diversityScore,
    recommendedConceptId: recommendation.conceptId,
    recommendationReason: recommendation.reason,
    crossConceptInsights,
  };
}
