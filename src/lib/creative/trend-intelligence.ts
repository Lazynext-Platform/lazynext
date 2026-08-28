/**
 * Trend Intelligence.
 *
 * Real-time trend detection, seasonal opportunity identification,
 * trending topic integration, cultural moment tracking, and
 * trend-driven creative ideation.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const TREND_INTELLIGENCE_COST = 6;

// ── Types ──

export type TrendStatus = 'rising' | 'peaking' | 'declining' | 'emerging' | 'stable';

export type TrendCategory =
  | 'cultural'
  | 'seasonal'
  | 'viral'
  | 'industry'
  | 'consumer_behavior'
  | 'technology'
  | 'social_media'
  | 'economic';

export type TrendVelocity = 'slow' | 'moderate' | 'fast' | 'explosive';

export type TrendTimeframe = 'immediate' | 'short_term' | 'medium_term' | 'long_term';

export type OpportunityType =
  | 'content_gap'
  | 'format_trend'
  | 'meme_trend'
  | 'hashtag_trend'
  | 'audio_trend'
  | 'visual_trend'
  | 'messaging_trend';

// ── Interfaces ──

export interface TrendSignal {
  trendId: string;
  name: string;
  category: TrendCategory;
  status: TrendStatus;
  velocity: TrendVelocity;
  timeframe: TrendTimeframe;
  description: string;
  startDate: string;
  peakDate?: string;
  estimatedDuration: number;
  momentumScore: number;
  relevanceScore: number;
  volumeScore: number;
  platforms: string[];
  geographicSpread: string[];
  demographics: string[];
  keywords: string[];
  hashtags: string[];
  exampleContent: string[];
}

export interface TrendOpportunity {
  opportunityType: OpportunityType;
  trendId: string;
  trendName: string;
  opportunityScore: number;
  effortLevel: 'low' | 'medium' | 'high';
  timeToMarket: number;
  potentialReach: number;
  recommendedAction: string;
  creativeAngle: string;
  suggestedFormats: string[];
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
}

export interface SeasonalOpportunity {
  eventName: string;
  date: string;
  daysUntil: number;
  category: string;
  relevanceScore: number;
  recommendedFormats: string[];
  preparationLeadTime: number;
  historicalPerformance?: string;
}

export interface TrendIntelligenceResult {
  trends: TrendSignal[];
  opportunities: TrendOpportunity[];
  seasonalOpportunities: SeasonalOpportunity[];
  insights: string[];
  recommendations: string[];
  trendingKeywords: string[];
  trendingHashtags: string[];
  trendingAudio: string[];
  marketTiming: {
    bestTimeToPost: string;
    bestDayOfWeek: string;
    trendingWindow: string;
  };
}

// ── Lookup functions ──

export function getTrendStatuses(): Array<{ status: TrendStatus; name: string; description: string }> {
  return [
    { status: 'rising', name: 'Rising', description: 'Gaining momentum rapidly' },
    { status: 'peaking', name: 'Peaking', description: 'At or near maximum visibility' },
    { status: 'declining', name: 'Declining', description: 'Past peak, losing momentum' },
    { status: 'emerging', name: 'Emerging', description: 'Early stage, not yet mainstream' },
    { status: 'stable', name: 'Stable', description: 'Consistent, sustained interest' },
  ];
}

export function getTrendCategories(): Array<{ category: TrendCategory; name: string; description: string }> {
  return [
    { category: 'cultural', name: 'Cultural', description: 'Broader cultural movements and shifts' },
    { category: 'seasonal', name: 'Seasonal', description: 'Time-based and holiday trends' },
    { category: 'viral', name: 'Viral', description: 'Rapidly spreading content trends' },
    { category: 'industry', name: 'Industry', description: 'Industry-specific developments' },
    { category: 'consumer_behavior', name: 'Consumer Behavior', description: 'Changes in how consumers shop/interact' },
    { category: 'technology', name: 'Technology', description: 'Tech adoption and platform changes' },
    { category: 'social_media', name: 'Social Media', description: 'Platform-specific trends and features' },
    { category: 'economic', name: 'Economic', description: 'Economic factors affecting purchasing' },
  ];
}

export function getTrendVelocities(): Array<{ velocity: TrendVelocity; name: string; description: string }> {
  return [
    { velocity: 'slow', name: 'Slow', description: 'Gradual growth over weeks/months' },
    { velocity: 'moderate', name: 'Moderate', description: 'Steady growth over days' },
    { velocity: 'fast', name: 'Fast', description: 'Rapid growth within days' },
    { velocity: 'explosive', name: 'Explosive', description: 'Viral overnight growth' },
  ];
}

export function getOpportunityTypes(): Array<{ type: OpportunityType; name: string; description: string }> {
  return [
    { type: 'content_gap', name: 'Content Gap', description: 'Underserved topic with demand' },
    { type: 'format_trend', name: 'Format Trend', description: 'Trending content format' },
    { type: 'meme_trend', name: 'Meme Trend', description: 'Viral meme format' },
    { type: 'hashtag_trend', name: 'Hashtag Trend', description: 'Trending hashtag challenge' },
    { type: 'audio_trend', name: 'Audio Trend', description: 'Trending audio/sound' },
    { type: 'visual_trend', name: 'Visual Trend', description: 'Trending visual style' },
    { type: 'messaging_trend', name: 'Messaging Trend', description: 'Trending messaging angle' },
  ];
}

// ── Calculations ──

export function calculateOpportunityScore(trend: TrendSignal, relevanceScore: number): number {
  const momentumWeight = 0.3;
  const relevanceWeight = 0.4;
  const volumeWeight = 0.2;
  const statusBonus = trend.status === 'rising' ? 10 : trend.status === 'emerging' ? 8 : trend.status === 'peaking' ? 5 : 0;
  const velocityBonus = trend.velocity === 'explosive' ? 8 : trend.velocity === 'fast' ? 5 : 0;
  const score = trend.momentumScore * momentumWeight + relevanceScore * relevanceWeight + trend.volumeScore * volumeWeight + statusBonus + velocityBonus;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function calculateMomentumTrend(velocity: TrendVelocity, volumeScore: number): number {
  const velocityMultiplier: Record<TrendVelocity, number> = {
    slow: 0.5,
    moderate: 0.7,
    fast: 0.85,
    explosive: 1.0,
  };
  return Math.round(Math.min(100, volumeScore * velocityMultiplier[velocity]));
}

// ── Validation ──

export function validateTrendIntelligenceRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.productNiche || typeof request.productNiche !== 'string' || !request.productNiche.trim()) {
    errors.push('productNiche is required');
  }
  return { valid: errors.length === 0, errors };
}

// ── AI generation ──

export async function generateTrendIntelligence(params: {
  productNiche: string;
  productCategory?: string;
  targetAudience?: string;
  platforms?: string[];
  timeframe?: TrendTimeframe;
  planTier: PlanTier;
}): Promise<TrendIntelligenceResult> {
  const model = getLLMModel(params.planTier);
  const platforms = (params.platforms || ['meta', 'tiktok', 'instagram']).join(', ');

  const sys = `You are a trend intelligence analyst for e-commerce advertising. Identify current trends, opportunities, and seasonal events relevant to the product niche. Return JSON only.
{
  "trends": [{
    "trendId":"t1","name":"...","category":"cultural|seasonal|viral|industry|consumer_behavior|technology|social_media|economic",
    "status":"rising|peaking|declining|emerging|stable","velocity":"slow|moderate|fast|explosive",
    "timeframe":"immediate|short_term|medium_term|long_term","description":"...",
    "startDate":"...","estimatedDuration":0,"momentumScore":0,"relevanceScore":0,"volumeScore":0,
    "platforms":[],"geographicSpread":[],"demographics":[],"keywords":[],"hashtags":[],"exampleContent":[]
  }],
  "opportunities": [{
    "opportunityType":"content_gap|format_trend|meme_trend|hashtag_trend|audio_trend|visual_trend|messaging_trend",
    "trendId":"t1","trendName":"...","opportunityScore":0,"effortLevel":"low|medium|high",
    "timeToMarket":0,"potentialReach":0,"recommendedAction":"...","creativeAngle":"...",
    "suggestedFormats":[],"riskLevel":"low|medium|high","riskFactors":[]
  }],
  "seasonalOpportunities": [{
    "eventName":"...","date":"...","daysUntil":0,"category":"...","relevanceScore":0,
    "recommendedFormats":[],"preparationLeadTime":0
  }],
  "insights": [], "recommendations": [],
  "trendingKeywords": [], "trendingHashtags": [], "trendingAudio": [],
  "marketTiming": {"bestTimeToPost":"...","bestDayOfWeek":"...","trendingWindow":"..."}
}
Niche: ${params.productNiche}
Category: ${params.productCategory || 'N/A'}
Audience: ${params.targetAudience || 'General'}
Platforms: ${platforms}
Timeframe: ${params.timeframe || 'short_term'}`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: `Generate trend intelligence for this niche.` },
      ],
      model,
      4000,
    );
    const parsed = JSON.parse(raw);

    const trends: TrendSignal[] = (parsed.trends || []).map((t: Record<string, unknown>, i: number) => ({
      trendId: String(t.trendId || `t${i + 1}`),
      name: String(t.name || `Trend ${i + 1}`),
      category: t.category as TrendCategory,
      status: t.status as TrendStatus,
      velocity: t.velocity as TrendVelocity,
      timeframe: (t.timeframe as TrendTimeframe) || 'short_term',
      description: String(t.description || ''),
      startDate: String(t.startDate || ''),
      peakDate: t.peakDate ? String(t.peakDate) : undefined,
      estimatedDuration: typeof t.estimatedDuration === 'number' ? t.estimatedDuration : 30,
      momentumScore: typeof t.momentumScore === 'number' ? t.momentumScore : 50,
      relevanceScore: typeof t.relevanceScore === 'number' ? t.relevanceScore : 50,
      volumeScore: typeof t.volumeScore === 'number' ? t.volumeScore : 50,
      platforms: Array.isArray(t.platforms) ? t.platforms.map(String) : [],
      geographicSpread: Array.isArray(t.geographicSpread) ? t.geographicSpread.map(String) : [],
      demographics: Array.isArray(t.demographics) ? t.demographics.map(String) : [],
      keywords: Array.isArray(t.keywords) ? t.keywords.map(String) : [],
      hashtags: Array.isArray(t.hashtags) ? t.hashtags.map(String) : [],
      exampleContent: Array.isArray(t.exampleContent) ? t.exampleContent.map(String) : [],
    }));

    const opportunities: TrendOpportunity[] = (parsed.opportunities || []).map((o: Record<string, unknown>) => ({
      opportunityType: o.opportunityType as OpportunityType,
      trendId: String(o.trendId || ''),
      trendName: String(o.trendName || ''),
      opportunityScore: typeof o.opportunityScore === 'number' ? o.opportunityScore : 50,
      effortLevel: (o.effortLevel as 'low' | 'medium' | 'high') || 'medium',
      timeToMarket: typeof o.timeToMarket === 'number' ? o.timeToMarket : 24,
      potentialReach: typeof o.potentialReach === 'number' ? o.potentialReach : 10000,
      recommendedAction: String(o.recommendedAction || ''),
      creativeAngle: String(o.creativeAngle || ''),
      suggestedFormats: Array.isArray(o.suggestedFormats) ? o.suggestedFormats.map(String) : [],
      riskLevel: (o.riskLevel as 'low' | 'medium' | 'high') || 'low',
      riskFactors: Array.isArray(o.riskFactors) ? o.riskFactors.map(String) : [],
    }));

    const seasonalOpportunities: SeasonalOpportunity[] = (parsed.seasonalOpportunities || []).map((s: Record<string, unknown>) => ({
      eventName: String(s.eventName || ''),
      date: String(s.date || ''),
      daysUntil: typeof s.daysUntil === 'number' ? s.daysUntil : 30,
      category: String(s.category || ''),
      relevanceScore: typeof s.relevanceScore === 'number' ? s.relevanceScore : 50,
      recommendedFormats: Array.isArray(s.recommendedFormats) ? s.recommendedFormats.map(String) : [],
      preparationLeadTime: typeof s.preparationLeadTime === 'number' ? s.preparationLeadTime : 14,
      historicalPerformance: s.historicalPerformance ? String(s.historicalPerformance) : undefined,
    }));

    return {
      trends,
      opportunities,
      seasonalOpportunities,
      insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      trendingKeywords: Array.isArray(parsed.trendingKeywords) ? parsed.trendingKeywords.map(String) : [],
      trendingHashtags: Array.isArray(parsed.trendingHashtags) ? parsed.trendingHashtags.map(String) : [],
      trendingAudio: Array.isArray(parsed.trendingAudio) ? parsed.trendingAudio.map(String) : [],
      marketTiming: parsed.marketTiming || {
        bestTimeToPost: '6-9 PM',
        bestDayOfWeek: 'Tuesday',
        trendingWindow: 'Next 2-4 weeks',
      },
    };
  } catch {
    return generateFallbackTrends(params);
  }
}

function generateFallbackTrends(params: { productNiche: string }): TrendIntelligenceResult {
  const trends: TrendSignal[] = [
    {
      trendId: 't1',
      name: 'Short-form video dominance',
      category: 'social_media',
      status: 'peaking',
      velocity: 'fast',
      timeframe: 'short_term',
      description: 'Short-form vertical video continues to be the highest-performing format across platforms.',
      startDate: '2026-01-01',
      estimatedDuration: 180,
      momentumScore: 85,
      relevanceScore: 80,
      volumeScore: 90,
      platforms: ['tiktok', 'instagram', 'youtube'],
      geographicSpread: ['global'],
      demographics: ['18-44'],
      keywords: ['vertical video', 'short form', 'reels'],
      hashtags: ['#shorts', '#reels', '#fyp'],
      exampleContent: ['15s product demo', 'before/after transformation'],
    },
    {
      trendId: 't2',
      name: 'Authentic UGC content',
      category: 'consumer_behavior',
      status: 'rising',
      velocity: 'moderate',
      timeframe: 'medium_term',
      description: 'Consumers increasingly prefer authentic user-generated content over polished brand ads.',
      startDate: '2026-03-01',
      estimatedDuration: 365,
      momentumScore: 70,
      relevanceScore: 85,
      volumeScore: 65,
      platforms: ['meta', 'tiktok', 'instagram'],
      geographicSpread: ['global'],
      demographics: ['18-54'],
      keywords: ['authentic', 'real', 'unfiltered'],
      hashtags: ['#real', '#authentic', '#ugc'],
      exampleContent: ['Customer testimonial', 'Unboxing video'],
    },
    {
      trendId: 't3',
      name: 'AI-powered personalization',
      category: 'technology',
      status: 'emerging',
      velocity: 'fast',
      timeframe: 'medium_term',
      description: 'AI-driven creative personalization is becoming accessible to mid-market advertisers.',
      startDate: '2026-06-01',
      estimatedDuration: 365,
      momentumScore: 60,
      relevanceScore: 75,
      volumeScore: 55,
      platforms: ['meta', 'google'],
      geographicSpread: ['US', 'EU'],
      demographics: ['25-54'],
      keywords: ['AI', 'personalization', 'dynamic creative'],
      hashtags: ['#AI', '#personalized'],
      exampleContent: ['Dynamic product ads', 'Personalized recommendations'],
    },
  ];

  const opportunities: TrendOpportunity[] = [
    {
      opportunityType: 'format_trend',
      trendId: 't1',
      trendName: 'Short-form video dominance',
      opportunityScore: calculateOpportunityScore(trends[0], 80),
      effortLevel: 'medium',
      timeToMarket: 48,
      potentialReach: 50000,
      recommendedAction: 'Create 3-5 short-form vertical videos highlighting key product benefits.',
      creativeAngle: 'Fast-paced product demo with trend-relevant audio.',
      suggestedFormats: ['9:16 video', 'Reels', 'TikTok'],
      riskLevel: 'low',
      riskFactors: ['Format saturation'],
    },
    {
      opportunityType: 'content_gap',
      trendId: 't2',
      trendName: 'Authentic UGC content',
      opportunityScore: calculateOpportunityScore(trends[1], 85),
      effortLevel: 'low',
      timeToMarket: 24,
      potentialReach: 30000,
      recommendedAction: 'Source and amplify authentic customer content.',
      creativeAngle: 'Real customer stories with minimal editing.',
      suggestedFormats: ['UGC video', 'Testimonial', 'Review'],
      riskLevel: 'low',
      riskFactors: ['Content rights clearance'],
    },
  ];

  return {
    trends,
    opportunities,
    seasonalOpportunities: [
      {
        eventName: 'Back to School',
        date: '2026-09-01',
        daysUntil: 3,
        category: 'seasonal',
        relevanceScore: 60,
        recommendedFormats: ['Image carousel', 'Short video'],
        preparationLeadTime: 14,
      },
    ],
    insights: [
      'Short-form video remains the dominant format — prioritize vertical content.',
      'Authentic UGC is rising and has high relevance to your niche.',
      'AI-powered personalization is emerging — early adopters will gain advantage.',
    ],
    recommendations: [
      'Allocate 50% of creative budget to short-form vertical video.',
      'Begin sourcing UGC content from existing customers.',
      'Experiment with AI-personalized ad variants.',
    ],
    trendingKeywords: ['vertical video', 'authentic', 'AI personalization', 'UGC'],
    trendingHashtags: ['#shorts', '#reels', '#fyp', '#authentic', '#ugc'],
    trendingAudio: ['Trending upbeat tracks', 'Lo-fi background music'],
    marketTiming: {
      bestTimeToPost: '6-9 PM local time',
      bestDayOfWeek: 'Tuesday and Thursday',
      trendingWindow: 'Next 2-4 weeks',
    },
  };
}
