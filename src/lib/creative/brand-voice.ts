/**
 * Brand Voice & Style Engine.
 *
 * Analyzes creatives against brand guidelines, tone of voice, visual style
 * rules, and messaging pillars. Includes brand voice training, consistency
 * scoring, and auto-correction suggestions.
 *
 * All AI calls use the existing atlasChat() from src/lib/atlas.ts.
 * Credit cost is defined per analysis and exported for the route layer.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const BRAND_VOICE_COST = 6;

// ── Types ──

export type VoiceTone =
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'authoritative'
  | 'playful'
  | 'inspirational'
  | 'urgent'
  | 'empathetic'
  | 'luxurious'
  | 'technical';

export type VoiceAttribute =
  | 'formal'
  | 'informal'
  | 'serious'
  | 'humorous'
  | 'respectful'
  | 'irreverent'
  | 'warm'
  | 'cool'
  | 'direct'
  | 'subtle'
  | 'active'
  | 'passive'
  | 'simple'
  | 'sophisticated';

export type MessagingPillar =
  | 'value_proposition'
  | 'social_proof'
  | 'authority'
  | 'scarcity'
  | 'urgency'
  | 'community'
  | 'innovation'
  | 'trust'
  | 'quality'
  | 'sustainability';

export type ConsistencyIssue =
  | 'tone_mismatch'
  | 'vocabulary_mismatch'
  | 'messaging_off_pillar'
  | 'style_violation'
  | 'format_violation'
  | 'voice_inconsistency'
  | 'audience_mismatch';

export type IssueSeverity = 'critical' | 'major' | 'minor' | 'suggestion';

export type VisualStyleRule =
  | 'color_palette'
  | 'typography'
  | 'imagery_style'
  | 'layout'
  | 'logo_usage'
  | 'spacing'
  | 'photography_style'
  | 'graphic_elements';

// ── Interfaces ──

export interface BrandVoiceProfile {
  brandId: string;
  brandName: string;
  voiceTones: VoiceTone[];
  voiceAttributes: VoiceAttribute[];
  messagingPillars: MessagingPillar[];
  vocabulary: {
    preferred: string[];
    avoided: string[];
    signature: string[];
  };
  styleRules: Array<{
    ruleId: string;
    type: VisualStyleRule;
    description: string;
    examples: string[];
    mandatory: boolean;
  }>;
  doList: string[];
  dontList: string[];
  audienceTone: string;
  brandPersonality: string[];
  createdAt: string;
}

export interface ConsistencyCheck {
  checkId: string;
  creativeId: string;
  creativeContent: string;
  overallScore: number;
  toneScore: number;
  messagingScore: number;
  vocabularyScore: number;
  styleScore: number;
  issues: Array<{
    issueId: string;
    type: ConsistencyIssue;
    severity: IssueSeverity;
    description: string;
    location: string;
    suggestion: string;
    confidence: number;
  }>;
  matchedElements: string[];
  recommendations: string[];
}

export interface VoiceTrainingResult {
  brandId: string;
  extractedTones: VoiceTone[];
  extractedAttributes: VoiceAttribute[];
  extractedPillars: MessagingPillar[];
  extractedVocabulary: {
    preferred: string[];
    avoided: string[];
    signature: string[];
  };
  detectedStyleRules: Array<{
    type: VisualStyleRule;
    description: string;
    confidence: number;
  }>;
  brandPersonality: string[];
  audienceTone: string;
  confidenceScore: number;
}

export interface BrandVoiceResult {
  profile: BrandVoiceProfile;
  consistencyChecks: ConsistencyCheck[];
  overallConsistency: number;
  consistencyTrend: 'improving' | 'stable' | 'declining';
  autoCorrections: Array<{
    creativeId: string;
    originalText: string;
    correctedText: string;
    changeType: ConsistencyIssue;
    confidence: number;
  }>;
  insights: Array<{
    insightId: string;
    type: string;
    title: string;
    description: string;
    actionableRecommendation: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
  }>;
}

// ── Constants ──

const CREATIVE_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const CREATIVE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const CREATIVE_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 6000);

const VALID_TONES: VoiceTone[] = [
  'professional', 'casual', 'friendly', 'authoritative', 'playful',
  'inspirational', 'urgent', 'empathetic', 'luxurious', 'technical',
];

const VALID_ATTRIBUTES: VoiceAttribute[] = [
  'formal', 'informal', 'serious', 'humorous', 'respectful', 'irreverent',
  'warm', 'cool', 'direct', 'subtle', 'active', 'passive', 'simple', 'sophisticated',
];

const VALID_PILLARS: MessagingPillar[] = [
  'value_proposition', 'social_proof', 'authority', 'scarcity', 'urgency',
  'community', 'innovation', 'trust', 'quality', 'sustainability',
];

const VALID_ISSUES: ConsistencyIssue[] = [
  'tone_mismatch', 'vocabulary_mismatch', 'messaging_off_pillar',
  'style_violation', 'format_violation', 'voice_inconsistency', 'audience_mismatch',
];

const VALID_SEVERITIES: IssueSeverity[] = ['critical', 'major', 'minor', 'suggestion'];

const VALID_VISUAL_RULES: VisualStyleRule[] = [
  'color_palette', 'typography', 'imagery_style', 'layout',
  'logo_usage', 'spacing', 'photography_style', 'graphic_elements',
];

// ── Helpers ──

function resolveCreativeModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no_json_in_brand_voice_output');
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

function asTone(v: unknown): VoiceTone | undefined {
  const s = asStr(v);
  return (VALID_TONES as string[]).includes(s) ? (s as VoiceTone) : undefined;
}

function asToneArr(v: unknown): VoiceTone[] {
  if (!Array.isArray(v)) return [];
  const out: VoiceTone[] = [];
  for (const x of v) {
    const t = asTone(x);
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 10);
}

function asAttribute(v: unknown): VoiceAttribute | undefined {
  const s = asStr(v);
  return (VALID_ATTRIBUTES as string[]).includes(s) ? (s as VoiceAttribute) : undefined;
}

function asAttributeArr(v: unknown): VoiceAttribute[] {
  if (!Array.isArray(v)) return [];
  const out: VoiceAttribute[] = [];
  for (const x of v) {
    const a = asAttribute(x);
    if (a && !out.includes(a)) out.push(a);
  }
  return out.slice(0, 14);
}

function asPillar(v: unknown): MessagingPillar | undefined {
  const s = asStr(v);
  return (VALID_PILLARS as string[]).includes(s) ? (s as MessagingPillar) : undefined;
}

function asPillarArr(v: unknown): MessagingPillar[] {
  if (!Array.isArray(v)) return [];
  const out: MessagingPillar[] = [];
  for (const x of v) {
    const p = asPillar(x);
    if (p && !out.includes(p)) out.push(p);
  }
  return out.slice(0, 10);
}

function asVisualRule(v: unknown): VisualStyleRule | undefined {
  const s = asStr(v);
  return (VALID_VISUAL_RULES as string[]).includes(s) ? (s as VisualStyleRule) : undefined;
}

function asIssueType(v: unknown): ConsistencyIssue {
  const s = asStr(v, 'tone_mismatch');
  return (VALID_ISSUES as string[]).includes(s) ? (s as ConsistencyIssue) : 'tone_mismatch';
}

function asSeverity(v: unknown): IssueSeverity {
  const s = asStr(v, 'minor');
  return (VALID_SEVERITIES as string[]).includes(s) ? (s as IssueSeverity) : 'minor';
}

// ── Reference data getters ──

export function getVoiceTones(): Array<{ tone: VoiceTone; name: string; description: string }> {
  return [
    { tone: 'professional', name: 'Professional', description: 'Formal, business-appropriate, and credible tone' },
    { tone: 'casual', name: 'Casual', description: 'Relaxed, conversational, and everyday language' },
    { tone: 'friendly', name: 'Friendly', description: 'Warm, approachable, and personable tone' },
    { tone: 'authoritative', name: 'Authoritative', description: 'Confident, commanding, and expert tone' },
    { tone: 'playful', name: 'Playful', description: 'Fun, lighthearted, and humorous tone' },
    { tone: 'inspirational', name: 'Inspirational', description: 'Motivating, uplifting, and aspirational tone' },
    { tone: 'urgent', name: 'Urgent', description: 'Time-sensitive, pressing, and action-driven tone' },
    { tone: 'empathetic', name: 'Empathetic', description: 'Understanding, compassionate, and caring tone' },
    { tone: 'luxurious', name: 'Luxurious', description: 'Premium, refined, and exclusive tone' },
    { tone: 'technical', name: 'Technical', description: 'Precise, detailed, and jargon-appropriate tone' },
  ];
}

export function getVoiceAttributes(): Array<{ attribute: VoiceAttribute; name: string; description: string }> {
  return [
    { attribute: 'formal', name: 'Formal', description: 'Follows conventional grammar and structure' },
    { attribute: 'informal', name: 'Informal', description: 'Relaxed grammar, colloquial expressions' },
    { attribute: 'serious', name: 'Serious', description: 'Solemn and weighty in delivery' },
    { attribute: 'humorous', name: 'Humorous', description: 'Uses wit and comedy to engage' },
    { attribute: 'respectful', name: 'Respectful', description: 'Courteous and considerate of the audience' },
    { attribute: 'irreverent', name: 'Irreverent', description: 'Disregards conventions, edgy and bold' },
    { attribute: 'warm', name: 'Warm', description: 'Inviting and emotionally warm' },
    { attribute: 'cool', name: 'Cool', description: 'Detached, stylish, and understated' },
    { attribute: 'direct', name: 'Direct', description: 'Straightforward and to the point' },
    { attribute: 'subtle', name: 'Subtle', description: 'Nuanced and indirect in delivery' },
    { attribute: 'active', name: 'Active', description: 'Uses active voice and strong verbs' },
    { attribute: 'passive', name: 'Passive', description: 'Uses passive constructions and softer framing' },
    { attribute: 'simple', name: 'Simple', description: 'Plain language, easy to understand' },
    { attribute: 'sophisticated', name: 'Sophisticated', description: 'Complex, refined, and elevated language' },
  ];
}

export function getMessagingPillars(): Array<{ pillar: MessagingPillar; name: string; description: string }> {
  return [
    { pillar: 'value_proposition', name: 'Value Proposition', description: 'Core benefit and value offered to customers' },
    { pillar: 'social_proof', name: 'Social Proof', description: 'Testimonials, reviews, and user evidence' },
    { pillar: 'authority', name: 'Authority', description: 'Expertise, credentials, and industry leadership' },
    { pillar: 'scarcity', name: 'Scarcity', description: 'Limited availability and exclusive offers' },
    { pillar: 'urgency', name: 'Urgency', description: 'Time-sensitive calls to action' },
    { pillar: 'community', name: 'Community', description: 'Belonging, shared identity, and group values' },
    { pillar: 'innovation', name: 'Innovation', description: 'Novelty, cutting-edge features, and progress' },
    { pillar: 'trust', name: 'Trust', description: 'Reliability, transparency, and safety' },
    { pillar: 'quality', name: 'Quality', description: 'Craftsmanship, durability, and excellence' },
    { pillar: 'sustainability', name: 'Sustainability', description: 'Environmental and social responsibility' },
  ];
}

export function getVisualStyleRules(): Array<{ rule: VisualStyleRule; name: string; description: string }> {
  return [
    { rule: 'color_palette', name: 'Color Palette', description: 'Approved brand colors and color combinations' },
    { rule: 'typography', name: 'Typography', description: 'Font families, sizes, and hierarchy rules' },
    { rule: 'imagery_style', name: 'Imagery Style', description: 'Photography and illustration aesthetic guidelines' },
    { rule: 'layout', name: 'Layout', description: 'Grid, composition, and structural arrangement rules' },
    { rule: 'logo_usage', name: 'Logo Usage', description: 'Logo placement, sizing, and clear-space requirements' },
    { rule: 'spacing', name: 'Spacing', description: 'Margins, padding, and whitespace standards' },
    { rule: 'photography_style', name: 'Photography Style', description: 'Subject matter, lighting, and editing approach' },
    { rule: 'graphic_elements', name: 'Graphic Elements', description: 'Icons, shapes, patterns, and decorative assets' },
  ];
}

export function getConsistencyIssues(): Array<{ issue: ConsistencyIssue; name: string; description: string }> {
  return [
    { issue: 'tone_mismatch', name: 'Tone Mismatch', description: 'Creative tone does not match brand voice tones' },
    { issue: 'vocabulary_mismatch', name: 'Vocabulary Mismatch', description: 'Uses avoided words or misses preferred vocabulary' },
    { issue: 'messaging_off_pillar', name: 'Messaging Off-Pillar', description: 'Messaging does not align with brand messaging pillars' },
    { issue: 'style_violation', name: 'Style Violation', description: 'Violates visual or written style guidelines' },
    { issue: 'format_violation', name: 'Format Violation', description: 'Does not follow required creative format rules' },
    { issue: 'voice_inconsistency', name: 'Voice Inconsistency', description: 'Inconsistent voice within or across creatives' },
    { issue: 'audience_mismatch', name: 'Audience Mismatch', description: 'Tone or content does not match target audience' },
  ];
}

// ── Validation ──

export function validateBrandVoiceRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.brandName || typeof request.brandName !== 'string' || !request.brandName.trim()) {
    errors.push('brandName is required');
  }
  if (request.brandDescription !== undefined && typeof request.brandDescription !== 'string') {
    errors.push('brandDescription must be a string');
  }
  if (request.brandGuidelines !== undefined && typeof request.brandGuidelines !== 'string') {
    errors.push('brandGuidelines must be a string');
  }
  if (request.sampleCreatives !== undefined && !Array.isArray(request.sampleCreatives)) {
    errors.push('sampleCreatives must be an array');
  }
  if (request.creativesToCheck !== undefined && !Array.isArray(request.creativesToCheck)) {
    errors.push('creativesToCheck must be an array');
  }
  return { valid: errors.length === 0, errors };
}

// ── Voice training ──

export function trainVoiceProfile(samples: Array<{ content: string }>): VoiceTrainingResult {
  const content = samples.map((s) => s.content).filter(Boolean).join('\n---\n');
  const lower = content.toLowerCase();

  // Heuristic tone detection from keywords
  const toneKeywords: Record<VoiceTone, string[]> = {
    professional: ['professional', 'business', 'corporate', 'enterprise', 'solution'],
    casual: ['hey', 'guys', 'cool', 'awesome', 'stuff', 'kinda'],
    friendly: ['friend', 'welcome', 'happy', 'love', 'care', 'together'],
    authoritative: ['must', 'ensure', 'guaranteed', 'proven', 'leading', 'expert'],
    playful: ['fun', 'lol', 'yay', 'woohoo', 'party', 'game'],
    inspirational: ['dream', 'achieve', 'inspire', 'believe', 'possible', 'future'],
    urgent: ['now', 'today', 'limited', 'hurry', 'deadline', 'last chance'],
    empathetic: ['understand', 'feel', 'support', 'here for you', 'we know', 'struggle'],
    luxurious: ['premium', 'exclusive', 'elegant', 'luxury', 'refined', 'bespoke'],
    technical: ['system', 'engine', 'algorithm', 'data', 'spec', 'performance'],
  };

  const extractedTones: VoiceTone[] = [];
  for (const tone of VALID_TONES) {
    const hits = toneKeywords[tone].some((kw) => lower.includes(kw));
    if (hits) extractedTones.push(tone);
  }
  if (extractedTones.length === 0) extractedTones.push('professional');

  // Heuristic attribute detection
  const attrKeywords: Record<VoiceAttribute, string[]> = {
    formal: ['therefore', 'furthermore', 'however', 'regarding'],
    informal: ['gonna', 'wanna', 'yeah', 'ok'],
    serious: ['important', 'critical', 'essential', 'serious'],
    humorous: ['joke', 'funny', 'haha', 'lol'],
    respectful: ['please', 'thank', 'respect', 'appreciate'],
    irreverent: ['whatever', 'seriously', 'obviously'],
    warm: ['warm', 'kind', 'gentle', 'soft'],
    cool: ['chill', 'vibe', ' sleek'],
    direct: ['get', 'now', 'here', 'this'],
    subtle: ['perhaps', 'maybe', 'might', 'could'],
    active: ['drive', 'build', 'create', 'launch'],
    passive: ['been', 'was', 'were', 'is being'],
    simple: ['easy', 'simple', 'just', 'basic'],
    sophisticated: ['nuanced', 'comprehensive', 'sophisticated', 'intricate'],
  };

  const extractedAttributes: VoiceAttribute[] = [];
  for (const attr of VALID_ATTRIBUTES) {
    const hits = attrKeywords[attr].some((kw) => lower.includes(kw));
    if (hits) extractedAttributes.push(attr);
  }
  if (extractedAttributes.length === 0) extractedAttributes.push('direct', 'active');

  // Heuristic pillar detection
  const pillarKeywords: Record<MessagingPillar, string[]> = {
    value_proposition: ['value', 'benefit', 'save', 'earn', 'get more'],
    social_proof: ['customers', 'reviews', 'testimonials', 'rated', 'users'],
    authority: ['expert', 'leader', 'award', 'certified', 'trusted by'],
    scarcity: ['limited', 'only', 'few left', 'exclusive'],
    urgency: ['now', 'today', 'ends soon', 'hurry'],
    community: ['community', 'join', 'together', 'members', 'family'],
    innovation: ['new', 'innovative', 'first', 'breakthrough', 'cutting-edge'],
    trust: ['trust', 'secure', 'reliable', 'guaranteed', 'safe'],
    quality: ['quality', 'premium', 'craft', 'durable', 'best'],
    sustainability: ['sustainable', 'eco', 'green', 'responsible', 'planet'],
  };

  const extractedPillars: MessagingPillar[] = [];
  for (const pillar of VALID_PILLARS) {
    const hits = pillarKeywords[pillar].some((kw) => lower.includes(kw));
    if (hits) extractedPillars.push(pillar);
  }
  if (extractedPillars.length === 0) extractedPillars.push('value_proposition', 'trust');

  // Extract vocabulary: frequent significant words
  const words = lower.match(/[a-z]{4,}/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const preferred = sorted.slice(0, 10).map(([w]) => w);
  const signature = sorted.slice(0, 5).map(([w]) => w);
  const avoided = ['cheap', 'free', 'guarantee', 'spam', 'scam'].filter((w) => !preferred.includes(w));

  // Detected style rules (heuristic)
  const detectedStyleRules: VoiceTrainingResult['detectedStyleRules'] = [];
  if (lower.includes('color') || lower.includes('palette')) {
    detectedStyleRules.push({ type: 'color_palette', description: 'Color palette references detected in samples', confidence: 60 });
  }
  if (lower.includes('font') || lower.includes('typography')) {
    detectedStyleRules.push({ type: 'typography', description: 'Typography references detected in samples', confidence: 60 });
  }
  if (lower.includes('image') || lower.includes('photo') || lower.includes('visual')) {
    detectedStyleRules.push({ type: 'imagery_style', description: 'Imagery style references detected in samples', confidence: 55 });
  }
  if (lower.includes('layout') || lower.includes('grid')) {
    detectedStyleRules.push({ type: 'layout', description: 'Layout references detected in samples', confidence: 55 });
  }
  if (lower.includes('logo')) {
    detectedStyleRules.push({ type: 'logo_usage', description: 'Logo usage references detected in samples', confidence: 65 });
  }

  // Brand personality traits (heuristic from tones/attributes)
  const brandPersonality: string[] = [];
  if (extractedTones.includes('friendly')) brandPersonality.push('approachable');
  if (extractedTones.includes('authoritative')) brandPersonality.push('confident');
  if (extractedTones.includes('playful')) brandPersonality.push('fun-loving');
  if (extractedTones.includes('inspirational')) brandPersonality.push('ambitious');
  if (extractedAttributes.includes('warm')) brandPersonality.push('caring');
  if (extractedAttributes.includes('sophisticated')) brandPersonality.push('refined');
  if (brandPersonality.length === 0) brandPersonality.push('professional', 'reliable');

  // Audience tone
  let audienceTone = 'general audience';
  if (extractedTones.includes('technical')) audienceTone = 'technical professionals';
  else if (extractedTones.includes('luxurious')) audienceTone = 'premium consumers';
  else if (extractedTones.includes('casual')) audienceTone = 'casual consumers';
  else if (extractedTones.includes('professional')) audienceTone = 'business professionals';

  const confidenceScore = Math.min(100, 40 + samples.length * 10 + extractedTones.length * 5);

  return {
    brandId: `brand_${Date.now()}`,
    extractedTones,
    extractedAttributes,
    extractedPillars,
    extractedVocabulary: { preferred, avoided, signature },
    detectedStyleRules,
    brandPersonality,
    audienceTone,
    confidenceScore,
  };
}

// ── Consistency checking ──

export function checkConsistency(
  profile: BrandVoiceProfile,
  creatives: Array<{ creativeId: string; content: string }>,
): ConsistencyCheck[] {
  return creatives.map((creative, idx): ConsistencyCheck => {
    const content = creative.content || '';
    const lower = content.toLowerCase();

    // Tone score: check alignment with profile tones via keyword presence
    const toneKeywords: Record<VoiceTone, string[]> = {
      professional: ['professional', 'business', 'corporate', 'solution'],
      casual: ['hey', 'cool', 'awesome', 'stuff'],
      friendly: ['friend', 'welcome', 'happy', 'love'],
      authoritative: ['must', 'ensure', 'guaranteed', 'proven'],
      playful: ['fun', 'lol', 'yay', 'game'],
      inspirational: ['dream', 'achieve', 'believe', 'future'],
      urgent: ['now', 'today', 'limited', 'hurry'],
      empathetic: ['understand', 'feel', 'support', 'we know'],
      luxurious: ['premium', 'exclusive', 'elegant', 'luxury'],
      technical: ['system', 'data', 'spec', 'performance'],
    };
    let toneMatches = 0;
    for (const tone of profile.voiceTones) {
      const kws = toneKeywords[tone] || [];
      if (kws.some((kw) => lower.includes(kw))) toneMatches++;
    }
    const toneScore = profile.voiceTones.length > 0
      ? Math.round((toneMatches / profile.voiceTones.length) * 100)
      : 70;

    // Vocabulary score: preferred words present, avoided words absent
    const preferredHits = profile.vocabulary.preferred.filter((w) => lower.includes(w.toLowerCase())).length;
    const avoidedHits = profile.vocabulary.avoided.filter((w) => lower.includes(w.toLowerCase())).length;
    const signatureHits = profile.vocabulary.signature.filter((w) => lower.includes(w.toLowerCase())).length;
    const vocabScore = Math.max(0, Math.min(100,
      Math.round((preferredHits * 10) + (signatureHits * 15) - (avoidedHits * 20) + 40)));

    // Messaging score: pillar keywords present
    const pillarKeywords: Record<MessagingPillar, string[]> = {
      value_proposition: ['value', 'benefit', 'save'],
      social_proof: ['customers', 'reviews', 'rated'],
      authority: ['expert', 'leader', 'award'],
      scarcity: ['limited', 'only', 'few left'],
      urgency: ['now', 'today', 'ends soon'],
      community: ['community', 'join', 'members'],
      innovation: ['new', 'innovative', 'first'],
      trust: ['trust', 'secure', 'reliable'],
      quality: ['quality', 'premium', 'craft'],
      sustainability: ['sustainable', 'eco', 'green'],
    };
    let pillarMatches = 0;
    for (const pillar of profile.messagingPillars) {
      const kws = pillarKeywords[pillar] || [];
      if (kws.some((kw) => lower.includes(kw))) pillarMatches++;
    }
    const messagingScore = profile.messagingPillars.length > 0
      ? Math.round((pillarMatches / profile.messagingPillars.length) * 100)
      : 70;

    // Style score: based on style rules presence (heuristic since content is text)
    const styleScore = profile.styleRules.length > 0
      ? Math.round(60 + (profile.styleRules.length * 5))
      : 75;
    const clampedStyle = Math.min(100, styleScore);

    const overallScore = Math.round((toneScore + messagingScore + vocabScore + clampedStyle) / 4);

    // Build issues
    const issues: ConsistencyCheck['issues'] = [];
    let issueIdx = 0;

    if (toneScore < 50) {
      issues.push({
        issueId: `issue_${idx}_${issueIdx++}`,
        type: 'tone_mismatch',
        severity: toneScore < 30 ? 'critical' : 'major',
        description: `Creative tone does not align with brand voice tones: ${profile.voiceTones.join(', ')}`,
        location: 'overall content',
        suggestion: `Rewrite to reflect ${profile.voiceTones.join(', ')} tone`,
        confidence: Math.max(50, 100 - toneScore),
      });
    }

    if (avoidedHits > 0) {
      issues.push({
        issueId: `issue_${idx}_${issueIdx++}`,
        type: 'vocabulary_mismatch',
        severity: avoidedHits > 2 ? 'major' : 'minor',
        description: `Uses avoided vocabulary words (${avoidedHits} found)`,
        location: 'content body',
        suggestion: `Replace avoided words with preferred vocabulary: ${profile.vocabulary.preferred.slice(0, 5).join(', ')}`,
        confidence: 80,
      });
    }

    if (messagingScore < 50) {
      issues.push({
        issueId: `issue_${idx}_${issueIdx++}`,
        type: 'messaging_off_pillar',
        severity: messagingScore < 30 ? 'major' : 'minor',
        description: `Messaging does not align with brand pillars: ${profile.messagingPillars.join(', ')}`,
        location: 'messaging',
        suggestion: `Incorporate messaging around ${profile.messagingPillars.slice(0, 3).join(', ')}`,
        confidence: Math.max(50, 100 - messagingScore),
      });
    }

    if (vocabScore < 40) {
      issues.push({
        issueId: `issue_${idx}_${issueIdx++}`,
        type: 'voice_inconsistency',
        severity: 'minor',
        description: 'Voice is inconsistent with established brand vocabulary',
        location: 'word choice',
        suggestion: 'Use more signature brand vocabulary',
        confidence: 60,
      });
    }

    if (overallScore < 50) {
      issues.push({
        issueId: `issue_${idx}_${issueIdx++}`,
        type: 'audience_mismatch',
        severity: overallScore < 30 ? 'critical' : 'major',
        description: `Content may not resonate with target audience (${profile.audienceTone})`,
        location: 'overall',
        suggestion: `Adjust tone and messaging for ${profile.audienceTone}`,
        confidence: 70,
      });
    }

    // Matched elements
    const matchedElements: string[] = [];
    for (const w of profile.vocabulary.signature) {
      if (lower.includes(w.toLowerCase())) matchedElements.push(w);
    }
    for (const w of profile.vocabulary.preferred) {
      if (lower.includes(w.toLowerCase()) && !matchedElements.includes(w)) matchedElements.push(w);
    }

    // Recommendations
    const recommendations: string[] = [];
    if (toneScore < 70) recommendations.push(`Adjust tone to better match ${profile.voiceTones.join(', ')}`);
    if (vocabScore < 70) recommendations.push(`Incorporate more signature vocabulary: ${profile.vocabulary.signature.slice(0, 3).join(', ')}`);
    if (messagingScore < 70) recommendations.push(`Reinforce messaging pillars: ${profile.messagingPillars.slice(0, 3).join(', ')}`);
    if (recommendations.length === 0) recommendations.push('Creative aligns well with brand voice');

    return {
      checkId: `check_${idx}_${Date.now()}`,
      creativeId: creative.creativeId,
      creativeContent: content,
      overallScore,
      toneScore,
      messagingScore,
      vocabularyScore: vocabScore,
      styleScore: clampedStyle,
      issues,
      matchedElements,
      recommendations,
    };
  });
}

// ── Auto-corrections ──

export function generateAutoCorrections(checks: ConsistencyCheck[]): BrandVoiceResult['autoCorrections'] {
  const corrections: BrandVoiceResult['autoCorrections'] = [];
  for (const check of checks) {
    for (const issue of check.issues) {
      if (issue.type === 'vocabulary_mismatch' || issue.type === 'tone_mismatch' || issue.type === 'voice_inconsistency') {
        // Heuristic correction: suggest a cleaned version of the content
        const original = check.creativeContent;
        const corrected = issue.suggestion
          ? `${original}\n\n[Brand voice note: ${issue.suggestion}]`
          : original;
        corrections.push({
          creativeId: check.creativeId,
          originalText: original.slice(0, 200),
          correctedText: corrected.slice(0, 300),
          changeType: issue.type,
          confidence: issue.confidence,
        });
      }
    }
  }
  return corrections;
}

// ── Overall consistency & trend ──

export function calculateOverallConsistency(checks: ConsistencyCheck[]): number {
  if (checks.length === 0) return 100;
  const total = checks.reduce((a, c) => a + c.overallScore, 0);
  return Math.round(total / checks.length);
}

export function determineConsistencyTrend(checks: ConsistencyCheck[]): 'improving' | 'stable' | 'declining' {
  if (checks.length < 2) return 'stable';
  // Compare first half vs second half average
  const mid = Math.floor(checks.length / 2);
  const firstHalf = checks.slice(0, mid);
  const secondHalf = checks.slice(mid);
  const firstAvg = firstHalf.reduce((a, c) => a + c.overallScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, c) => a + c.overallScore, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// ── Main analysis ──

export async function analyzeBrandVoice(request: {
  brandName: string;
  brandDescription?: string;
  brandGuidelines?: string;
  sampleCreatives?: Array<{ content: string }>;
  creativesToCheck?: Array<{ creativeId: string; content: string }>;
  planTier?: PlanTier;
}): Promise<BrandVoiceResult> {
  const {
    brandName,
    brandDescription = '',
    brandGuidelines = '',
    sampleCreatives = [],
    creativesToCheck = [],
    planTier,
  } = request;

  // Train a voice profile from samples (heuristic, always available)
  const training = trainVoiceProfile(
    sampleCreatives.length > 0
      ? sampleCreatives
      : [{ content: `${brandName} ${brandDescription} ${brandGuidelines}` }],
  );

  // Try AI-enhanced profile extraction
  let aiProfile: Record<string, unknown> = {};
  try {
    const parts: string[] = [
      `Brand name: ${brandName}`,
    ];
    if (brandDescription) parts.push(`Brand description: ${brandDescription}`);
    if (brandGuidelines) parts.push(`Brand guidelines: ${brandGuidelines}`);
    if (sampleCreatives.length > 0) {
      parts.push(`Sample creatives:`);
      parts.push(sampleCreatives.map((s) => s.content).join('\n---\n').slice(0, 4000));
    }
    parts.push('Output the brand voice profile JSON now.');

    const raw = await atlasChat(
      [{
        role: 'system',
        content: 'You are a brand voice analyst. Analyze the brand and return JSON with: voiceTones (array from: professional,casual,friendly,authoritative,playful,inspirational,urgent,empathetic,luxurious,technical), voiceAttributes (array from: formal,informal,serious,humorous,respectful,irreverent,warm,cool,direct,subtle,active,passive,simple,sophisticated), messagingPillars (array from: value_proposition,social_proof,authority,scarcity,urgency,community,innovation,trust,quality,sustainability), vocabulary ({preferred:[],avoided:[],signature:[]}), styleRules (array of {type,description,mandatory}), doList ([]), dontList ([]), brandPersonality ([]), audienceTone (string). Output ONLY JSON.',
      }, { role: 'user', content: parts.join('\n') }],
      resolveCreativeModel(planTier), CREATIVE_MAX_TOKENS, CREATIVE_TIMEOUT_MS,
    );
    aiProfile = extractJson(raw);
  } catch {
    // Fall through to heuristic training result
  }

  // Merge AI + heuristic into final profile
  const profile: BrandVoiceProfile = {
    brandId: training.brandId,
    brandName,
    voiceTones: asToneArr(aiProfile.voiceTones).length > 0 ? asToneArr(aiProfile.voiceTones) : training.extractedTones,
    voiceAttributes: asAttributeArr(aiProfile.voiceAttributes).length > 0 ? asAttributeArr(aiProfile.voiceAttributes) : training.extractedAttributes,
    messagingPillars: asPillarArr(aiProfile.messagingPillars).length > 0 ? asPillarArr(aiProfile.messagingPillars) : training.extractedPillars,
    vocabulary: {
      preferred: asStrArr((aiProfile.vocabulary as Record<string, unknown>)?.preferred).length > 0
        ? asStrArr((aiProfile.vocabulary as Record<string, unknown>)?.preferred)
        : training.extractedVocabulary.preferred,
      avoided: asStrArr((aiProfile.vocabulary as Record<string, unknown>)?.avoided).length > 0
        ? asStrArr((aiProfile.vocabulary as Record<string, unknown>)?.avoided)
        : training.extractedVocabulary.avoided,
      signature: asStrArr((aiProfile.vocabulary as Record<string, unknown>)?.signature).length > 0
        ? asStrArr((aiProfile.vocabulary as Record<string, unknown>)?.signature)
        : training.extractedVocabulary.signature,
    },
    styleRules: Array.isArray(aiProfile.styleRules)
      ? (aiProfile.styleRules as Array<Record<string, unknown>>).slice(0, 10).map((r, i) => ({
          ruleId: `rule_${i}`,
          type: asVisualRule(r.type) || 'color_palette',
          description: asStr(r.description),
          examples: asStrArr(r.examples),
          mandatory: typeof r.mandatory === 'boolean' ? r.mandatory : false,
        }))
      : training.detectedStyleRules.map((r, i) => ({
          ruleId: `rule_${i}`,
          type: r.type,
          description: r.description,
          examples: [],
          mandatory: false,
        })),
    doList: asStrArr(aiProfile.doList).length > 0 ? asStrArr(aiProfile.doList) : ['Use consistent tone', 'Reinforce messaging pillars'],
    dontList: asStrArr(aiProfile.dontList).length > 0 ? asStrArr(aiProfile.dontList) : ['Use avoided vocabulary', 'Mix conflicting tones'],
    audienceTone: asStr(aiProfile.audienceTone, training.audienceTone),
    brandPersonality: asStrArr(aiProfile.brandPersonality).length > 0 ? asStrArr(aiProfile.brandPersonality) : training.brandPersonality,
    createdAt: new Date().toISOString(),
  };

  // Run consistency checks
  const consistencyChecks = checkConsistency(profile, creativesToCheck);
  const overallConsistency = calculateOverallConsistency(consistencyChecks);
  const consistencyTrend = determineConsistencyTrend(consistencyChecks);
  const autoCorrections = generateAutoCorrections(consistencyChecks);

  // Generate insights
  const insights: BrandVoiceResult['insights'] = [];
  let insightIdx = 0;
  const criticalCount = consistencyChecks.reduce((a, c) => a + c.issues.filter((i) => i.severity === 'critical').length, 0);
  const majorCount = consistencyChecks.reduce((a, c) => a + c.issues.filter((i) => i.severity === 'major').length, 0);

  if (criticalCount > 0) {
    insights.push({
      insightId: `insight_${insightIdx++}`,
      type: 'critical_issues',
      title: `${criticalCount} critical brand voice issue(s) detected`,
      description: `${criticalCount} creatives have critical deviations from the brand voice profile.`,
      actionableRecommendation: 'Rewrite flagged creatives to align with brand tones and messaging pillars before publishing.',
    });
  }
  if (majorCount > 0) {
    insights.push({
      insightId: `insight_${insightIdx++}`,
      type: 'major_issues',
      title: `${majorCount} major brand voice issue(s) detected`,
      description: `${majorCount} creatives have significant but non-critical deviations.`,
      actionableRecommendation: 'Apply auto-correction suggestions to bring creatives closer to brand voice.',
    });
  }
  if (overallConsistency < 60) {
    insights.push({
      insightId: `insight_${insightIdx++}`,
      type: 'low_consistency',
      title: 'Overall brand voice consistency is low',
      description: `Average consistency score is ${overallConsistency}/100 across ${consistencyChecks.length} creatives.`,
      actionableRecommendation: 'Establish a brand voice review checkpoint before creative approval.',
    });
  }
  if (consistencyChecks.length > 0 && overallConsistency >= 80) {
    insights.push({
      insightId: `insight_${insightIdx++}`,
      type: 'strong_alignment',
      title: 'Strong brand voice alignment',
      description: `Creatives align well with the brand voice profile (${overallConsistency}/100).`,
      actionableRecommendation: 'Use these creatives as reference examples for future brand voice training.',
    });
  }

  // Recommendations
  const recommendations: BrandVoiceResult['recommendations'] = [];
  if (criticalCount > 0) {
    recommendations.push({
      priority: 'high',
      recommendation: 'Fix all critical brand voice issues before publishing affected creatives',
      expectedImpact: 'Restore brand voice consistency and audience trust',
    });
  }
  if (majorCount > 0) {
    recommendations.push({
      priority: 'high',
      recommendation: 'Apply auto-correction suggestions to major issues',
      expectedImpact: 'Improve consistency score by 15-25 points',
    });
  }
  if (overallConsistency < 80) {
    recommendations.push({
      priority: 'medium',
      recommendation: 'Create a brand voice checklist for creative reviewers',
      expectedImpact: 'Prevent future brand voice deviations',
    });
  }
  recommendations.push({
    priority: 'low',
    recommendation: 'Periodically retrain the brand voice profile with new high-performing creatives',
    expectedImpact: 'Keep brand voice profile current and accurate',
  });

  return {
    profile,
    consistencyChecks,
    overallConsistency,
    consistencyTrend,
    autoCorrections,
    insights,
    recommendations,
  };
}
