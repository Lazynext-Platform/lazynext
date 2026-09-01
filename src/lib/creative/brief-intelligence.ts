import {
  atlasChat,
  resolveModel,
  asStr,
  asStrArr as toolkitAsStrArr,
  asNum,
} from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

export const BRIEF_INTELLIGENCE_COST = 6;

export type BriefType = 'product_launch' | 'brand_awareness' | 'conversion' | 'retargeting' | 'seasonal' | 'comparison' | 'storytelling';
export type USPCategory = 'price' | 'quality' | 'convenience' | 'innovation' | 'service' | 'design' | 'sustainability' | 'exclusivity' | 'performance' | 'social_proof';
export type CompetitiveAdvantage = 'feature_unique' | 'price_advantage' | 'brand_strength' | 'distribution' | 'timing' | 'customer_experience' | 'technology' | 'partnership';
export type BriefScoreDimension = 'clarity' | 'specificity' | 'actionability' | 'audience_focus' | 'differentiation' | 'measurability' | 'emotional_appeal' | 'factual_support';

export interface ProductPositioning {
  productName: string;
  category: string;
  positioningStatement: string;
  targetMarket: string;
  pricePositioning: 'budget' | 'value' | 'premium' | 'luxury';
  lifecycleStage: 'intro' | 'growth' | 'maturity' | 'decline';
}

export interface UniqueSellingProposition {
  uspId: string;
  category: USPCategory;
  statement: string;
  evidence: string;
  strength: number;
  audienceResonance: number;
  competitiveDifferentiation: number;
}

export interface CompetitiveAdvantageResult {
  advantageId: string;
  type: CompetitiveAdvantage;
  description: string;
  competitorsLacking: string[];
  sustainability: number;
  impactLevel: 'high' | 'medium' | 'low';
}

export interface BriefScore {
  overall: number;
  dimensions: Array<{ dimension: BriefScoreDimension; score: number; feedback: string }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface CreativeAlignment {
  creativeId: string;
  alignmentScore: number;
  matchedElements: string[];
  missingElements: string[];
  misalignedElements: Array<{ element: string; briefSays: string; creativeShows: string; severity: 'high' | 'medium' | 'low' }>;
  recommendations: string[];
}

export interface BriefIntelligenceResult {
  positioning: ProductPositioning;
  usps: UniqueSellingProposition[];
  competitiveAdvantages: CompetitiveAdvantageResult[];
  briefScore: BriefScore;
  recommendedAngles: string[];
  recommendedHooks: string[];
  recommendedTones: string[];
  keyMessages: string[];
  audiencePainPoints: string[];
  emotionalTriggers: string[];
  creativeAlignments?: CreativeAlignment[];
  insights: Array<{
    insightId: string;
    type: 'positioning' | 'competitive' | 'audience' | 'messaging' | 'opportunity';
    title: string;
    description: string;
    actionableRecommendation: string;
  }>;
}

function asStrArr(v: unknown): string[] {
  return toolkitAsStrArr(v, 20);
}

function extractJson(raw: string): Record<string, unknown> {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return {};
  }
}

export function getUSPCategories(): Array<{ category: USPCategory; name: string; description: string }> {
  return [
    { category: 'price', name: 'Price', description: 'Cost advantage or value pricing' },
    { category: 'quality', name: 'Quality', description: 'Superior product quality' },
    { category: 'convenience', name: 'Convenience', description: 'Ease of use or accessibility' },
    { category: 'innovation', name: 'Innovation', description: 'Novel or first-of-kind feature' },
    { category: 'service', name: 'Service', description: 'Customer service excellence' },
    { category: 'design', name: 'Design', description: 'Aesthetic or UX superiority' },
    { category: 'sustainability', name: 'Sustainability', description: 'Environmental or social responsibility' },
    { category: 'exclusivity', name: 'Exclusivity', description: 'Limited availability or access' },
    { category: 'performance', name: 'Performance', description: 'Speed, efficiency, or output' },
    { category: 'social_proof', name: 'Social Proof', description: 'Endorsements, reviews, testimonials' },
  ];
}

