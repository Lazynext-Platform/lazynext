/**
 * Audience Insights Engine.
 *
 * Deep audience research with demographic segmentation, interest mapping,
 * behavior pattern analysis, purchase intent scoring, and lookalike
 * audience generation. Goes beyond the existing persona engine with
 * quantitative audience modeling.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { isDryRun } from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

export const AUDIENCE_INSIGHTS_COST = 7;

// ── Types ──

export type AudienceSegment =
  | 'primary'
  | 'secondary'
  | 'lookalike'
  | 'retargeting'
  | 'cold_prospect'
  | 'warm_lead';

export type DemographicField =
  | 'age_range'
  | 'gender'
  | 'location'
  | 'income_level'
  | 'education'
  | 'occupation';

export type BehaviorPattern =
  | 'browsing'
  | 'purchase'
  | 'engagement'
  | 'research'
  | 'comparison'
  | 'abandonment';

export type PurchaseIntent = 'high' | 'medium' | 'low' | 'unknown';

export type InterestCategory =
  | 'lifestyle'
  | 'technology'
  | 'fashion'
  | 'health'
  | 'finance'
  | 'entertainment'
  | 'food'
  | 'travel'
  | 'sports'
  | 'beauty'
  | 'home'
  | 'automotive'
  | 'parenting'
  | 'gaming'
  | 'business';

// ── Interfaces ──

export interface DemographicProfile {
  ageRange: string;
  genderSplit: { male: number; female: number; other: number };
  topLocations: string[];
  incomeLevel: string;
  educationLevel: string;
  topOccupations: string[];
}

export interface InterestMapping {
  category: InterestCategory;
  specificInterests: string[];
  affinityScore: number;
}

export interface BehaviorAnalysis {
  pattern: BehaviorPattern;
  frequency: number;
  triggers: string[];
  barriers: string[];
  preferredChannels: string[];
}

export interface AudienceSegmentResult {
  segment: AudienceSegment;
  name: string;
  size: number;
  demographics: DemographicProfile;
  topInterests: InterestMapping[];
  behaviors: BehaviorAnalysis[];
  purchaseIntent: PurchaseIntent;
  purchaseIntentScore: number;
  bestMessagingAngles: string[];
  bestChannels: string[];
  estimatedCpa: number;
  estimatedCtr: number;
}

export interface AudienceInsightsResult {
  segments: AudienceSegmentResult[];
  totalAudienceSize: number;
  overlapMatrix: Array<{ segmentA: AudienceSegment; segmentB: AudienceSegment; overlap: number }>;
  insights: string[];
  recommendations: string[];
  lookalikePotential: number;
  audienceFitScore: number;
  dryRun?: boolean;
}

// ── Lookup functions ──

export function getAudienceSegments(): Array<{ segment: AudienceSegment; name: string; description: string }> {
  return [
    { segment: 'primary', name: 'Primary Audience', description: 'Core target audience most likely to convert' },
    { segment: 'secondary', name: 'Secondary Audience', description: 'Adjacent audience with moderate intent' },
    { segment: 'lookalike', name: 'Lookalike Audience', description: 'Net-new prospects similar to existing customers' },
    { segment: 'retargeting', name: 'Retargeting Audience', description: 'Users who previously engaged but didn\'t convert' },
    { segment: 'cold_prospect', name: 'Cold Prospect', description: 'Untapped audience with unknown intent' },
    { segment: 'warm_lead', name: 'Warm Lead', description: 'Audience showing interest signals' },
  ];
}

export function getInterestCategories(): Array<{ category: InterestCategory; name: string }> {
  return [
    { category: 'lifestyle', name: 'Lifestyle' },
    { category: 'technology', name: 'Technology' },
    { category: 'fashion', name: 'Fashion' },
    { category: 'health', name: 'Health' },
    { category: 'finance', name: 'Finance' },
    { category: 'entertainment', name: 'Entertainment' },
    { category: 'food', name: 'Food & Beverage' },
    { category: 'travel', name: 'Travel' },
    { category: 'sports', name: 'Sports' },
    { category: 'beauty', name: 'Beauty' },
    { category: 'home', name: 'Home & Living' },
    { category: 'automotive', name: 'Automotive' },
    { category: 'parenting', name: 'Parenting' },
    { category: 'gaming', name: 'Gaming' },
    { category: 'business', name: 'Business' },
  ];
}

export function getBehaviorPatterns(): Array<{ pattern: BehaviorPattern; name: string; description: string }> {
  return [
    { pattern: 'browsing', name: 'Browsing', description: 'Casual exploration without strong intent' },
    { pattern: 'purchase', name: 'Purchase', description: 'Active buying behavior' },
    { pattern: 'engagement', name: 'Engagement', description: 'Interacting with content regularly' },
    { pattern: 'research', name: 'Research', description: 'Comparing options and reading reviews' },
    { pattern: 'comparison', name: 'Comparison', description: 'Actively comparing competing products' },
    { pattern: 'abandonment', name: 'Abandonment', description: 'Started but didn\'t complete purchase' },
  ];
}

export function getDemographicFields(): Array<{ field: DemographicField; name: string }> {
  return [
    { field: 'age_range', name: 'Age Range' },
    { field: 'gender', name: 'Gender' },
    { field: 'location', name: 'Location' },
    { field: 'income_level', name: 'Income Level' },
    { field: 'education', name: 'Education' },
    { field: 'occupation', name: 'Occupation' },
  ];
}

// ── Calculations ──

export function calculateOverlap(segA: AudienceSegmentResult, segB: AudienceSegmentResult): number {
  if (segA.segment === segB.segment) return 100;
  // Calculate overlap based on shared interests and demographics
  const sharedInterests = segA.topInterests.filter((i) =>
    segB.topInterests.some((j) => j.category === i.category)
  );
  const interestOverlap = (sharedInterests.length / Math.max(segA.topInterests.length, segB.topInterests.length, 1)) * 60;
  const sharedChannels = segA.bestChannels.filter((c) => segB.bestChannels.includes(c));
  const channelOverlap = (sharedChannels.length / Math.max(segA.bestChannels.length, segB.bestChannels.length, 1)) * 40;
  return Math.round(Math.min(95, interestOverlap + channelOverlap));
}

export function calculateAudienceFitScore(segments: AudienceSegmentResult[]): number {
  if (segments.length === 0) return 0;
  const weighted = segments.reduce((sum, s) => {
    const weight = s.size / 100;
    return sum + s.purchaseIntentScore * weight;
  }, 0);
  return Math.round(Math.min(100, weighted / segments.length));
}

export function calculateLookalikePotential(segments: AudienceSegmentResult[]): number {
  if (segments.length === 0) return 0;
  const primary = segments.find((s) => s.segment === 'primary');
  if (!primary) return 50;
  const score = (primary.purchaseIntentScore * 0.4 + primary.estimatedCtr * 0.3 + (100 - Math.min(primary.estimatedCpa, 100)) * 0.3);
  return Math.round(Math.min(100, Math.max(0, score)));
}

// ── Validation ──

export function validateAudienceInsightsRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.productDescription || typeof request.productDescription !== 'string' || !request.productDescription.trim()) {
    errors.push('productDescription is required');
  }
  return { valid: errors.length === 0, errors };
}

// ── AI generation ──

export async function generateAudienceInsights(params: {
  productDescription: string;
  productCategory?: string;
  targetMarket?: string;
  existingCustomerData?: string;
  competitorAudience?: string;
  planTier: PlanTier;
}): Promise<AudienceInsightsResult> {
  if (isDryRun()) {
    return { ...generateFallbackAudience(params), dryRun: true };
  }

  const model = getLLMModel(params.planTier);

  const sys = `You are an audience research expert for e-commerce advertising. Analyze the product and generate detailed audience segments with demographics, interests, behaviors, and purchase intent scoring. Return JSON only.
{
  "segments": [{
    "segment": "primary|secondary|lookalike|retargeting|cold_prospect|warm_lead",
    "name": "...",
    "size": 0-100,
    "demographics": {"ageRange":"...","genderSplit":{"male":0,"female":0,"other":0},"topLocations":[],"incomeLevel":"...","educationLevel":"...","topOccupations":[]},
    "topInterests": [{"category":"...","specificInterests":[],"affinityScore":0}],
    "behaviors": [{"pattern":"...","frequency":0,"triggers":[],"barriers":[],"preferredChannels":[]}],
    "purchaseIntent": "high|medium|low|unknown",
    "purchaseIntentScore": 0-100,
    "bestMessagingAngles": [],
    "bestChannels": [],
    "estimatedCpa": 0,
    "estimatedCtr": 0
  }],
  "insights": [],
  "recommendations": []
}
Product: ${params.productDescription.slice(0, 3000)}
Category: ${params.productCategory || 'N/A'}
Market: ${params.targetMarket || 'Global'}
Existing customers: ${params.existingCustomerData || 'N/A'}
Competitor audience: ${params.competitorAudience || 'N/A'}`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: `Generate audience insights for this product.` },
      ],
      model,
      4000,
    );
    const parsed = JSON.parse(raw);
    const segments: AudienceSegmentResult[] = (parsed.segments || []).map((s: Record<string, unknown>) => ({
      segment: s.segment as AudienceSegment,
      name: String(s.name || 'Segment'),
      size: typeof s.size === 'number' ? s.size : 50,
      demographics: s.demographics as DemographicProfile || {
        ageRange: '25-44', genderSplit: { male: 50, female: 50, other: 0 },
        topLocations: [], incomeLevel: 'medium', educationLevel: 'college', topOccupations: [],
      },
      topInterests: Array.isArray(s.topInterests) ? s.topInterests.map((i: Record<string, unknown>) => ({
        category: i.category as InterestCategory,
        specificInterests: Array.isArray(i.specificInterests) ? i.specificInterests.map(String) : [],
        affinityScore: typeof i.affinityScore === 'number' ? i.affinityScore : 50,
      })) : [],
      behaviors: Array.isArray(s.behaviors) ? s.behaviors.map((b: Record<string, unknown>) => ({
        pattern: b.pattern as BehaviorPattern,
        frequency: typeof b.frequency === 'number' ? b.frequency : 50,
        triggers: Array.isArray(b.triggers) ? b.triggers.map(String) : [],
        barriers: Array.isArray(b.barriers) ? b.barriers.map(String) : [],
        preferredChannels: Array.isArray(b.preferredChannels) ? b.preferredChannels.map(String) : [],
      })) : [],
      purchaseIntent: (s.purchaseIntent as PurchaseIntent) || 'medium',
      purchaseIntentScore: typeof s.purchaseIntentScore === 'number' ? s.purchaseIntentScore : 50,
      bestMessagingAngles: Array.isArray(s.bestMessagingAngles) ? s.bestMessagingAngles.map(String) : [],
      bestChannels: Array.isArray(s.bestChannels) ? s.bestChannels.map(String) : [],
      estimatedCpa: typeof s.estimatedCpa === 'number' ? s.estimatedCpa : 15,
      estimatedCtr: typeof s.estimatedCtr === 'number' ? s.estimatedCtr : 2,
    }));

    const overlapMatrix: AudienceInsightsResult['overlapMatrix'] = [];
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        overlapMatrix.push({
          segmentA: segments[i].segment,
          segmentB: segments[j].segment,
          overlap: calculateOverlap(segments[i], segments[j]),
        });
      }
    }

    return {
      segments,
      totalAudienceSize: segments.reduce((sum, s) => sum + s.size, 0),
      overlapMatrix,
      insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      lookalikePotential: calculateLookalikePotential(segments),
      audienceFitScore: calculateAudienceFitScore(segments),
    };
  } catch {
    return { ...generateFallbackAudience(params), dryRun: true };
  }
}

function generateFallbackAudience(params: { productDescription: string }): AudienceInsightsResult {
  const segments: AudienceSegmentResult[] = [
    {
      segment: 'primary',
      name: 'Primary Target',
      size: 40,
      demographics: {
        ageRange: '25-44', genderSplit: { male: 45, female: 53, other: 2 },
        topLocations: ['US', 'UK', 'CA'], incomeLevel: 'medium-high',
        educationLevel: 'college', topOccupations: ['Professional', 'Manager', 'Entrepreneur'],
      },
      topInterests: [
        { category: 'lifestyle', specificInterests: ['quality products', 'convenience'], affinityScore: 78 },
        { category: 'technology', specificInterests: ['smart shopping'], affinityScore: 65 },
      ],
      behaviors: [
        { pattern: 'research', frequency: 70, triggers: ['need', 'recommendation'], barriers: ['price'], preferredChannels: ['social', 'search'] },
        { pattern: 'purchase', frequency: 55, triggers: ['discount', 'review'], barriers: ['trust'], preferredChannels: ['website', 'app'] },
      ],
      purchaseIntent: 'high',
      purchaseIntentScore: 75,
      bestMessagingAngles: ['Value-driven', 'Quality-focused', 'Convenience'],
      bestChannels: ['meta', 'google', 'instagram'],
      estimatedCpa: 12,
      estimatedCtr: 2.5,
    },
    {
      segment: 'secondary',
      name: 'Secondary Audience',
      size: 30,
      demographics: {
        ageRange: '18-34', genderSplit: { male: 50, female: 48, other: 2 },
        topLocations: ['US', 'AU', 'EU'], incomeLevel: 'medium',
        educationLevel: 'college', topOccupations: ['Student', 'Entry-level', 'Freelancer'],
      },
      topInterests: [
        { category: 'entertainment', specificInterests: ['trends', 'social media'], affinityScore: 70 },
      ],
      behaviors: [
        { pattern: 'browsing', frequency: 65, triggers: ['curiosity'], barriers: ['budget'], preferredChannels: ['social'] },
      ],
      purchaseIntent: 'medium',
      purchaseIntentScore: 55,
      bestMessagingAngles: ['Trendy', 'Affordable', 'Social proof'],
      bestChannels: ['tiktok', 'instagram', 'snapchat'],
      estimatedCpa: 18,
      estimatedCtr: 1.8,
    },
    {
      segment: 'lookalike',
      name: 'Lookalike Prospects',
      size: 30,
      demographics: {
        ageRange: '25-54', genderSplit: { male: 48, female: 50, other: 2 },
        topLocations: ['US', 'UK'], incomeLevel: 'medium',
        educationLevel: 'varied', topOccupations: ['Varied'],
      },
      topInterests: [
        { category: 'lifestyle', specificInterests: ['similar to primary'], affinityScore: 60 },
      ],
      behaviors: [
        { pattern: 'engagement', frequency: 45, triggers: ['ad exposure'], barriers: ['awareness'], preferredChannels: ['meta', 'google'] },
      ],
      purchaseIntent: 'low',
      purchaseIntentScore: 35,
      bestMessagingAngles: ['Discovery', 'New experience'],
      bestChannels: ['meta', 'google'],
      estimatedCpa: 25,
      estimatedCtr: 1.2,
    },
  ];

  const overlapMatrix: AudienceInsightsResult['overlapMatrix'] = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      overlapMatrix.push({
        segmentA: segments[i].segment,
        segmentB: segments[j].segment,
        overlap: calculateOverlap(segments[i], segments[j]),
      });
    }
  }

  return {
    segments,
    totalAudienceSize: 100,
    overlapMatrix,
    insights: [
      'Primary audience shows highest purchase intent — prioritize budget here.',
      'Lookalike audience has lower intent but larger reach potential.',
    ],
    recommendations: [
      'Allocate 60% budget to primary, 25% to lookalike, 15% to retargeting.',
      'Use different messaging angles per segment for better resonance.',
    ],
    lookalikePotential: calculateLookalikePotential(segments),
    audienceFitScore: calculateAudienceFitScore(segments),
  };
}
