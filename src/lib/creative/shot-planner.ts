/**
 * Video Shot Planner.
 *
 * Turns briefs, angles, or scripts into concrete shot lists with keyframe
 * descriptions, camera directions, and a storyboard-to-video pipeline plan.
 * Bridges the gap between script generation and actual video production.
 *
 * Inspired by gen-v (#14), creatify video-ad-generator (#18), and
 * storyboard-to-video concepts — adapted for LazyNext's creative workflow.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { isDryRun } from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

export const SHOT_PLANNER_COST = 7;

// ── Types ──

export type VideoFormat = 'vertical_9_16' | 'horizontal_16_9' | 'square_1_1' | 'story_9_16' | 'reel_9_16';
export type ProductionStyle = 'studio' | 'lifestyle' | 'ugc' | 'animated' | 'mixed' | 'minimal';
export type BudgetTier = 'shoestring' | 'low' | 'medium' | 'high' | 'premium';
export type ShotComplexity = 'simple' | 'moderate' | 'complex' | 'elaborate';

// ── Interfaces ──

export interface KeyframeDescription {
  frameId: string;
  timestamp: number; // seconds
  visualDescription: string;
  compositionNotes: string;
  lightingNotes: string;
  colorNotes: string;
  textOverlay?: string;
  assetRequirements: string[];
}

export interface ShotPlan {
  shotId: string;
  shotNumber: number;
  sceneLabel: string;
  shotType: string;
  cameraMovement: string;
  duration: number; // seconds
  startTime: number;
  endTime: number;
  visualDescription: string;
  audioDescription: string;
  voiceoverScript?: string;
  onScreenText?: string;
  keyframes: KeyframeDescription[];
  complexity: ShotComplexity;
  estimatedCost: number; // relative cost units
  requiredAssets: string[];
  requiredProps: string[];
  requiredLocations: string[];
  talentRequired: 'none' | 'hand_model' | 'person' | 'multiple_people' | 'voiceover_only';
  productionNotes: string;
}

export interface ProductionSchedule {
  totalShots: number;
  totalDuration: number;
  estimatedShootTime: number; // hours
  estimatedEditTime: number; // hours
  estimatedTotalCost: number;
  scenesPerLocation: Array<{ location: string; shots: number[]; estimatedTime: number }>;
  assetChecklist: string[];
  propChecklist: string[];
  locationChecklist: string[];
  talentChecklist: string[];
  equipmentChecklist: string[];
}

export interface VideoShotPlanResult {
  format: VideoFormat;
  productionStyle: ProductionStyle;
  budgetTier: BudgetTier;
  shots: ShotPlan[];
  schedule: ProductionSchedule;
  storyboard: Array<{
    panelId: string;
    shotId: string;
    visualSummary: string;
    audioSummary: string;
    durationLabel: string;
  }>;
  pipelineSteps: Array<{
    step: string;
    description: string;
    estimatedTime: number;
    dependencies: string[];
  }>;
  insights: string[];
  recommendations: string[];
  estimatedQualityScore: number; // 0-100
  dryRun?: boolean;
}

// ── Lookup functions ──

export function getVideoFormats(): Array<{ format: VideoFormat; name: string; aspectRatio: string; platforms: string[] }> {
  return [
    { format: 'vertical_9_16', name: 'Vertical (9:16)', aspectRatio: '9:16', platforms: ['TikTok', 'Reels', 'Shorts', 'Stories'] },
    { format: 'horizontal_16_9', name: 'Horizontal (16:9)', aspectRatio: '16:9', platforms: ['YouTube', 'Facebook Feed', 'Display'] },
    { format: 'square_1_1', name: 'Square (1:1)', aspectRatio: '1:1', platforms: ['Instagram Feed', 'Facebook Feed'] },
    { format: 'story_9_16', name: 'Story (9:16)', aspectRatio: '9:16', platforms: ['Instagram Stories', 'Snapchat'] },
    { format: 'reel_9_16', name: 'Reel (9:16)', aspectRatio: '9:16', platforms: ['Instagram Reels', 'TikTok'] },
  ];
}

export function getProductionStyles(): Array<{ style: ProductionStyle; name: string; description: string }> {
  return [
    { style: 'studio', name: 'Studio', description: 'Controlled studio environment with professional lighting' },
    { style: 'lifestyle', name: 'Lifestyle', description: 'Real-world settings, natural feel' },
    { style: 'ugc', name: 'UGC', description: 'User-generated content style, authentic and raw' },
    { style: 'animated', name: 'Animated', description: 'Motion graphics or animation' },
    { style: 'mixed', name: 'Mixed', description: 'Combination of live-action and animation' },
    { style: 'minimal', name: 'Minimal', description: 'Simple, low-production-value approach' },
  ];
}

export function getBudgetTiers(): Array<{ tier: BudgetTier; name: string; range: string }> {
  return [
    { tier: 'shoestring', name: 'Shoestring', range: '$0-100' },
    { tier: 'low', name: 'Low', range: '$100-500' },
    { tier: 'medium', name: 'Medium', range: '$500-2000' },
    { tier: 'high', name: 'High', range: '$2000-10000' },
    { tier: 'premium', name: 'Premium', range: '$10000+' },
  ];
}

export function getShotComplexities(): Array<{ complexity: ShotComplexity; name: string; description: string }> {
  return [
    { complexity: 'simple', name: 'Simple', description: 'Single shot, static, minimal setup' },
    { complexity: 'moderate', name: 'Moderate', description: 'Some movement, basic setup' },
    { complexity: 'complex', name: 'Complex', description: 'Multiple elements, movement, lighting changes' },
    { complexity: 'elaborate', name: 'Elaborate', description: 'Multi-camera, complex choreography, special effects' },
  ];
}

// ── Calculations ──

export function estimateShootTime(shots: ShotPlan[]): number {
  if (shots.length === 0) return 0;
  const complexityMultiplier: Record<ShotComplexity, number> = {
    simple: 0.25,
    moderate: 0.5,
    complex: 1.0,
    elaborate: 2.0,
  };
  const totalComplexity = shots.reduce((s, sh) => s + complexityMultiplier[sh.complexity], 0);
  return Math.round((totalComplexity * 0.5 + shots.length * 0.15) * 10) / 10;
}

export function estimateEditTime(shots: ShotPlan[]): number {
  if (shots.length === 0) return 0;
  return Math.round((shots.length * 0.2 + shots.reduce((s, sh) => s + sh.keyframes.length, 0) * 0.05) * 10) / 10;
}

export function estimateTotalCost(shots: ShotPlan[], budgetTier: BudgetTier): number {
  const tierMultiplier: Record<BudgetTier, number> = {
    shoestring: 1,
    low: 3,
    medium: 10,
    high: 40,
    premium: 100,
  };
  const baseCost = shots.reduce((s, sh) => s + sh.estimatedCost, 0);
  return Math.round(baseCost * tierMultiplier[budgetTier]);
}

export function calculateQualityEstimate(shots: ShotPlan[], budgetTier: BudgetTier): number {
  if (shots.length === 0) return 0;
  const tierScore: Record<BudgetTier, number> = { shoestring: 40, low: 55, medium: 70, high: 82, premium: 92 };
  const complexityBonus = Math.min(15, shots.filter((s) => s.complexity === 'complex' || s.complexity === 'elaborate').length * 3);
  const keyframeBonus = Math.min(10, shots.reduce((s, sh) => s + sh.keyframes.length, 0) * 0.5);
  return Math.round(Math.min(100, tierScore[budgetTier] + complexityBonus + keyframeBonus));
}

// ── Validation ──

export function validateShotPlanRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.sourceContent || typeof request.sourceContent !== 'string' || !request.sourceContent.trim()) {
    errors.push('sourceContent is required');
  }
  return { valid: errors.length === 0, errors };
}

// ── AI shot planning ──

export async function planVideoShots(params: {
  sourceContent: string;
  sourceType?: 'brief' | 'angle' | 'script' | 'storyboard';
  format?: VideoFormat;
  productionStyle?: ProductionStyle;
  budgetTier?: BudgetTier;
  targetDuration?: number;
  planTier: PlanTier;
}): Promise<VideoShotPlanResult> {
  const model = getLLMModel(params.planTier);
  const format = params.format || 'vertical_9_16';
  const style = params.productionStyle || 'lifestyle';
  const budget = params.budgetTier || 'low';
  const duration = params.targetDuration || 30;

  if (isDryRun()) {
    return { ...generateFallbackShotPlan(params, format, style, budget, duration), dryRun: true };
  }

  const sys = `You are a video production planner for e-commerce ads. Create a detailed shot list from the provided creative content. Return JSON only.
{
  "shots": [{
    "shotId":"shot1","shotNumber":1,"sceneLabel":"Hook","shotType":"close_up|medium|wide|etc",
    "cameraMovement":"static|pan|zoom_in|etc","duration":3,"startTime":0,"endTime":3,
    "visualDescription":"...","audioDescription":"...","voiceoverScript":"...","onScreenText":"...",
    "keyframes":[{"frameId":"k1","timestamp":0,"visualDescription":"...","compositionNotes":"...","lightingNotes":"...","colorNotes":"...","textOverlay":"...","assetRequirements":[]}],
    "complexity":"simple|moderate|complex|elaborate","estimatedCost":1,"requiredAssets":[],"requiredProps":[],
    "requiredLocations":[],"talentRequired":"none|hand_model|person|multiple_people|voiceover_only","productionNotes":"..."
  }],
  "pipelineSteps":[{"step":"...","description":"...","estimatedTime":0,"dependencies":[]}],
  "insights": [], "recommendations": []
}
Format: ${format}. Style: ${style}. Budget: ${budget}. Target duration: ${duration}s.
Source type: ${params.sourceType || 'script'}`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: `Create a shot plan from:\n${params.sourceContent.slice(0, 6000)}` },
      ],
      model,
      4000,
    );
    const parsed = JSON.parse(raw);

    const shots: ShotPlan[] = (parsed.shots || []).map((s: Record<string, unknown>, i: number) => {
      const startTime = typeof s.startTime === 'number' ? s.startTime : 0;
      const shotDuration = typeof s.duration === 'number' ? s.duration : 3;
      return {
        shotId: String(s.shotId || `shot${i + 1}`),
        shotNumber: typeof s.shotNumber === 'number' ? s.shotNumber : i + 1,
        sceneLabel: String(s.sceneLabel || `Shot ${i + 1}`),
        shotType: String(s.shotType || 'medium'),
        cameraMovement: String(s.cameraMovement || 'static'),
        duration: shotDuration,
        startTime,
        endTime: startTime + shotDuration,
        visualDescription: String(s.visualDescription || ''),
        audioDescription: String(s.audioDescription || ''),
        voiceoverScript: s.voiceoverScript ? String(s.voiceoverScript) : undefined,
        onScreenText: s.onScreenText ? String(s.onScreenText) : undefined,
        keyframes: Array.isArray(s.keyframes) ? s.keyframes.map((k: Record<string, unknown>, j: number) => ({
          frameId: String(k.frameId || `k${j + 1}`),
          timestamp: typeof k.timestamp === 'number' ? k.timestamp : 0,
          visualDescription: String(k.visualDescription || ''),
          compositionNotes: String(k.compositionNotes || ''),
          lightingNotes: String(k.lightingNotes || ''),
          colorNotes: String(k.colorNotes || ''),
          textOverlay: k.textOverlay ? String(k.textOverlay) : undefined,
          assetRequirements: Array.isArray(k.assetRequirements) ? k.assetRequirements.map(String) : [],
        })) : [],
        complexity: (s.complexity as ShotComplexity) || 'moderate',
        estimatedCost: typeof s.estimatedCost === 'number' ? s.estimatedCost : 2,
        requiredAssets: Array.isArray(s.requiredAssets) ? s.requiredAssets.map(String) : [],
        requiredProps: Array.isArray(s.requiredProps) ? s.requiredProps.map(String) : [],
        requiredLocations: Array.isArray(s.requiredLocations) ? s.requiredLocations.map(String) : [],
        talentRequired: (s.talentRequired as ShotPlan['talentRequired']) || 'none',
        productionNotes: String(s.productionNotes || ''),
      };
    });

    const totalDuration = shots.length > 0 ? shots[shots.length - 1].endTime : 0;

    // Build schedule
    const locationMap: Record<string, number[]> = {};
    const assetChecklist = new Set<string>();
    const propChecklist = new Set<string>();
    const locationChecklist = new Set<string>();
    const talentChecklist = new Set<string>();
    const equipmentChecklist = new Set<string>();

    shots.forEach((sh) => {
      sh.requiredLocations.forEach((loc) => {
        if (!locationMap[loc]) locationMap[loc] = [];
        locationMap[loc].push(shots.indexOf(sh));
        locationChecklist.add(loc);
      });
      sh.requiredAssets.forEach((a) => assetChecklist.add(a));
      sh.requiredProps.forEach((p) => propChecklist.add(p));
      if (sh.talentRequired !== 'none') talentChecklist.add(sh.talentRequired);
      if (sh.cameraMovement !== 'static') equipmentChecklist.add(`${sh.cameraMovement} rig`);
      equipmentChecklist.add(`${sh.shotType} lens`);
    });

    const scenesPerLocation = Object.entries(locationMap).map(([location, shotIndices]) => ({
      location,
      shots: shotIndices,
      estimatedTime: Math.round(shotIndices.length * 0.3 * 10) / 10,
    }));

    const schedule: ProductionSchedule = {
      totalShots: shots.length,
      totalDuration,
      estimatedShootTime: estimateShootTime(shots),
      estimatedEditTime: estimateEditTime(shots),
      estimatedTotalCost: estimateTotalCost(shots, budget),
      scenesPerLocation,
      assetChecklist: Array.from(assetChecklist),
      propChecklist: Array.from(propChecklist),
      locationChecklist: Array.from(locationChecklist),
      talentChecklist: Array.from(talentChecklist),
      equipmentChecklist: Array.from(equipmentChecklist),
    };

    const storyboard = shots.map((sh) => ({
      panelId: `panel_${sh.shotId}`,
      shotId: sh.shotId,
      visualSummary: sh.visualDescription.slice(0, 100),
      audioSummary: sh.audioDescription.slice(0, 100),
      durationLabel: `${sh.duration}s`,
    }));

    const pipelineSteps = Array.isArray(parsed.pipelineSteps) ? parsed.pipelineSteps.map((p: Record<string, unknown>) => ({
      step: String(p.step || ''),
      description: String(p.description || ''),
      estimatedTime: typeof p.estimatedTime === 'number' ? p.estimatedTime : 0,
      dependencies: Array.isArray(p.dependencies) ? p.dependencies.map(String) : [],
    })) : [
      { step: 'Pre-production', description: 'Finalize shot list, secure locations, schedule talent', estimatedTime: 4, dependencies: [] },
      { step: 'Production', description: 'Shoot all scenes per location schedule', estimatedTime: schedule.estimatedShootTime, dependencies: ['Pre-production'] },
      { step: 'Post-production', description: 'Edit, add graphics, voiceover, music', estimatedTime: schedule.estimatedEditTime, dependencies: ['Production'] },
      { step: 'Review & Export', description: 'Review cuts, export in target format', estimatedTime: 2, dependencies: ['Post-production'] },
    ];

    return {
      format,
      productionStyle: style,
      budgetTier: budget,
      shots,
      schedule,
      storyboard,
      pipelineSteps,
      insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      estimatedQualityScore: calculateQualityEstimate(shots, budget),
    };
  } catch {
    return { ...generateFallbackShotPlan(params, format, style, budget, duration), dryRun: true };
  }
}

function generateFallbackShotPlan(
  params: { sourceContent: string },
  format: VideoFormat,
  style: ProductionStyle,
  budget: BudgetTier,
  duration: number,
): VideoShotPlanResult {
  const shots: ShotPlan[] = [
    {
      shotId: 'shot1', shotNumber: 1, sceneLabel: 'Hook', shotType: 'close_up', cameraMovement: 'zoom_in',
      duration: 3, startTime: 0, endTime: 3,
      visualDescription: 'Bold product close-up with text overlay hook',
      audioDescription: 'Upbeat music starts, subtle SFX',
      onScreenText: 'Wait for it...',
      keyframes: [{ frameId: 'k1', timestamp: 0, visualDescription: 'Product fills frame', compositionNotes: 'Centered, rule of thirds', lightingNotes: 'Bright, even', colorNotes: 'Brand colors', assetRequirements: ['Product unit'] }],
      complexity: 'simple', estimatedCost: 1, requiredAssets: ['Product unit'], requiredProps: [],
      requiredLocations: ['Studio'], talentRequired: 'none', productionNotes: 'Quick setup, can use phone camera',
    },
    {
      shotId: 'shot2', shotNumber: 2, sceneLabel: 'Reveal', shotType: 'medium', cameraMovement: 'pan',
      duration: 4, startTime: 3, endTime: 7,
      visualDescription: 'Product revealed in context with key features highlighted',
      audioDescription: 'Music continues, voiceover begins',
      voiceoverScript: 'Introducing [product] — designed for [benefit]',
      keyframes: [{ frameId: 'k2', timestamp: 3, visualDescription: 'Product in use', compositionNotes: 'Subject left, space right', lightingNotes: 'Natural', colorNotes: 'Warm tones', assetRequirements: ['Product unit'] }],
      complexity: 'moderate', estimatedCost: 2, requiredAssets: ['Product unit'], requiredProps: ['Lifestyle props'],
      requiredLocations: ['Lifestyle setting'], talentRequired: 'hand_model', productionNotes: 'Need hand model for product interaction',
    },
    {
      shotId: 'shot3', shotNumber: 3, sceneLabel: 'Demo', shotType: 'medium', cameraMovement: 'tracking',
      duration: 8, startTime: 7, endTime: 15,
      visualDescription: 'Product demonstration showing key benefit in action',
      audioDescription: 'Voiceover continues with feature highlights',
      voiceoverScript: 'Watch how it works — [feature demonstration]',
      keyframes: [
        { frameId: 'k3', timestamp: 7, visualDescription: 'Start of demo', compositionNotes: 'Follow action', lightingNotes: 'Even', colorNotes: 'Natural', assetRequirements: ['Product unit'] },
        { frameId: 'k4', timestamp: 11, visualDescription: 'Result visible', compositionNotes: 'Close on result', lightingNotes: 'Bright', colorNotes: 'Pop', assetRequirements: ['Product unit'] },
      ],
      complexity: 'moderate', estimatedCost: 3, requiredAssets: ['Product unit'], requiredProps: ['Demo props'],
      requiredLocations: ['Lifestyle setting'], talentRequired: 'person', productionNotes: 'Most important shot — get multiple takes',
    },
    {
      shotId: 'shot4', shotNumber: 4, sceneLabel: 'CTA', shotType: 'close_up', cameraMovement: 'static',
      duration: 4, startTime: 15, endTime: 19,
      visualDescription: 'Product with CTA text and offer',
      audioDescription: 'Music peaks, final voiceover CTA',
      voiceoverScript: 'Shop now at [url]',
      onScreenText: 'Shop Now →',
      keyframes: [{ frameId: 'k5', timestamp: 15, visualDescription: 'Product + CTA', compositionNotes: 'Centered with text', lightingNotes: 'Bright', colorNotes: 'Brand colors', assetRequirements: ['Product unit'] }],
      complexity: 'simple', estimatedCost: 1, requiredAssets: ['Product unit'], requiredProps: [],
      requiredLocations: ['Studio'], talentRequired: 'none', productionNotes: 'Simple end card',
    },
  ];

  const schedule: ProductionSchedule = {
    totalShots: 4,
    totalDuration: 19,
    estimatedShootTime: estimateShootTime(shots),
    estimatedEditTime: estimateEditTime(shots),
    estimatedTotalCost: estimateTotalCost(shots, budget),
    scenesPerLocation: [
      { location: 'Studio', shots: [0, 3], estimatedTime: 0.6 },
      { location: 'Lifestyle setting', shots: [1, 2], estimatedTime: 0.6 },
    ],
    assetChecklist: ['Product unit'],
    propChecklist: ['Lifestyle props', 'Demo props'],
    locationChecklist: ['Studio', 'Lifestyle setting'],
    talentChecklist: ['hand_model', 'person'],
    equipmentChecklist: ['close_up lens', 'medium lens', 'zoom_in rig', 'pan rig', 'tracking rig'],
  };

  return {
    format,
    productionStyle: style,
    budgetTier: budget,
    shots,
    schedule,
    storyboard: shots.map((sh) => ({
      panelId: `panel_${sh.shotId}`, shotId: sh.shotId,
      visualSummary: sh.visualDescription.slice(0, 100),
      audioSummary: sh.audioDescription.slice(0, 100),
      durationLabel: `${sh.duration}s`,
    })),
    pipelineSteps: [
      { step: 'Pre-production', description: 'Finalize shot list, secure locations, schedule talent', estimatedTime: 4, dependencies: [] },
      { step: 'Production', description: 'Shoot all scenes per location schedule', estimatedTime: schedule.estimatedShootTime, dependencies: ['Pre-production'] },
      { step: 'Post-production', description: 'Edit, add graphics, voiceover, music', estimatedTime: schedule.estimatedEditTime, dependencies: ['Production'] },
      { step: 'Review & Export', description: 'Review cuts, export in target format', estimatedTime: 2, dependencies: ['Post-production'] },
    ],
    insights: [
      `Generated ${4} shots totaling 19 seconds for ${format} format.`,
      `Estimated shoot time: ${schedule.estimatedShootTime}h, edit time: ${schedule.estimatedEditTime}h.`,
      `Total estimated cost: $${schedule.estimatedTotalCost} at ${budget} budget tier.`,
    ],
    recommendations: [
      'Prioritize the demo shot (shot3) — it\'s the most important for conversion.',
      'Shoot hook variants to test different opening approaches.',
      'Consider shooting in both vertical and square for cross-platform use.',
    ],
    estimatedQualityScore: calculateQualityEstimate(shots, budget),
  };
}