export function getCompetitiveAdvantages(): Array<{ type: CompetitiveAdvantage; name: string; description: string }> {
  return [
    { type: 'feature_unique', name: 'Unique Feature', description: 'Feature competitors cannot replicate' },
    { type: 'price_advantage', name: 'Price Advantage', description: 'Better pricing structure' },
    { type: 'brand_strength', name: 'Brand Strength', description: 'Stronger brand recognition' },
    { type: 'distribution', name: 'Distribution', description: 'Superior distribution channels' },
    { type: 'timing', name: 'Timing', description: 'First-mover or market timing advantage' },
    { type: 'customer_experience', name: 'Customer Experience', description: 'Better end-to-end experience' },
    { type: 'technology', name: 'Technology', description: 'Proprietary technology or patents' },
    { type: 'partnership', name: 'Partnership', description: 'Strategic partnerships or integrations' },
  ];
}

export function getBriefTypes(): Array<{ type: BriefType; name: string; description: string }> {
  return [
    { type: 'product_launch', name: 'Product Launch', description: 'Introducing a new product to market' },
    { type: 'brand_awareness', name: 'Brand Awareness', description: 'Building brand recognition' },
    { type: 'conversion', name: 'Conversion', description: 'Driving direct conversions or sales' },
    { type: 'retargeting', name: 'Retargeting', description: 'Re-engaging past visitors or customers' },
    { type: 'seasonal', name: 'Seasonal', description: 'Time-sensitive or seasonal campaigns' },
    { type: 'comparison', name: 'Comparison', description: 'Direct comparison with competitors' },
    { type: 'storytelling', name: 'Storytelling', description: 'Narrative-driven brand storytelling' },
  ];
}

export function getBriefScoreDimensions(): Array<{ dimension: BriefScoreDimension; name: string; description: string }> {
  return [
    { dimension: 'clarity', name: 'Clarity', description: 'How clear and understandable the brief is' },
    { dimension: 'specificity', name: 'Specificity', description: 'Level of detail and specificity' },
    { dimension: 'actionability', name: 'Actionability', description: 'How actionable the brief is for creatives' },
    { dimension: 'audience_focus', name: 'Audience Focus', description: 'How well the target audience is defined' },
    { dimension: 'differentiation', name: 'Differentiation', description: 'How well the brief differentiates from competitors' },
    { dimension: 'measurability', name: 'Measurability', description: 'Whether success metrics are defined' },
    { dimension: 'emotional_appeal', name: 'Emotional Appeal', description: 'Emotional resonance of the messaging' },
    { dimension: 'factual_support', name: 'Factual Support', description: 'Evidence and data backing claims' },
  ];
}

export function validateBriefRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.productName || typeof request.productName !== 'string' || !request.productName.trim()) {
    errors.push('productName is required');
  }
  return { valid: errors.length === 0, errors };
}

export function scoreBrief(brief: { positioning: ProductPositioning; usps: UniqueSellingProposition[]; keyMessages: string[] }): BriefScore {
  const dimensions: BriefScore['dimensions'] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Clarity
  const clarityScore = brief.positioning.positioningStatement.length > 50 ? 85 : 50;
  dimensions.push({ dimension: 'clarity', score: clarityScore, feedback: clarityScore > 70 ? 'Clear positioning statement' : 'Positioning statement needs more detail' });
  if (clarityScore > 70) strengths.push('Clear positioning'); else weaknesses.push('Positioning unclear');

  // Specificity
  const specScore = brief.usps.length >= 3 ? 80 : brief.usps.length >= 1 ? 60 : 30;
  dimensions.push({ dimension: 'specificity', score: specScore, feedback: specScore > 70 ? 'Good specificity with multiple USPs' : 'Add more specific USPs' });
  if (specScore > 70) strengths.push('Specific USPs'); else weaknesses.push('Needs more USPs');

  // Actionability
  const actionScore = brief.keyMessages.length >= 3 ? 75 : 40;
  dimensions.push({ dimension: 'actionability', score: actionScore, feedback: actionScore > 60 ? 'Actionable key messages' : 'Add more actionable messages' });

  // Audience focus
  const audienceScore = brief.positioning.targetMarket.length > 20 ? 80 : 45;
  dimensions.push({ dimension: 'audience_focus', score: audienceScore, feedback: audienceScore > 60 ? 'Well-defined target market' : 'Target market needs more detail' });

  // Differentiation
  const diffScore = brief.usps.some((u) => u.competitiveDifferentiation >= 7) ? 85 : 50;
  dimensions.push({ dimension: 'differentiation', score: diffScore, feedback: diffScore > 70 ? 'Strong competitive differentiation' : 'Improve differentiation' });

  // Measurability
  dimensions.push({ dimension: 'measurability', score: 60, feedback: 'Define clear success metrics' });

  // Emotional appeal
  dimensions.push({ dimension: 'emotional_appeal', score: 65, feedback: 'Consider emotional triggers in messaging' });

  // Factual support
  const factualScore = brief.usps.some((u) => u.evidence.length > 10) ? 75 : 40;
  dimensions.push({ dimension: 'factual_support', score: factualScore, feedback: factualScore > 60 ? 'Good evidence backing' : 'Add more supporting evidence' });

  const overall = Math.round(dimensions.reduce((a, d) => a + d.score, 0) / dimensions.length);

  if (overall < 70) recommendations.push('Refine brief to improve overall score');
  recommendations.push('Add measurable success criteria');
  recommendations.push('Include emotional triggers in key messages');

  return { overall, dimensions, strengths, weaknesses, recommendations };
}

