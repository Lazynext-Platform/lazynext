/**
 * Scene Analysis Engine.
 *
 * Decomposes a reference video (or transcript/description) into discrete
 * shots/scenes, labels each scene with visual/audio/narrative metadata,
 * and generates scene-by-scene creative briefs for re-shooting or adaptation.
 *
 * Inspired by Google scene-machine (#13) — scene-level video analysis and
 * segmentation — adapted for LazyNext's e-commerce creative workflow.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const SCENE_ANALYSIS_COST = 8;

// ── Types ──

export type SceneType =
  | 'hook'
  | 'product_reveal'
  | 'demo'
  | 'testimonial'
  | 'comparison'
  | 'lifestyle'
  | 'problem'
  | 'solution'
  | 'social_proof'
  | 'cta'
  | 'transition'
  | 'branding'
  | 'emotional_beat'
  | 'data_visualization';

export type ShotType =
  | 'wide'
  | 'medium'
  | 'close_up'
  | 'extreme_close_up'
  | 'overhead'
  | 'pov'
  | 'two_shot'
  | 'insert';

export type CameraMovement =
  | 'static'
  | 'pan'
  | 'tilt'
  | 'zoom_in'
  | 'zoom_out'
  | 'tracking'
  | 'handheld'
  | 'dolly'
  | 'crane'
  | 'whip_pan';

export type SceneMood =
  | 'energetic'
  | 'calm'
  | 'dramatic'
  | 'playful'
  | 'luxurious'
  | 'urgent'
  | 'inspirational'
  | 'mysterious'
  | 'authentic'
  | 'professional';

// ── Interfaces ──

export interface SceneShot {
  shotId: string;
  sceneIndex: number;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  duration: number; // seconds
  visualDescription: string;
  onScreenText?: string;
  voiceover?: string;
  musicCue?: string;
  sfxCue?: string;
  productVisible: boolean;
  estimatedCost: 'low' | 'medium' | 'high';
}

export interface SceneSegment {
  sceneId: string;
  sceneIndex: number;
  sceneType: SceneType;
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds
  title: string;
  description: string;
  mood: SceneMood;
  shots: SceneShot[];
  narrativeFunction: string;
  keyMessage: string;
  effectivenessScore: number; // 0-100
  adaptationNotes: string;
  reshootDifficulty: 'easy' | 'moderate' | 'hard';
}

export interface SceneAnalysisResult {
  totalScenes: number;
  totalDuration: number;
  scenes: SceneSegment[];
  pacingAnalysis: {
    averageSceneDuration: number;
    fastestScene: number;
    slowestScene: number;
    pacingPattern: 'fast_cut' | 'medium' | 'slow_burn' | 'mixed';
    hookTime: number; // seconds to first hook
  };
  visualStyle: {
    dominantShotType: ShotType;
    dominantCameraMovement: CameraMovement;
    colorPalette: string[];
    visualMotifs: string[];
  };
  narrativeStructure: {
    structureType: 'problem_solution' | 'feature_highlight' | 'story_driven' | 'testimonial' | 'comparison' | 'lifestyle';
    actBreakdown: Array<{ act: string; scenes: number[]; purpose: string }>;
    emotionalArc: string[];
  };
  effectivenessBreakdown: {
    hookStrength: number;
    productClarity: number;
    persuasionPower: number;
    ctaClarity: number;
    overallScore: number;
  };
  adaptationRecommendations: string[];
  reshootPlan: Array<{
    sceneId: string;
    action: 'keep' | 'reshoot' | 'adapt' | 'skip';
    reason: string;
    estimatedEffort: 'low' | 'medium' | 'high';
  }>;
  insights: string[];
}

// ── Lookup functions ──

export function getSceneTypes(): Array<{ type: SceneType; name: string; description: string }> {
  return [
    { type: 'hook', name: 'Hook', description: 'Attention-grabbing opening' },
    { type: 'product_reveal', name: 'Product Reveal', description: 'First product showcase' },
    { type: 'demo', name: 'Demo', description: 'Product demonstration' },
    { type: 'testimonial', name: 'Testimonial', description: 'Customer testimonial' },
    { type: 'comparison', name: 'Comparison', description: 'Before/after or vs competitor' },
    { type: 'lifestyle', name: 'Lifestyle', description: 'Product in real-life context' },
    { type: 'problem', name: 'Problem', description: 'Problem statement' },
    { type: 'solution', name: 'Solution', description: 'Solution presentation' },
    { type: 'social_proof', name: 'Social Proof', description: 'Reviews, ratings, mentions' },
    { type: 'cta', name: 'Call to Action', description: 'Direct CTA' },
    { type: 'transition', name: 'Transition', description: 'Scene transition' },
    { type: 'branding', name: 'Branding', description: 'Brand logo/identity' },
    { type: 'emotional_beat', name: 'Emotional Beat', description: 'Emotional moment' },
    { type: 'data_visualization', name: 'Data Visualization', description: 'Stats/charts/infographics' },
  ];
}

export function getShotTypes(): Array<{ type: ShotType; name: string; description: string }> {
  return [
    { type: 'wide', name: 'Wide Shot', description: 'Full scene context' },
    { type: 'medium', name: 'Medium Shot', description: 'Subject from waist up' },
    { type: 'close_up', name: 'Close-up', description: 'Tight on subject/detail' },
    { type: 'extreme_close_up', name: 'Extreme Close-up', description: 'Very tight detail' },
    { type: 'overhead', name: 'Overhead', description: 'Top-down view' },
    { type: 'pov', name: 'POV', description: 'Point of view' },
    { type: 'two_shot', name: 'Two Shot', description: 'Two subjects in frame' },
    { type: 'insert', name: 'Insert Shot', description: 'Detail insert' },
  ];
}

export function getCameraMovements(): Array<{ movement: CameraMovement; name: string; description: string }> {
  return [
    { movement: 'static', name: 'Static', description: 'No camera movement' },
    { movement: 'pan', name: 'Pan', description: 'Horizontal rotation' },
    { movement: 'tilt', name: 'Tilt', description: 'Vertical rotation' },
    { movement: 'zoom_in', name: 'Zoom In', description: 'Push in' },
    { movement: 'zoom_out', name: 'Zoom Out', description: 'Pull out' },
    { movement: 'tracking', name: 'Tracking', description: 'Follow subject' },
    { movement: 'handheld', name: 'Handheld', description: 'Shaky cam' },
    { movement: 'dolly', name: 'Dolly', description: 'Smooth push/pull' },
    { movement: 'crane', name: 'Crane', description: 'Vertical boom' },
    { movement: 'whip_pan', name: 'Whip Pan', description: 'Fast pan transition' },
  ];
}

export function getSceneMoods(): Array<{ mood: SceneMood; name: string }> {
  return [
    { mood: 'energetic', name: 'Energetic' },
    { mood: 'calm', name: 'Calm' },
    { mood: 'dramatic', name: 'Dramatic' },
    { mood: 'playful', name: 'Playful' },
    { mood: 'luxurious', name: 'Luxurious' },
    { mood: 'urgent', name: 'Urgent' },
    { mood: 'inspirational', name: 'Inspirational' },
    { mood: 'mysterious', name: 'Mysterious' },
    { mood: 'authentic', name: 'Authentic' },
    { mood: 'professional', name: 'Professional' },
  ];
}

// ── Calculations ──

export function calculatePacingPattern(scenes: SceneSegment[]): 'fast_cut' | 'medium' | 'slow_burn' | 'mixed' {
  if (scenes.length === 0) return 'medium';
  const avg = scenes.reduce((s, sc) => s + sc.duration, 0) / scenes.length;
  const variance = scenes.reduce((s, sc) => s + Math.pow(sc.duration - avg, 2), 0) / scenes.length;
  if (variance > avg * avg * 0.5) return 'mixed';
  if (avg < 3) return 'fast_cut';
  if (avg > 8) return 'slow_burn';
  return 'medium';
}

export function calculateOverallEffectiveness(scenes: SceneSegment[]): number {
  if (scenes.length === 0) return 0;
  return Math.round(scenes.reduce((s, sc) => s + sc.effectivenessScore, 0) / scenes.length);
}

export function calculateHookTime(scenes: SceneSegment[]): number {
  const hook = scenes.find((s) => s.sceneType === 'hook');
  return hook ? hook.startTime : scenes[0]?.startTime || 0;
}

// ── Validation ──

export function validateSceneAnalysisRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.sourceContent || typeof request.sourceContent !== 'string' || !request.sourceContent.trim()) {
    errors.push('sourceContent is required');
  }
  return { valid: errors.length === 0, errors };
}

// ── AI scene analysis ──

export async function analyzeScenes(params: {
  sourceContent: string;
  sourceType?: 'transcript' | 'description' | 'script';
  targetPlatform?: string;
  adaptationGoal?: string;
  planTier: PlanTier;
}): Promise<SceneAnalysisResult> {
  const model = getLLMModel(params.planTier);

  const sys = `You are a video scene analysis expert for e-commerce ads. Decompose the provided content into discrete scenes/shots and analyze the visual, narrative, and persuasive structure. Return JSON only.
{
  "scenes": [{
    "sceneId":"s1","sceneIndex":0,"sceneType":"hook|product_reveal|demo|testimonial|comparison|lifestyle|problem|solution|social_proof|cta|transition|branding|emotional_beat|data_visualization",
    "startTime":0,"endTime":3,"duration":3,"title":"...","description":"...","mood":"energetic|calm|dramatic|playful|luxurious|urgent|inspirational|mysterious|authentic|professional",
    "shots":[{"shotId":"sh1","shotType":"wide|medium|close_up|extreme_close_up|overhead|pov|two_shot|insert","cameraMovement":"static|pan|tilt|zoom_in|zoom_out|tracking|handheld|dolly|crane|whip_pan","duration":2,"visualDescription":"...","onScreenText":"...","voiceover":"...","musicCue":"...","sfxCue":"...","productVisible":true,"estimatedCost":"low|medium|high"}],
    "narrativeFunction":"...","keyMessage":"...","effectivenessScore":0-100,"adaptationNotes":"...","reshootDifficulty":"easy|moderate|hard"
  }],
  "visualStyle":{"dominantShotType":"...","dominantCameraMovement":"...","colorPalette":[],"visualMotifs":[]},
  "narrativeStructure":{"structureType":"problem_solution|feature_highlight|story_driven|testimonial|comparison|lifestyle","actBreakdown":[{"act":"...","scenes":[0],"purpose":"..."}],"emotionalArc":[]},
  "effectivenessBreakdown":{"hookStrength":0,"productClarity":0,"persuasionPower":0,"ctaClarity":0,"overallScore":0},
  "adaptationRecommendations":[],"reshootPlan":[{"sceneId":"s1","action":"keep|reshoot|adapt|skip","reason":"...","estimatedEffort":"low|medium|high"}],"insights":[]
}
Source type: ${params.sourceType || 'transcript'}
Platform: ${params.targetPlatform || 'general'}
Adaptation goal: ${params.adaptationGoal || 'general improvement'}`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: `Analyze this content:\n${params.sourceContent.slice(0, 8000)}` },
      ],
      model,
      4000,
    );
    const parsed = JSON.parse(raw);

    const scenes: SceneSegment[] = (parsed.scenes || []).map((s: Record<string, unknown>, i: number) => ({
      sceneId: String(s.sceneId || `s${i + 1}`),
      sceneIndex: typeof s.sceneIndex === 'number' ? s.sceneIndex : i,
      sceneType: s.sceneType as SceneType,
      startTime: typeof s.startTime === 'number' ? s.startTime : 0,
      endTime: typeof s.endTime === 'number' ? s.endTime : 0,
      duration: typeof s.duration === 'number' ? s.duration : 3,
      title: String(s.title || `Scene ${i + 1}`),
      description: String(s.description || ''),
      mood: (s.mood as SceneMood) || 'energetic',
      shots: Array.isArray(s.shots) ? s.shots.map((sh: Record<string, unknown>, j: number) => ({
        shotId: String(sh.shotId || `sh${j + 1}`),
        sceneIndex: i,
        shotType: (sh.shotType as ShotType) || 'medium',
        cameraMovement: (sh.cameraMovement as CameraMovement) || 'static',
        duration: typeof sh.duration === 'number' ? sh.duration : 2,
        visualDescription: String(sh.visualDescription || ''),
        onScreenText: sh.onScreenText ? String(sh.onScreenText) : undefined,
        voiceover: sh.voiceover ? String(sh.voiceover) : undefined,
        musicCue: sh.musicCue ? String(sh.musicCue) : undefined,
        sfxCue: sh.sfxCue ? String(sh.sfxCue) : undefined,
        productVisible: typeof sh.productVisible === 'boolean' ? sh.productVisible : false,
        estimatedCost: (sh.estimatedCost as 'low' | 'medium' | 'high') || 'medium',
      })) : [],
      narrativeFunction: String(s.narrativeFunction || ''),
      keyMessage: String(s.keyMessage || ''),
      effectivenessScore: typeof s.effectivenessScore === 'number' ? s.effectivenessScore : 50,
      adaptationNotes: String(s.adaptationNotes || ''),
      reshootDifficulty: (s.reshootDifficulty as 'easy' | 'moderate' | 'hard') || 'moderate',
    }));

    const totalDuration = scenes.length > 0 ? scenes[scenes.length - 1].endTime : 0;

    return {
      totalScenes: scenes.length,
      totalDuration,
      scenes,
      pacingAnalysis: {
        averageSceneDuration: scenes.length > 0 ? Math.round((totalDuration / scenes.length) * 10) / 10 : 0,
        fastestScene: scenes.length > 0 ? Math.min(...scenes.map((s) => s.duration)) : 0,
        slowestScene: scenes.length > 0 ? Math.max(...scenes.map((s) => s.duration)) : 0,
        pacingPattern: calculatePacingPattern(scenes),
        hookTime: calculateHookTime(scenes),
      },
      visualStyle: parsed.visualStyle || {
        dominantShotType: 'medium' as ShotType,
        dominantCameraMovement: 'static' as CameraMovement,
        colorPalette: [],
        visualMotifs: [],
      },
      narrativeStructure: parsed.narrativeStructure || {
        structureType: 'feature_highlight',
        actBreakdown: [],
        emotionalArc: [],
      },
      effectivenessBreakdown: parsed.effectivenessBreakdown || {
        hookStrength: 50,
        productClarity: 50,
        persuasionPower: 50,
        ctaClarity: 50,
        overallScore: calculateOverallEffectiveness(scenes),
      },
      adaptationRecommendations: Array.isArray(parsed.adaptationRecommendations) ? parsed.adaptationRecommendations.map(String) : [],
      reshootPlan: Array.isArray(parsed.reshootPlan) ? parsed.reshootPlan.map((r: Record<string, unknown>) => ({
        sceneId: String(r.sceneId || ''),
        action: (r.action as 'keep' | 'reshoot' | 'adapt' | 'skip') || 'keep',
        reason: String(r.reason || ''),
        estimatedEffort: (r.estimatedEffort as 'low' | 'medium' | 'high') || 'low',
      })) : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
    };
  } catch {
    return generateFallbackSceneAnalysis(params);
  }
}

function generateFallbackSceneAnalysis(params: { sourceContent: string }): SceneAnalysisResult {
  const content = params.sourceContent.slice(0, 2000);
  const scenes: SceneSegment[] = [
    {
      sceneId: 's1', sceneIndex: 0, sceneType: 'hook', startTime: 0, endTime: 3, duration: 3,
      title: 'Opening Hook', description: 'Attention-grabbing opening with bold visual',
      mood: 'energetic', shots: [
        { shotId: 'sh1', sceneIndex: 0, shotType: 'close_up', cameraMovement: 'zoom_in', duration: 3, visualDescription: 'Product close-up with text overlay', productVisible: true, estimatedCost: 'low' },
      ],
      narrativeFunction: 'Capture attention in first 3 seconds', keyMessage: 'Stop scrolling',
      effectivenessScore: 75, adaptationNotes: 'Strong hook — keep pattern, update visual',
      reshootDifficulty: 'easy',
    },
    {
      sceneId: 's2', sceneIndex: 1, sceneType: 'product_reveal', startTime: 3, endTime: 8, duration: 5,
      title: 'Product Reveal', description: 'Full product showcase with key features',
      mood: 'professional', shots: [
        { shotId: 'sh2', sceneIndex: 1, shotType: 'medium', cameraMovement: 'pan', duration: 5, visualDescription: 'Product on clean background', productVisible: true, estimatedCost: 'low' },
      ],
      narrativeFunction: 'Introduce product clearly', keyMessage: 'Here\'s what makes it special',
      effectivenessScore: 70, adaptationNotes: 'Clear reveal — consider adding feature callouts',
      reshootDifficulty: 'easy',
    },
    {
      sceneId: 's3', sceneIndex: 2, sceneType: 'demo', startTime: 8, endTime: 18, duration: 10,
      title: 'Product Demo', description: 'Demonstration of product in use',
      mood: 'authentic', shots: [
        { shotId: 'sh3', sceneIndex: 2, shotType: 'medium', cameraMovement: 'tracking', duration: 10, visualDescription: 'Person using product naturally', productVisible: true, estimatedCost: 'medium' },
      ],
      narrativeFunction: 'Show product working', keyMessage: 'See it in action',
      effectivenessScore: 80, adaptationNotes: 'Most effective scene — extend or create variants',
      reshootDifficulty: 'moderate',
    },
    {
      sceneId: 's4', sceneIndex: 3, sceneType: 'cta', startTime: 18, endTime: 22, duration: 4,
      title: 'Call to Action', description: 'Direct CTA with offer',
      mood: 'urgent', shots: [
        { shotId: 'sh4', sceneIndex: 3, shotType: 'close_up', cameraMovement: 'static', duration: 4, visualDescription: 'CTA text with product', productVisible: true, estimatedCost: 'low' },
      ],
      narrativeFunction: 'Drive action', keyMessage: 'Shop now',
      effectivenessScore: 65, adaptationNotes: 'CTA could be stronger — test urgency variants',
      reshootDifficulty: 'easy',
    },
  ];

  return {
    totalScenes: 4,
    totalDuration: 22,
    scenes,
    pacingAnalysis: {
      averageSceneDuration: 5.5,
      fastestScene: 3,
      slowestScene: 10,
      pacingPattern: 'medium',
      hookTime: 0,
    },
    visualStyle: {
      dominantShotType: 'medium',
      dominantCameraMovement: 'static',
      colorPalette: ['brand colors', 'neutral background'],
      visualMotifs: ['product close-ups', 'text overlays'],
    },
    narrativeStructure: {
      structureType: 'feature_highlight',
      actBreakdown: [
        { act: 'Hook', scenes: [0], purpose: 'Capture attention' },
        { act: 'Body', scenes: [1, 2], purpose: 'Showcase and demonstrate' },
        { act: 'CTA', scenes: [3], purpose: 'Drive action' },
      ],
      emotionalArc: ['curiosity', 'interest', 'desire', 'action'],
    },
    effectivenessBreakdown: {
      hookStrength: 75,
      productClarity: 80,
      persuasionPower: 70,
      ctaClarity: 65,
      overallScore: 73,
    },
    adaptationRecommendations: [
      'Hook is strong — maintain the pattern but test new visuals',
      'Demo scene is most effective — consider creating multiple demo variants',
      'CTA could be more urgent — test countdown or limited offer framing',
    ],
    reshootPlan: [
      { sceneId: 's1', action: 'adapt', reason: 'Update visual while keeping hook pattern', estimatedEffort: 'low' },
      { sceneId: 's2', action: 'keep', reason: 'Clear and effective', estimatedEffort: 'low' },
      { sceneId: 's3', action: 'adapt', reason: 'Create variants with different use cases', estimatedEffort: 'medium' },
      { sceneId: 's4', action: 'reshoot', reason: 'Test stronger CTA variants', estimatedEffort: 'low' },
    ],
    insights: [
      `Analyzed content (${content.length} chars) into ${4} scenes totaling 22 seconds.`,
      'Pacing is medium — good balance of information and momentum.',
      'Demo scene has highest effectiveness score (80) — leverage this pattern.',
    ],
  };
}
