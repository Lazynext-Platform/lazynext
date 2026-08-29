/**
 * Campaign Orchestrator.
 *
 * A stateful campaign lifecycle manager that owns the full flow:
 * goal → research → concepts → approvals → budget → publish → optimize.
 * Goes beyond the single-creative director loop by managing an entire
 * campaign with persistent state, phase transitions, and autonomous ops.
 *
 * Inspired by Agentic-Ads (#9) and Polsia (#44-46) — agentic ad
 * orchestration with agent state and autonomous operations.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const CAMPAIGN_ORCHESTRATOR_COST = 10;

// ── Types ──

export type CampaignPhase =
  | 'goal_definition'
  | 'research'
  | 'concept_generation'
  | 'approval'
  | 'budget_allocation'
  | 'production'
  | 'publishing'
  | 'optimization'
  | 'completed'
  | 'paused';

export type CampaignGoal =
  | 'brand_awareness'
  | 'product_launch'
  | 'sales_boost'
  | 'retargeting'
  | 'market_expansion'
  | 'customer_acquisition'
  | 'engagement'
  | 'seasonal_promotion';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export type OptimizationAction =
  | 'scale_winners'
  | 'pause_underperformers'
  | 'reallocate_budget'
  | 'refresh_creatives'
  | 'test_new_audience'
  | 'adjust_bidding'
  | 'expand_platforms';

// ── Interfaces ──

export interface CampaignGoalDefinition {
  goal: CampaignGoal;
  primaryKpi: string;
  secondaryKpis: string[];
  targetMetrics: {
    metric: string;
    target: number;
    current?: number;
  }[];
  successCriteria: string[];
  timeline: {
    phase: CampaignPhase;
    estimatedDuration: number; // days
  }[];
}

export interface CampaignResearch {
  marketAnalysis: string;
  competitorSummary: string[];
  audienceSummary: string;
  trendInsights: string[];
  opportunityGaps: string[];
}

export interface CampaignConcept {
  conceptId: string;
  name: string;
  angle: string;
  targetAudience: string;
  platforms: string[];
  estimatedCost: number;
  estimatedReach: number;
  estimatedCtr: number;
  estimatedCvr: number;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
  creativeBrief: string;
  variants: string[];
}

export interface CampaignBudget {
  totalBudget: number;
  allocation: Array<{
    platform: string;
    amount: number;
    percentage: number;
    rationale: string;
  }>;
  dailyPacing: number;
  reservePercentage: number;
  optimizationRules: string[];
}

export interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
  topPerformingConcept?: string;
  underperformingConcepts: string[];
}

export interface CampaignOptimization {
  action: OptimizationAction;
  rationale: string;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
  affectedConcepts: string[];
  budgetChange?: number;
}

export interface CampaignState {
  campaignId: string;
  name: string;
  status: CampaignStatus;
  currentPhase: CampaignPhase;
  phaseHistory: Array<{ phase: CampaignPhase; enteredAt: string; duration?: number }>;
  goal: CampaignGoalDefinition;
  research?: CampaignResearch;
  concepts: CampaignConcept[];
  budget?: CampaignBudget;
  metrics?: CampaignMetrics;
  optimizations: CampaignOptimization[];
  insights: string[];
  recommendations: string[];
  nextActions: string[];
  autonomyLevel: 'manual' | 'semi_autonomous' | 'fully_autonomous';
  createdAt: string;
  updatedAt: string;
}

export interface CampaignOrchestrationResult {
  campaign: CampaignState;
  phaseTransition?: {
    from: CampaignPhase;
    to: CampaignPhase;
    reason: string;
  };
  insights: string[];
  recommendations: string[];
}

// ── Lookup functions ──

export function getCampaignPhases(): Array<{ phase: CampaignPhase; name: string; description: string }> {
  return [
    { phase: 'goal_definition', name: 'Goal Definition', description: 'Define campaign objectives and KPIs' },
    { phase: 'research', name: 'Research', description: 'Market, competitor, and audience research' },
    { phase: 'concept_generation', name: 'Concept Generation', description: 'Generate creative concepts and variants' },
    { phase: 'approval', name: 'Approval', description: 'Review and approve concepts' },
    { phase: 'budget_allocation', name: 'Budget Allocation', description: 'Allocate budget across platforms and concepts' },
    { phase: 'production', name: 'Production', description: 'Produce creative assets' },
    { phase: 'publishing', name: 'Publishing', description: 'Publish ads to platforms' },
    { phase: 'optimization', name: 'Optimization', description: 'Monitor and optimize performance' },
    { phase: 'completed', name: 'Completed', description: 'Campaign completed' },
    { phase: 'paused', name: 'Paused', description: 'Campaign paused' },
  ];
}

export function getCampaignGoals(): Array<{ goal: CampaignGoal; name: string; description: string }> {
  return [
    { goal: 'brand_awareness', name: 'Brand Awareness', description: 'Increase brand visibility and recall' },
    { goal: 'product_launch', name: 'Product Launch', description: 'Launch a new product to market' },
    { goal: 'sales_boost', name: 'Sales Boost', description: 'Drive immediate sales uplift' },
    { goal: 'retargeting', name: 'Retargeting', description: 'Re-engage past visitors/customers' },
    { goal: 'market_expansion', name: 'Market Expansion', description: 'Enter new markets or demographics' },
    { goal: 'customer_acquisition', name: 'Customer Acquisition', description: 'Acquire new customers' },
    { goal: 'engagement', name: 'Engagement', description: 'Boost engagement and interaction' },
    { goal: 'seasonal_promotion', name: 'Seasonal Promotion', description: 'Capitalize on seasonal events' },
  ];
}

export function getOptimizationActions(): Array<{ action: OptimizationAction; name: string; description: string }> {
  return [
    { action: 'scale_winners', name: 'Scale Winners', description: 'Increase budget on top performers' },
    { action: 'pause_underperformers', name: 'Pause Underperformers', description: 'Stop low-performing ads' },
    { action: 'reallocate_budget', name: 'Reallocate Budget', description: 'Shift budget to better platforms/concepts' },
    { action: 'refresh_creatives', name: 'Refresh Creatives', description: 'Generate new creative variants' },
    { action: 'test_new_audience', name: 'Test New Audience', description: 'Experiment with new audience segments' },
    { action: 'adjust_bidding', name: 'Adjust Bidding', description: 'Optimize bid strategy' },
    { action: 'expand_platforms', name: 'Expand Platforms', description: 'Add new platforms to the mix' },
  ];
}

// ── Phase transitions ──

export function getNextPhase(current: CampaignPhase): CampaignPhase | null {
  const flow: CampaignPhase[] = [
    'goal_definition', 'research', 'concept_generation', 'approval',
    'budget_allocation', 'production', 'publishing', 'optimization', 'completed',
  ];
  const idx = flow.indexOf(current);
  if (idx === -1 || idx === flow.length - 1) return null;
  return flow[idx + 1];
}

export function canTransitionTo(current: CampaignPhase, target: CampaignPhase): boolean {
  if (target === 'paused') return current !== 'completed' && current !== 'paused';
  if (current === 'paused') return target !== 'completed';
  const next = getNextPhase(current);
  return next === target || target === current;
}

// ── Validation ──

export function validateCampaignRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.campaignName || typeof request.campaignName !== 'string' || !request.campaignName.trim()) {
    errors.push('campaignName is required');
  }
  if (!request.goal || typeof request.goal !== 'string') {
    errors.push('goal is required');
  }
  return { valid: errors.length === 0, errors };
}

// ── AI campaign orchestration ──

export async function orchestrateCampaign(params: {
  campaignName: string;
  goal: CampaignGoal;
  productDescription: string;
  targetMarket?: string;
  budget?: number;
  platforms?: string[];
  autonomyLevel?: 'manual' | 'semi_autonomous' | 'fully_autonomous';
  existingState?: CampaignState;
  planTier: PlanTier;
}): Promise<CampaignOrchestrationResult> {
  const model = getLLMModel(params.planTier);
  const autonomy = params.autonomyLevel || 'semi_autonomous';

  // If we have existing state, advance to the next phase
  if (params.existingState) {
    return advanceCampaignPhase(params.existingState, model);
  }

  // Otherwise, start a new campaign from goal_definition
  const sys = `You are a campaign orchestration agent for e-commerce advertising. Create a comprehensive campaign plan from the goal and product. Return JSON only.
{
  "goal": {
    "primaryKpi": "...", "secondaryKpis": [], "targetMetrics": [{"metric":"...","target":0}],
    "successCriteria": [], "timeline": [{"phase":"...","estimatedDuration":0}]
  },
  "research": {
    "marketAnalysis": "...", "competitorSummary": [], "audienceSummary": "...",
    "trendInsights": [], "opportunityGaps": []
  },
  "concepts": [{
    "conceptId":"c1","name":"...","angle":"...","targetAudience":"...","platforms":[],
    "estimatedCost":0,"estimatedReach":0,"estimatedCtr":0,"estimatedCvr":0,
    "approvalStatus":"pending","creativeBrief":"...","variants":[]
  }],
  "budget": {
    "totalBudget":0,"allocation":[{"platform":"...","amount":0,"percentage":0,"rationale":"..."}],
    "dailyPacing":0,"reservePercentage":10,"optimizationRules":[]
  },
  "insights": [], "recommendations": [], "nextActions": []
}
Campaign: ${params.campaignName}
Goal: ${params.goal}
Product: ${params.productDescription.slice(0, 3000)}
Market: ${params.targetMarket || 'Global'}
Budget: ${params.budget || 5000}
Platforms: ${(params.platforms || ['meta', 'google', 'tiktok']).join(', ')}
Autonomy: ${autonomy}`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: 'Create the campaign plan.' },
      ],
      model,
      4000,
    );
    const parsed = JSON.parse(raw);
    const now = new Date().toISOString();

    const goal: CampaignGoalDefinition = {
      goal: params.goal,
      primaryKpi: String(parsed.goal?.primaryKpi || 'ROAS'),
      secondaryKpis: Array.isArray(parsed.goal?.secondaryKpis) ? parsed.goal.secondaryKpis.map(String) : [],
      targetMetrics: Array.isArray(parsed.goal?.targetMetrics) ? parsed.goal.targetMetrics.map((m: Record<string, unknown>) => ({
        metric: String(m.metric || ''),
        target: typeof m.target === 'number' ? m.target : 0,
      })) : [],
      successCriteria: Array.isArray(parsed.goal?.successCriteria) ? parsed.goal.successCriteria.map(String) : [],
      timeline: Array.isArray(parsed.goal?.timeline) ? parsed.goal.timeline.map((t: Record<string, unknown>) => ({
        phase: t.phase as CampaignPhase,
        estimatedDuration: typeof t.estimatedDuration === 'number' ? t.estimatedDuration : 7,
      })) : [],
    };

    const research: CampaignResearch = {
      marketAnalysis: String(parsed.research?.marketAnalysis || ''),
      competitorSummary: Array.isArray(parsed.research?.competitorSummary) ? parsed.research.competitorSummary.map(String) : [],
      audienceSummary: String(parsed.research?.audienceSummary || ''),
      trendInsights: Array.isArray(parsed.research?.trendInsights) ? parsed.research.trendInsights.map(String) : [],
      opportunityGaps: Array.isArray(parsed.research?.opportunityGaps) ? parsed.research.opportunityGaps.map(String) : [],
    };

    const concepts: CampaignConcept[] = (parsed.concepts || []).map((c: Record<string, unknown>, i: number) => ({
      conceptId: String(c.conceptId || `c${i + 1}`),
      name: String(c.name || `Concept ${i + 1}`),
      angle: String(c.angle || ''),
      targetAudience: String(c.targetAudience || ''),
      platforms: Array.isArray(c.platforms) ? c.platforms.map(String) : [],
      estimatedCost: typeof c.estimatedCost === 'number' ? c.estimatedCost : 500,
      estimatedReach: typeof c.estimatedReach === 'number' ? c.estimatedReach : 10000,
      estimatedCtr: typeof c.estimatedCtr === 'number' ? c.estimatedCtr : 2,
      estimatedCvr: typeof c.estimatedCvr === 'number' ? c.estimatedCvr : 3,
      approvalStatus: (c.approvalStatus as ApprovalStatus) || 'pending',
      creativeBrief: String(c.creativeBrief || ''),
      variants: Array.isArray(c.variants) ? c.variants.map(String) : [],
    }));

    const budget: CampaignBudget = {
      totalBudget: typeof parsed.budget?.totalBudget === 'number' ? parsed.budget.totalBudget : params.budget || 5000,
      allocation: Array.isArray(parsed.budget?.allocation) ? parsed.budget.allocation.map((a: Record<string, unknown>) => ({
        platform: String(a.platform || ''),
        amount: typeof a.amount === 'number' ? a.amount : 0,
        percentage: typeof a.percentage === 'number' ? a.percentage : 0,
        rationale: String(a.rationale || ''),
      })) : [],
      dailyPacing: typeof parsed.budget?.dailyPacing === 'number' ? parsed.budget.dailyPacing : 100,
      reservePercentage: typeof parsed.budget?.reservePercentage === 'number' ? parsed.budget.reservePercentage : 10,
      optimizationRules: Array.isArray(parsed.budget?.optimizationRules) ? parsed.budget.optimizationRules.map(String) : [],
    };

    const campaign: CampaignState = {
      campaignId: `camp_${Date.now()}`,
      name: params.campaignName,
      status: 'active',
      currentPhase: 'goal_definition',
      phaseHistory: [{ phase: 'goal_definition', enteredAt: now }],
      goal,
      research,
      concepts,
      budget,
      optimizations: [],
      insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.map(String) : [],
      autonomyLevel: autonomy,
      createdAt: now,
      updatedAt: now,
    };

    return {
      campaign,
      insights: [
        `Campaign "${params.campaignName}" initialized with ${concepts.length} concepts.`,
        `Budget allocated: $${budget.totalBudget} across ${budget.allocation.length} platforms.`,
      ],
      recommendations: campaign.nextActions,
    };
  } catch {
    return generateFallbackCampaign(params, autonomy);
  }
}

async function advanceCampaignPhase(state: CampaignState, model: string): Promise<CampaignOrchestrationResult> {
  const next = getNextPhase(state.currentPhase);
  if (!next) {
    return {
      campaign: { ...state, status: 'completed', currentPhase: 'completed', updatedAt: new Date().toISOString() },
      insights: ['Campaign has reached completion.'],
      recommendations: ['Review final metrics and document learnings.'],
    };
  }

  const now = new Date().toISOString();
  const updatedState: CampaignState = {
    ...state,
    currentPhase: next,
    phaseHistory: [...state.phaseHistory, { phase: next, enteredAt: now }],
    updatedAt: now,
  };

  // Add phase-specific next actions
  const phaseActions: Record<CampaignPhase, string[]> = {
    goal_definition: ['Define KPIs and success criteria'],
    research: ['Conduct market and competitor research'],
    concept_generation: ['Generate 3-5 creative concepts'],
    approval: ['Submit concepts for approval'],
    budget_allocation: ['Allocate budget across platforms'],
    production: ['Produce creative assets'],
    publishing: ['Publish to ad platforms'],
    optimization: ['Monitor performance and optimize'],
    completed: ['Document results and learnings'],
    paused: ['Resume when ready'],
  };

  updatedState.nextActions = phaseActions[next] || [];

  return {
    campaign: updatedState,
    phaseTransition: { from: state.currentPhase, to: next, reason: 'Phase completed, advancing to next' },
    insights: [`Advanced from ${state.currentPhase} to ${next}.`],
    recommendations: updatedState.nextActions,
  };
}

function generateFallbackCampaign(
  params: { campaignName: string; goal: CampaignGoal; productDescription: string; budget?: number },
  autonomy: 'manual' | 'semi_autonomous' | 'fully_autonomous',
): CampaignOrchestrationResult {
  const now = new Date().toISOString();
  const budget = params.budget || 5000;

  const campaign: CampaignState = {
    campaignId: `camp_${Date.now()}`,
    name: params.campaignName,
    status: 'active',
    currentPhase: 'goal_definition',
    phaseHistory: [{ phase: 'goal_definition', enteredAt: now }],
    goal: {
      goal: params.goal,
      primaryKpi: 'ROAS',
      secondaryKpis: ['CTR', 'CPA', 'Conversion Rate'],
      targetMetrics: [
        { metric: 'ROAS', target: 3.0 },
        { metric: 'CTR', target: 2.5 },
        { metric: 'CPA', target: 15 },
      ],
      successCriteria: ['Achieve ROAS > 3.0', 'Maintain CTR > 2%', 'CPA under $15'],
      timeline: [
        { phase: 'goal_definition', estimatedDuration: 1 },
        { phase: 'research', estimatedDuration: 2 },
        { phase: 'concept_generation', estimatedDuration: 3 },
        { phase: 'approval', estimatedDuration: 1 },
        { phase: 'budget_allocation', estimatedDuration: 1 },
        { phase: 'production', estimatedDuration: 5 },
        { phase: 'publishing', estimatedDuration: 1 },
        { phase: 'optimization', estimatedDuration: 14 },
      ],
    },
    research: {
      marketAnalysis: 'Market shows strong demand with moderate competition.',
      competitorSummary: ['2-3 major competitors with active campaigns', 'Competitors favor video formats'],
      audienceSummary: 'Primary audience: 25-44, interested in quality and value.',
      trendInsights: ['Short-form video trending', 'Authentic UGC gaining traction'],
      opportunityGaps: ['Competitors under-invest in TikTok', 'Limited retargeting presence'],
    },
    concepts: [
      {
        conceptId: 'c1', name: 'Product Hero', angle: 'Feature-focused showcase',
        targetAudience: 'Primary demographic', platforms: ['meta', 'google'],
        estimatedCost: 800, estimatedReach: 50000, estimatedCtr: 2.5, estimatedCvr: 3.5,
        approvalStatus: 'pending', creativeBrief: 'Highlight key product features with clean visuals',
        variants: ['Video version', 'Carousel version', 'Static image'],
      },
      {
        conceptId: 'c2', name: 'Lifestyle Story', angle: 'Product in real life',
        targetAudience: 'Lifestyle-oriented segment', platforms: ['meta', 'tiktok', 'instagram'],
        estimatedCost: 1200, estimatedReach: 80000, estimatedCtr: 3.0, estimatedCvr: 4.0,
        approvalStatus: 'pending', creativeBrief: 'Show product solving real problems naturally',
        variants: ['UGC-style video', 'Story sequence', 'Influencer collaboration'],
      },
      {
        conceptId: 'c3', name: 'Social Proof', angle: 'Customer testimonials',
        targetAudience: 'Research-stage buyers', platforms: ['meta', 'google'],
        estimatedCost: 600, estimatedReach: 30000, estimatedCtr: 2.0, estimatedCvr: 4.5,
        approvalStatus: 'pending', creativeBrief: 'Real customer reviews and results',
        variants: ['Testimonial video', 'Review carousel', 'Rating graphic'],
      },
    ],
    budget: {
      totalBudget: budget,
      allocation: [
        { platform: 'meta', amount: Math.round(budget * 0.45), percentage: 45, rationale: 'Largest audience reach' },
        { platform: 'google', amount: Math.round(budget * 0.25), percentage: 25, rationale: 'High intent search traffic' },
        { platform: 'tiktok', amount: Math.round(budget * 0.20), percentage: 20, rationale: 'Growing platform, lower CPM' },
        { platform: 'instagram', amount: Math.round(budget * 0.10), percentage: 10, rationale: 'Visual engagement' },
      ],
      dailyPacing: Math.round(budget / 30),
      reservePercentage: 10,
      optimizationRules: ['Pause ads with CTR < 1% after 3 days', 'Scale ads with ROAS > 4x', 'Reallocate underperforming budget weekly'],
    },
    optimizations: [],
    insights: [
      `Campaign "${params.campaignName}" initialized with 3 concepts.`,
      `Budget: $${budget} allocated across 4 platforms.`,
      `Estimated timeline: 28 days to completion.`,
    ],
    recommendations: [
      'Review and approve concepts to advance to production phase.',
      'Confirm budget allocation before production begins.',
      'Prepare product assets for creative production.',
    ],
    nextActions: [
      'Review the 3 generated concepts',
      'Approve or request revisions',
      'Confirm budget allocation',
    ],
    autonomyLevel: autonomy,
    createdAt: now,
    updatedAt: now,
  };

  return {
    campaign,
    insights: campaign.insights,
    recommendations: campaign.recommendations,
  };
}