export function checkCreativeAlignment(brief: BriefIntelligenceResult, creatives: Array<{ creativeId: string; content: string }>): CreativeAlignment[] {
  return creatives.map((c) => {
    const content = c.content.toLowerCase();
    const matchedElements: string[] = [];
    const missingElements: string[] = [];
    const misalignedElements: CreativeAlignment['misalignedElements'] = [];

    for (const usp of brief.usps) {
      if (content.includes(usp.statement.toLowerCase().slice(0, 20))) {
        matchedElements.push(`USP: ${usp.statement.slice(0, 40)}`);
      } else {
        missingElements.push(`USP: ${usp.statement.slice(0, 40)}`);
      }
    }

    for (const msg of brief.keyMessages) {
      if (content.includes(msg.toLowerCase().slice(0, 15))) {
        matchedElements.push(`Message: ${msg.slice(0, 40)}`);
      }
    }

    const alignmentScore = Math.min(100, Math.round((matchedElements.length / Math.max(1, brief.usps.length + brief.keyMessages.length)) * 100));

    return {
      creativeId: c.creativeId,
      alignmentScore,
      matchedElements,
      missingElements,
      misalignedElements,
      recommendations: missingElements.length > 0 ? [`Add missing elements: ${missingElements.slice(0, 3).join(', ')}`] : ['Well aligned with brief'],
    };
  });
}

