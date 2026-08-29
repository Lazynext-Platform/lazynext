/**
 * Creative intelligence types.
 *
 * These types define the structured creative planning layer that sits between
 * product/brand input and media generation. Each type is a candidate-based
 * object (multiple options can be generated and compared).
 *
 * Inspired by:
 * - creative-ad-agent (#3): hook-first methodology, 6 diverse concepts
 * - AdsTurbo/product-page-to-ad-brief (#40): brief → angles → scripts → storyboard
 * - RemixKit (#16): creative analysis → remix brief
 */

/** A structured creative brief — the foundation for all downstream generation. */
export interface CreativeBrief {
  objective: string; // campaign objective (awareness/consideration/conversion/retention)
  platform: string; // target platform (tiktok/instagram/youtube/facebook)
  format: string; // ad format (ugc/commercial/drama/skit)
  audience: string; // target audience description
  product: string; // product description (English anchor for consistency)
  productName: string;
  offer: string; // offer/CTA incentive
  painPoint: string; // primary pain point addressed
  benefit: string; // primary benefit
  mechanism: string; // how the product works/delivers
  proof: string; // evidence/proof points
  angle: string; // primary creative angle
  hook: string; // recommended opening hook
  cta: string; // call-to-action
  visualDirection: string; // visual style guidance
  soundDirection: string; // audio/voiceover guidance
  complianceConstraints: string[]; // claims to avoid, platform rules
  language: string; // output language code
}

/** A hook candidate — multiple opening hooks for A/B testing. */
export interface HookCandidate {
  id: string;
  type: string; // hook type (conflict/suspense/painpoint/number/contrast/identity/bizarre/freebie/pov/controversial/authority)
  text: string; // the hook text (in target language)
  rationale: string; // why this hook works
  estimatedRetention: number; // 1-10, estimated scroll-stopping power
}

/** A creative angle candidate — multiple angles for the same product. */
export interface CreativeAngle {
  id: string;
  name: string;
  description: string; // what the angle is
  emotionalTrigger: string; // social proof / urgency / curiosity / fear / aspiration / etc
  targetAudience: string; // who this angle resonates with
  rationale: string; // why this angle works for this product
}

/** A script candidate — a full ad script based on a brief + angle + hook. */
export interface ScriptCandidate {
  id: string;
  angleId: string;
  hookId: string;
  title: string;
  scenes: Array<{
    i: number;
    durationSec: number;
    visual: string; // what happens on screen (English for generation)
    voiceover: string; // spoken text (in target language)
    onScreenText: string; // caption/text overlay (in target language)
  }>;
  totalDurationSec: number;
  cta: string;
  language: string;
}

/** A storyboard candidate — shot-by-shot visual plan from a script. */
export interface StoryboardCandidate {
  id: string;
  scriptId: string;
  shots: Array<{
    i: number;
    shot: string; // framing/composition (English)
    prompt: string; // generation prompt (English, includes dialogue)
    durationSec: number;
    ratio: string;
  }>;
  ratio: string;
  totalDurationSec: number;
}

/** A creative variant — an A/B variation of a creative. */
export interface CreativeVariant {
  id: string;
  parentCreativeId: string;
  variationType: string; // hook / script / visual / cta
  hook: string;
  script: string;
  visual: string;
  cta: string;
  score?: CreativeScore;
  rationale: string;
}

/** A creative quality score — evaluation of a completed creative. */
export interface CreativeScore {
  hookStrength: number; // 1-10
  clarity: number;
  productVisibility: number;
  brandConsistency: number;
  emotionalImpact: number;
  novelty: number;
  platformFit: number;
  ctaStrength: number;
  audioQuality: number;
  visualQuality: number;
  complianceRisk: number; // 0-10, higher = more risk
  overall: number; // weighted average
  notes: string;
}

/** A single cut in an Edit Decision List (EDL) produced by the edit stage. */
export interface EditCut {
  shotIndex: number;
  shot: string;
  prompt: string;
  mediaUrl?: string;
  mediaType?: string;
  label?: string;
  name?: string;
  durationSec?: number;
  duration?: number;
  startSec?: number;
  endSec?: number;
  transition?: string;
}

/** The result of the edit stage — an Edit Decision List and final media URL. */
export interface EditResult {
  cutPlan: EditCut[];
  finalMediaUrl?: string;
  totalDurationSec?: number;
  format?: string;
}

/** A reference creative analysis — structured analysis of a reference ad. */
export interface ReferenceCreativeAnalysis {
  source: string; // source URL or description
  duration: number; // in seconds
  format: string; // video format
  platform: string; // likely platform
  hook: string; // hook type and text
  hookDuration: number; // hook duration in seconds
  narrativeStructure: string; // story arc description
  scenes: Array<{
    i: number;
    durationSec: number;
    description: string;
    shotType: string;
  }>;
  shotTypes: string[];
  pacing: string; // fast/medium/slow + rhythm description
  transitions: string[];
  captions: string; // caption style
  cta: string; // CTA type and text
  talent: string; // presenter/actor description
  productPlacement: string; // how product is shown
  music: string; // music style
  soundEffects: string[];
  emotionalTone: string;
  persuasionMechanisms: string[];
  adaptationRecommendations: string[];
  originalityConstraints: string[]; // what NOT to copy
}

// ── Deep reference analysis (RemixKit #16: evidence → analysis → remix brief) ──

/** A single scene breakdown from a deep reference analysis. */
export interface SceneBreakdown {
  sceneNumber: number;
  timeRange: { startSec: number; endSec: number };
  shotType: string;
  description: string;
  emotionScore: number; // 0-100
  engagementScore: number; // 0-100
  visualElements: string[];
  audioElements: string[];
  textElements: string[];
}

/** Hook analysis extracted from a reference video. */
export interface HookAnalysis {
  hookType: string; // question, shock, story, statistic, visual, contrast
  hookText: string;
  hookTiming: { startSec: number; endSec: number };
  effectivenessScore: number; // 0-100
  psychologicalTrigger: string;
  audienceAttentionFactor: string;
  variantSuggestions: string[];
}

/** Pacing analysis of a reference video. */
export interface PacingAnalysis {
  overallPace: string; // fast, medium, slow
  averageShotDuration: number;
  shotCount: number;
  paceChanges: { timeSec: number; change: string }[];
  energyCurve: { timeSec: number; energy: number }[]; // 0-100
  recommendedPace: string;
}

/** A deep, structured breakdown of a reference video. */
export interface DeepReferenceAnalysis {
  basicAnalysis: ReferenceCreativeAnalysis; // existing basic analysis
  scenes: SceneBreakdown[];
  hookAnalysis: HookAnalysis;
  pacing: PacingAnalysis;
  emotionalArc: { timeSec: number; emotion: string; intensity: number }[];
  persuasionTimeline: { timeSec: number; technique: string; description: string }[];
  remixBrief: {
    preservedElements: string[];
    adaptedElements: string[];
    newElements: string[];
    recommendedStructure: string;
    differentiationStrategy: string;
  };
  performancePrediction: {
    hookStrength: number;
    storyFlow: number;
    ctaClarity: number;
    brandAlignment: number;
    overallScore: number;
  };
}