export async function analyzeBrief(request: {
  productName: string;
  productDescription?: string;
  productUrl?: string;
  competitorInfo?: string;
  briefType?: BriefType;
  existingCreatives?: Array<{ creativeId: string; content: string }>;
  planTier?: PlanTier;
}): Promise<BriefIntelligenceResult> {
  const model = resolveModel(request.planTier);
  const briefTypeStr = request.briefType || 'product_launch';

  const sysPrompt = `You are an expert creative brief analyst and product positioning strategist.
Analyze the product and generate a comprehensive creative brief intelligence report.
Return ONLY valid JSON with this structure:
{
  "positioning": { "productName": string, "category": string, "positioningStatement": string, "targetMarket": string, "pricePositioning": "budget"|"value"|"premium"|"luxury", "lifecycleStage": "intro"|"growth"|"maturity"|"decline" },
  "usps": [{ "category": string, "statement": string, "evidence": string, "strength": number(1-10), "audienceResonance": number(1-10), "competitiveDifferentiation": number(1-10) }],
  "competitiveAdvantages": [{ "type": string, "description": string, "competitorsLacking": string[], "sustainability": number(1-10), "impactLevel": "high"|"medium"|"low" }],
  "recommendedAngles": string[],
  "recommendedHooks": string[],
  "recommendedTones": string[],
  "keyMessages": string[],
  "audiencePainPoints": string[],
  "emotionalTriggers": string[],
  "insights": [{ "type": "positioning"|"competitive"|"audience"|"messaging"|"opportunity", "title": string, "description": string, "actionableRecommendation": string }]
}`;

  const userPrompt = `Product: ${request.productName}
Description: ${request.productDescription || 'N/A'}
URL: ${request.productUrl || 'N/A'}
Competitor info: ${request.competitorInfo || 'N/A'}
Brief type: ${briefTypeStr}`;

  let result: BriefIntelligenceResult;
  try {
    const raw = await atlasChat(
      [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
      model, 2000, 60000,
    );
    const j = extractJson(raw);

    const usps: UniqueSellingProposition[] = (Array.isArray(j.usps) ? j.usps : []).slice(0, 8).map((u: Record<string, unknown>, i: number) => ({
      uspId: `usp_${i + 1}`,
      category: asStr(u.category, 'quality') as USPCategory,
      statement: asStr(u.statement),
      evidence: asStr(u.evidence),
      strength: asNum(u.strength, 5, 1, 10),
      audienceResonance: asNum(u.audienceResonance, 5, 1, 10),
      competitiveDifferentiation: asNum(u.competitiveDifferentiation, 5, 1, 10),
    }));

    const advantages: CompetitiveAdvantageResult[] = (Array.isArray(j.competitiveAdvantages) ? j.competitiveAdvantages : []).slice(0, 6).map((a: Record<string, unknown>, i: number) => ({
      advantageId: `adv_${i + 1}`,
      type: asStr(a.type, 'feature_unique') as CompetitiveAdvantage,
      description: asStr(a.description),
      competitorsLacking: asStrArr(a.competitorsLacking),
      sustainability: asNum(a.sustainability, 5, 1, 10),
      impactLevel: asStr(a.impactLevel, 'medium') as 'high' | 'medium' | 'low',
    }));

    const positioning: ProductPositioning = {
      productName: asStr((j.positioning as Record<string, unknown>)?.productName, request.productName),
      category: asStr((j.positioning as Record<string, unknown>)?.category),
      positioningStatement: asStr((j.positioning as Record<string, unknown>)?.positioningStatement),
      targetMarket: asStr((j.positioning as Record<string, unknown>)?.targetMarket),
      pricePositioning: asStr((j.positioning as Record<string, unknown>)?.pricePositioning, 'value') as ProductPositioning['pricePositioning'],
      lifecycleStage: asStr((j.positioning as Record<string, unknown>)?.lifecycleStage, 'growth') as ProductPositioning['lifecycleStage'],
    };

    const keyMessages = asStrArr(j.keyMessages);
    const briefScore = scoreBrief({ positioning, usps, keyMessages });

    const insights: BriefIntelligenceResult['insights'] = (Array.isArray(j.insights) ? j.insights : []).slice(0, 8).map((ins: Record<string, unknown>, i: number) => ({
      insightId: `insight_${i + 1}`,
      type: asStr(ins.type, 'positioning') as BriefIntelligenceResult['insights'][0]['type'],
      title: asStr(ins.title),
      description: asStr(ins.description),
      actionableRecommendation: asStr(ins.actionableRecommendation),
    }));

    result = {
      positioning,
      usps,
      competitiveAdvantages: advantages,
      briefScore,
      recommendedAngles: asStrArr(j.recommendedAngles),
      recommendedHooks: asStrArr(j.recommendedHooks),
      recommendedTones: asStrArr(j.recommendedTones),
      keyMessages,
      audiencePainPoints: asStrArr(j.audiencePainPoints),
      emotionalTriggers: asStrArr(j.emotionalTriggers),
      insights,
    };
  } catch {
    // Fallback
    const positioning: ProductPositioning = {
      productName: request.productName,
      category: 'General',
      positioningStatement: `${request.productName} is a quality product for its target market.`,
      targetMarket: 'General audience',
      pricePositioning: 'value',
      lifecycleStage: 'growth',
    };
    const usps: UniqueSellingProposition[] = [
      { uspId: 'usp_1', category: 'quality', statement: 'High-quality product', evidence: 'Product quality', strength: 7, audienceResonance: 6, competitiveDifferentiation: 5 },
    ];
    result = {
      positioning,
      usps,
      competitiveAdvantages: [],
      briefScore: scoreBrief({ positioning, usps, keyMessages: [] }),
      recommendedAngles: ['Problem-solution', 'Benefit-focused'],
      recommendedHooks: ['Question hook', 'Bold claim'],
      recommendedTones: ['Professional', 'Friendly'],
      keyMessages: ['Quality you can trust'],
      audiencePainPoints: ['Need for better solutions'],
      emotionalTriggers: ['Trust', 'Confidence'],
      insights: [],
    };
  }

  if (request.existingCreatives && request.existingCreatives.length > 0) {
    result.creativeAlignments = checkCreativeAlignment(result, request.existingCreatives);
  }

  return result;
}
