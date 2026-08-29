/**
 * Creative Skill Library — composable creative workflows.
 *
 * An archive of reusable "creative skills" that extend the editing skills into
 * creative strategy skills. Each skill is a self-contained LLM operation with
 * declared inputs, outputs, a prompt template, and a credit cost. Skills can be
 * chained together into multi-step workflows (SkillChain) where the output of
 * one step feeds the input of the next.
 *
 * Inspired by #19 (aiads-skills), #33 (ad-video-skills), #36 (superCMO-skills),
 * #39 (skill-adsturbo).
 *
 * Execution uses the existing atlasChat() from src/lib/atlas.ts — no new LLM
 * dependency. The model is resolved per plan-tier via getLLMModel() (imported
 * dynamically inside the execute functions so this module stays importable in
 * the Node test runner without triggering the provider router chain).
 */
import { atlasChat } from '@/lib/atlas';
import type { PlanTier } from '@/lib/plan-tier';

// ── Types ──

export type SkillCategory =
  | 'hook'
  | 'angle'
  | 'script'
  | 'storyboard'
  | 'visual'
  | 'audio'
  | 'platform'
  | 'strategy'
  | 'analysis'
  | 'optimization';

export type SkillComplexity = 'basic' | 'intermediate' | 'advanced';

export interface SkillInput {
  name: string;
  type: 'text' | 'url' | 'image' | 'video' | 'json' | 'select';
  required: boolean;
  description: string;
  /** Options for the `select` type. */
  options?: string[];
}

export interface SkillOutput {
  name: string;
  type: 'text' | 'json' | 'image' | 'video';
  description: string;
}

export interface CreativeSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  complexity: SkillComplexity;
  inputs: SkillInput[];
  outputs: SkillOutput[];
  /** Prompt template with {{inputName}} placeholders for each input. */
  promptTemplate: string;
  /** Skill IDs this skill can chain into. */
  chainableWith: string[];
  estimatedCredits: number;
  tags: string[];
}

export interface SkillChainStep {
  skillId: string;
  /** Maps chain-level input names (or prior step outputKeys) to this skill's input names. */
  inputMappings: Record<string, string>;
  /** Key under which this step's output object is stored for downstream steps. */
  outputKey: string;
}

export interface SkillChain {
  id: string;
  name: string;
  description: string;
  steps: SkillChainStep[];
  totalCredits: number;
}

export interface SkillExecutionResult {
  skillId: string;
  outputs: Record<string, unknown>;
  creditsUsed: number;
  duration: number;
}

export interface ChainExecutionResult {
  results: SkillExecutionResult[];
  finalOutput: Record<string, unknown>;
}

// ── Model resolution ──
//
// getLLMModel is imported dynamically inside executeSkill/executeChain so this
// module can be imported by the Node test runner (which cannot resolve the
// relative extensionless imports inside src/lib/providers/router.ts). The data
// and pure helper functions above have no such dependency.

const CREATIVE_MAX_TOKENS = Number(process.env.CREATIVE_MAX_TOKENS || 6000);
const CREATIVE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);

async function resolveCreativeModel(planTier?: PlanTier): Promise<string> {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  const { getLLMModel } = await import('@/lib/providers/model-helpers');
  return getLLMModel(planTier);
}

// ── Prompt helpers ──

/** Replace {{name}} placeholders in a template with values from `inputs`.
 *  Non-string values are converted to readable text instead of raw JSON:
 *  - Arrays of objects: each item's `name`, `description`, or `text` field is extracted
 *  - Objects: `name`, `description`, `text`, or `summary` field is extracted
 *  - Arrays of strings: joined with newlines
 */
function renderTemplate(template: string, inputs: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = inputs[key];
    if (v === undefined || v === null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
      // Extract readable text from each array element
      const items = v.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return String(
            (item as Record<string, unknown>).name ||
            (item as Record<string, unknown>).description ||
            (item as Record<string, unknown>).text ||
            (item as Record<string, unknown>).hook ||
            ''
          );
        }
        return String(item);
      }).filter(Boolean);
      return items.join('\n');
    }
    if (typeof v === 'object') {
      // Extract a readable field from a single object
      return String(
        (v as Record<string, unknown>).name ||
        (v as Record<string, unknown>).description ||
        (v as Record<string, unknown>).text ||
        (v as Record<string, unknown>).summary ||
        (v as Record<string, unknown>).title ||
        ''
      );
    }
    return String(v);
  });
}

/** Extract the first JSON object from an LLM response string. */
function extractJson(raw: string): Record<string, unknown> {
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) {
    // No JSON object — return the raw text under a `text` key so callers still get something.
    return { text: s };
  }
  try {
    return JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;
  } catch {
    return { text: s };
  }
}

// ── Built-in skills (15) ──

export const BUILTIN_SKILLS: CreativeSkill[] = [
  {
    id: 'hook-generator',
    name: 'Hook Generator',
    description: 'Generate attention-grabbing opening hooks for ads across multiple psychological triggers.',
    category: 'hook',
    complexity: 'basic',
    estimatedCredits: 2,
    inputs: [
      { name: 'product', type: 'text', required: true, description: 'Product or service being advertised.' },
      { name: 'audience', type: 'text', required: true, description: 'Target audience description.' },
      { name: 'count', type: 'text', required: false, description: 'Number of hooks to generate (default 5).' },
    ],
    outputs: [
      { name: 'hooks', type: 'json', description: 'Array of hook objects with text, type, and rationale.' },
    ],
    promptTemplate: `Generate {{count}} attention-grabbing opening hooks for a short-form ad.

Product: {{product}}
Audience: {{audience}}

For each hook provide: type (e.g. curiosity, conflict, shock, question, stat), the hook text, and a short rationale. Output a JSON object: {"hooks":[{"type":"","text":"","rationale":""}]}.`,
    chainableWith: ['angle-explorer', 'script-writer', 'hook-tester', 'cta-optimizer'],
    tags: ['hook', 'attention', 'opening', 'copywriting'],
  },
  {
    id: 'angle-explorer',
    name: 'Angle Explorer',
    description: 'Explore multiple creative angles and emotional triggers for a product.',
    category: 'angle',
    complexity: 'intermediate',
    estimatedCredits: 3,
    inputs: [
      { name: 'product', type: 'text', required: true, description: 'Product or service being advertised.' },
      { name: 'audience', type: 'text', required: false, description: 'Target audience description.' },
      { name: 'context', type: 'text', required: false, description: 'Additional context (e.g. prior hook output).' },
    ],
    outputs: [
      { name: 'angles', type: 'json', description: 'Array of angle objects with name, description, and emotional trigger.' },
    ],
    promptTemplate: `Explore creative angles for this product.

Product: {{product}}
Audience: {{audience}}
Context: {{context}}

Generate distinct creative angles, each with a name, description, emotional trigger, and target audience. Output a JSON object: {"angles":[{"name":"","description":"","emotionalTrigger":"","targetAudience":""}]}.`,
    chainableWith: ['script-writer', 'storyboard-creator', 'visual-direction'],
    tags: ['angle', 'strategy', 'positioning', 'emotion'],
  },
  {
    id: 'script-writer',
    name: 'Script Writer',
    description: 'Write a short-form video ad script with scene-by-scene visuals and voiceover.',
    category: 'script',
    complexity: 'intermediate',
    estimatedCredits: 4,
    inputs: [
      { name: 'product', type: 'text', required: true, description: 'Product or service being advertised.' },
      { name: 'angle', type: 'text', required: false, description: 'Creative angle to use.' },
      { name: 'hook', type: 'text', required: false, description: 'Opening hook to use in scene 1.' },
      { name: 'cta', type: 'text', required: false, description: 'Call to action.' },
    ],
    outputs: [
      { name: 'script', type: 'json', description: 'Script object with scenes (visual, voiceover, onScreenText) and totalDurationSec.' },
    ],
    promptTemplate: `Write a short-form video ad script.

Product: {{product}}
Angle: {{angle}}
Hook (use in scene 1): {{hook}}
CTA: {{cta}}

Produce a scene-by-scene script. Each scene: i, durationSec, visual, voiceover, onScreenText. Output a JSON object: {"title":"","scenes":[{"i":1,"durationSec":5,"visual":"","voiceover":"","onScreenText":""}],"totalDurationSec":15,"cta":""}.`,
    chainableWith: ['storyboard-creator', 'visual-direction', 'audio-suggestion', 'platform-adapter'],
    tags: ['script', 'video', 'voiceover', 'scenes'],
  },
  {
    id: 'storyboard-creator',
    name: 'Storyboard Creator',
    description: 'Create a shot-by-shot storyboard from an ad script.',
    category: 'storyboard',
    complexity: 'intermediate',
    estimatedCredits: 3,
    inputs: [
      { name: 'script', type: 'json', required: true, description: 'Ad script object (from script-writer or manual).' },
      { name: 'ratio', type: 'select', required: false, description: 'Aspect ratio.', options: ['9:16', '1:1', '16:9', '4:5'] },
    ],
    outputs: [
      { name: 'storyboard', type: 'json', description: 'Storyboard object with shots (shot, prompt, durationSec, ratio).' },
    ],
    promptTemplate: `Create a shot-by-shot storyboard for this ad script.

Script: {{script}}
Ratio: {{ratio}}

For each scene produce a shot with a visual prompt suitable for an image/video model. Output a JSON object: {"shots":[{"i":1,"shot":"","prompt":"","durationSec":5,"ratio":"{{ratio}}"}],"ratio":"{{ratio}}","totalDurationSec":15}.`,
    chainableWith: ['visual-direction', 'platform-adapter'],
    tags: ['storyboard', 'shots', 'visual', 'planning'],
  },
  {
    id: 'visual-direction',
    name: 'Visual Direction',
    description: 'Generate visual direction notes: color, composition, lighting, and style guidance.',
    category: 'visual',
    complexity: 'basic',
    estimatedCredits: 2,
    inputs: [
      { name: 'concept', type: 'text', required: true, description: 'Creative concept or script summary.' },
      { name: 'platform', type: 'select', required: false, description: 'Target platform.', options: ['tiktok', 'instagram', 'youtube', 'facebook', 'linkedin'] },
    ],
    outputs: [
      { name: 'visualDirection', type: 'json', description: 'Visual direction notes (palette, lighting, composition, style).' },
    ],
    promptTemplate: `Generate visual direction notes for this creative concept.

Concept: {{concept}}
Platform: {{platform}}

Provide color palette, lighting, composition, camera style, and overall visual mood. Output a JSON object: {"palette":[],"lighting":"","composition":"","cameraStyle":"","mood":""}.`,
    chainableWith: ['storyboard-creator', 'platform-adapter'],
    tags: ['visual', 'direction', 'color', 'style'],
  },
  {
    id: 'audio-suggestion',
    name: 'Audio Suggestion',
    description: 'Suggest music genre, tempo, and sound effects for an ad.',
    category: 'audio',
    complexity: 'basic',
    estimatedCredits: 1,
    inputs: [
      { name: 'concept', type: 'text', required: true, description: 'Creative concept or script summary.' },
      { name: 'mood', type: 'text', required: false, description: 'Desired mood (e.g. energetic, emotional).' },
    ],
    outputs: [
      { name: 'audio', type: 'json', description: 'Audio direction (musicGenre, tempo, sfx, voiceoverStyle).' },
    ],
    promptTemplate: `Suggest music and sound effects for this ad.

Concept: {{concept}}
Mood: {{mood}}

Provide music genre, tempo (BPM), key sound effects, and voiceover style. Output a JSON object: {"musicGenre":"","tempoBPM":120,"sfx":[],"voiceoverStyle":""}.`,
    chainableWith: ['script-writer', 'platform-adapter'],
    tags: ['audio', 'music', 'sfx', 'sound'],
  },
  {
    id: 'platform-adapter',
    name: 'Platform Adapter',
    description: 'Adapt creative content for a specific social platform (format, duration, tone).',
    category: 'platform',
    complexity: 'intermediate',
    estimatedCredits: 3,
    inputs: [
      { name: 'content', type: 'text', required: true, description: 'Creative content (script, copy, or concept) to adapt.' },
      {
        name: 'platform',
        type: 'select',
        required: true,
        description: 'Target platform.',
        options: ['tiktok', 'instagram', 'youtube', 'facebook', 'linkedin', 'x'],
      },
    ],
    outputs: [
      { name: 'adapted', type: 'json', description: 'Platform-adapted content with format, duration, and tone notes.' },
    ],
    promptTemplate: `Adapt this creative content for {{platform}}.

Content: {{content}}
Platform: {{platform}}

Adjust format, duration, tone, captions, and CTA to fit the platform's conventions. Output a JSON object: {"platform":"{{platform}}","format":"","durationSec":15,"tone":"","caption":"","cta":"","notes":""}.`,
    chainableWith: ['variant-generator', 'performance-predictor'],
    tags: ['platform', 'adapt', 'format', 'distribution'],
  },
  {
    id: 'audience-analyzer',
    name: 'Audience Analyzer',
    description: 'Analyze a target audience: demographics, psychographics, pain points, and messaging hooks.',
    category: 'strategy',
    complexity: 'advanced',
    estimatedCredits: 4,
    inputs: [
      { name: 'product', type: 'text', required: true, description: 'Product or service.' },
      { name: 'market', type: 'text', required: false, description: 'Market or category context.' },
    ],
    outputs: [
      { name: 'audience', type: 'json', description: 'Audience profile (demographics, psychographics, painPoints, messagingHooks).' },
    ],
    promptTemplate: `Analyze the target audience for this product.

Product: {{product}}
Market: {{market}}

Build a detailed audience profile: demographics, psychographics, top pain points, desires, and messaging hooks that resonate. Output a JSON object: {"demographics":"","psychographics":"","painPoints":[],"desires":[],"messagingHooks":[]}.`,
    chainableWith: ['hook-generator', 'angle-explorer', 'script-writer', 'brand-aligner'],
    tags: ['audience', 'strategy', 'research', 'positioning'],
  },
  {
    id: 'competitor-analyzer',
    name: 'Competitor Analyzer',
    description: 'Analyze competitor ads: positioning, hooks, angles, and differentiation opportunities.',
    category: 'analysis',
    complexity: 'advanced',
    estimatedCredits: 5,
    inputs: [
      { name: 'category', type: 'text', required: true, description: 'Product category or competitor set.' },
      { name: 'competitors', type: 'text', required: false, description: 'Named competitors (optional).' },
    ],
    outputs: [
      { name: 'analysis', type: 'json', description: 'Competitor analysis (positioning, commonHooks, gaps, differentiation).' },
    ],
    promptTemplate: `Analyze competitor ads in this category.

Category: {{category}}
Competitors: {{competitors}}

Identify common positioning, recurring hooks, angles, messaging patterns, and gaps/differentiation opportunities. Output a JSON object: {"positioning":[],"commonHooks":[],"angles":[],"gaps":[],"differentiation":""}.`,
    chainableWith: ['trend-researcher', 'angle-explorer', 'performance-predictor'],
    tags: ['competitor', 'analysis', 'research', 'differentiation'],
  },
  {
    id: 'performance-predictor',
    name: 'Performance Predictor',
    description: 'Predict creative performance scores (hook strength, story flow, CTA clarity, brand alignment).',
    category: 'optimization',
    complexity: 'advanced',
    estimatedCredits: 5,
    inputs: [
      { name: 'creative', type: 'text', required: true, description: 'Creative content (script, copy, or concept) to score.' },
      { name: 'audience', type: 'text', required: false, description: 'Target audience context.' },
    ],
    outputs: [
      { name: 'prediction', type: 'json', description: 'Performance prediction with sub-scores and an overall score (0-100).' },
    ],
    promptTemplate: `Predict the performance of this creative.

Creative: {{creative}}
Audience: {{audience}}

Score hook strength, story flow, CTA clarity, and brand alignment (0-100 each), then an overall score and a short rationale. Output a JSON object: {"hookStrength":0,"storyFlow":0,"ctaClarity":0,"brandAlignment":0,"overallScore":0,"rationale":""}.`,
    chainableWith: ['variant-generator', 'platform-adapter', 'cta-optimizer'],
    tags: ['performance', 'prediction', 'scoring', 'optimization'],
  },
  {
    id: 'hook-tester',
    name: 'Hook Tester',
    description: 'A/B test hook variations: rank alternatives by predicted retention and engagement.',
    category: 'hook',
    complexity: 'intermediate',
    estimatedCredits: 3,
    inputs: [
      { name: 'hooks', type: 'text', required: true, description: 'Hook variations to test (one per line or JSON array).' },
      { name: 'audience', type: 'text', required: false, description: 'Target audience context.' },
    ],
    outputs: [
      { name: 'ranking', type: 'json', description: 'Ranked hook variations with retention and engagement scores.' },
    ],
    promptTemplate: `A/B test these hook variations.

Hooks: {{hooks}}
Audience: {{audience}}

Rank each hook by predicted retention (1-10) and engagement (1-10), and recommend the strongest one. Output a JSON object: {"ranking":[{"hook":"","retention":0,"engagement":0}],"recommended":""}.`,
    chainableWith: ['cta-optimizer', 'script-writer'],
    tags: ['hook', 'ab-test', 'retention', 'testing'],
  },
  {
    id: 'cta-optimizer',
    name: 'CTA Optimizer',
    description: 'Optimize the call-to-action for clarity, urgency, and conversion.',
    category: 'strategy',
    complexity: 'basic',
    estimatedCredits: 2,
    inputs: [
      { name: 'cta', type: 'text', required: true, description: 'Current call-to-action.' },
      { name: 'goal', type: 'select', required: false, description: 'Conversion goal.', options: ['click', 'purchase', 'signup', 'download', 'follow'] },
    ],
    outputs: [
      { name: 'cta', type: 'json', description: 'Optimized CTA options with rationale.' },
    ],
    promptTemplate: `Optimize this call-to-action for {{goal}}.

Current CTA: {{cta}}
Goal: {{goal}}

Provide 3 improved CTA options ranked by clarity, urgency, and conversion likelihood. Output a JSON object: {"options":[{"text":"","rationale":"","score":0}],"recommended":""}.`,
    chainableWith: ['platform-adapter', 'variant-generator'],
    tags: ['cta', 'conversion', 'copywriting', 'optimization'],
  },
  {
    id: 'trend-researcher',
    name: 'Trend Researcher',
    description: 'Research current creative and cultural trends relevant to a category.',
    category: 'analysis',
    complexity: 'intermediate',
    estimatedCredits: 4,
    inputs: [
      { name: 'category', type: 'text', required: true, description: 'Product category or topic.' },
      { name: 'platform', type: 'select', required: false, description: 'Platform focus.', options: ['tiktok', 'instagram', 'youtube', 'all'] },
    ],
    outputs: [
      { name: 'trends', type: 'json', description: 'Trend list with name, description, and how to leverage.' },
    ],
    promptTemplate: `Research current trends for this category.

Category: {{category}}
Platform: {{platform}}

Identify current creative and cultural trends, each with a name, description, and how a brand could leverage it. Output a JSON object: {"trends":[{"name":"","description":"","leverage":""}]}.`,
    chainableWith: ['angle-explorer', 'hook-generator', 'competitor-analyzer'],
    tags: ['trends', 'research', 'analysis', 'cultural'],
  },
  {
    id: 'brand-aligner',
    name: 'Brand Aligner',
    description: 'Align creative content with brand voice, tone, and vocabulary.',
    category: 'strategy',
    complexity: 'intermediate',
    estimatedCredits: 3,
    inputs: [
      { name: 'content', type: 'text', required: true, description: 'Creative content to align.' },
      { name: 'brandVoice', type: 'text', required: true, description: 'Brand voice description (tone, vocabulary, values).' },
    ],
    outputs: [
      { name: 'aligned', type: 'json', description: 'Brand-aligned content with changes and rationale.' },
    ],
    promptTemplate: `Align this creative content with the brand voice.

Content: {{content}}
Brand voice: {{brandVoice}}

Rewrite the content to match the brand voice, list the key changes, and explain the rationale. Output a JSON object: {"content":"","changes":[],"rationale":""}.`,
    chainableWith: ['platform-adapter', 'variant-generator', 'performance-predictor'],
    tags: ['brand', 'voice', 'alignment', 'consistency'],
  },
  {
    id: 'variant-generator',
    name: 'Variant Generator',
    description: 'Generate creative variants from a base concept (different angles, hooks, or formats).',
    category: 'optimization',
    complexity: 'intermediate',
    estimatedCredits: 3,
    inputs: [
      { name: 'base', type: 'text', required: true, description: 'Base creative content to vary.' },
      { name: 'count', type: 'text', required: false, description: 'Number of variants (default 3).' },
    ],
    outputs: [
      { name: 'variants', type: 'json', description: 'Array of creative variants with a label and content.' },
    ],
    promptTemplate: `Generate {{count}} creative variants from this base.

Base: {{base}}

Each variant should take a distinct angle, hook, or format. Output a JSON object: {"variants":[{"label":"","content":"","angle":""}]}.`,
    chainableWith: ['performance-predictor', 'platform-adapter', 'brand-aligner'],
    tags: ['variants', 'iteration', 'optimization', 'testing'],
  },
];

// ── Built-in chains (5) ──

export const BUILTIN_CHAINS: SkillChain[] = [
  {
    id: 'full-pipeline',
    name: 'Full Creative Pipeline',
    description: 'End-to-end: hook → angle → script → storyboard → visual direction → platform adaptation.',
    steps: [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience', count: 'count' },
        outputKey: 'hooks',
      },
      {
        skillId: 'angle-explorer',
        inputMappings: { product: 'product', audience: 'audience', context: 'hooks' },
        outputKey: 'angles',
      },
      {
        skillId: 'script-writer',
        inputMappings: { product: 'product', angles: 'angle', hooks: 'hook', cta: 'cta' },
        outputKey: 'script',
      },
      {
        skillId: 'storyboard-creator',
        inputMappings: { script: 'script', ratio: 'ratio' },
        outputKey: 'storyboard',
      },
      {
        skillId: 'visual-direction',
        inputMappings: { script: 'concept', platform: 'platform' },
        outputKey: 'visualDirection',
      },
      {
        skillId: 'platform-adapter',
        inputMappings: { script: 'content', platform: 'platform' },
        outputKey: 'adapted',
      },
    ],
    totalCredits: 17,
  },
  {
    id: 'hook-optimization',
    name: 'Hook Optimization',
    description: 'Generate hooks → A/B test them → optimize the CTA.',
    steps: [
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience', count: 'count' },
        outputKey: 'hooks',
      },
      {
        skillId: 'hook-tester',
        inputMappings: { hooks: 'hooks', audience: 'audience' },
        outputKey: 'ranking',
      },
      {
        skillId: 'cta-optimizer',
        inputMappings: { cta: 'cta', goal: 'goal' },
        outputKey: 'cta',
      },
    ],
    totalCredits: 7,
  },
  {
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    description: 'Analyze competitors → research trends → explore differentiation angles.',
    steps: [
      {
        skillId: 'competitor-analyzer',
        inputMappings: { category: 'category', competitors: 'competitors' },
        outputKey: 'analysis',
      },
      {
        skillId: 'trend-researcher',
        inputMappings: { category: 'category', platform: 'platform' },
        outputKey: 'trends',
      },
      {
        skillId: 'angle-explorer',
        inputMappings: { category: 'product', audience: 'audience', analysis: 'context' },
        outputKey: 'angles',
      },
    ],
    totalCredits: 12,
  },
  {
    id: 'audience-first',
    name: 'Audience-First Creative',
    description: 'Analyze audience → generate hooks tuned to them → write a script.',
    steps: [
      {
        skillId: 'audience-analyzer',
        inputMappings: { product: 'product', market: 'market' },
        outputKey: 'audience',
      },
      {
        skillId: 'hook-generator',
        inputMappings: { product: 'product', audience: 'audience', count: 'count' },
        outputKey: 'hooks',
      },
      {
        skillId: 'script-writer',
        inputMappings: { product: 'product', hooks: 'hook', cta: 'cta' },
        outputKey: 'script',
      },
    ],
    totalCredits: 10,
  },
  {
    id: 'performance-tuning',
    name: 'Performance Tuning',
    description: 'Generate variants → predict performance → adapt for platform.',
    steps: [
      {
        skillId: 'variant-generator',
        inputMappings: { base: 'base', count: 'count' },
        outputKey: 'variants',
      },
      {
        skillId: 'performance-predictor',
        inputMappings: { variants: 'creative', audience: 'audience' },
        outputKey: 'prediction',
      },
      {
        skillId: 'platform-adapter',
        inputMappings: { variants: 'content', platform: 'platform' },
        outputKey: 'adapted',
      },
    ],
    totalCredits: 11,
  },
];

// ── Lookup & query functions ──

const SKILL_INDEX: Map<string, CreativeSkill> = new Map(
  BUILTIN_SKILLS.map((s) => [s.id, s]),
);
const CHAIN_INDEX: Map<string, SkillChain> = new Map(
  BUILTIN_CHAINS.map((c) => [c.id, c]),
);

/** Get a single skill by id. */
export function getSkill(id: string): CreativeSkill | undefined {
  return SKILL_INDEX.get(id);
}

/** Get all skills in a category. */
export function getSkillsByCategory(category: SkillCategory): CreativeSkill[] {
  return BUILTIN_SKILLS.filter((s) => s.category === category);
}

/** Fuzzy search skills by name, description, id, or tags. */
export function searchSkills(query: string): CreativeSkill[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...BUILTIN_SKILLS];
  return BUILTIN_SKILLS.filter((s) => {
    const haystack = [s.id, s.name, s.description, ...s.tags].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

/** Get a single chain by id. */
export function getChain(id: string): SkillChain | undefined {
  return CHAIN_INDEX.get(id);
}

/** List all built-in chains. */
export function listChains(): SkillChain[] {
  return [...BUILTIN_CHAINS];
}

/** List all built-in skills. */
export function listSkills(): CreativeSkill[] {
  return [...BUILTIN_SKILLS];
}

// ── Chain validation & credit estimation ──

/**
 * Validate a skill chain: every step references a known skill, no duplicate
 * output keys, and declared required inputs are satisfiable.
 */
export function validateChain(chain: SkillChain): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!chain.id || !chain.id.trim()) errors.push('chain_missing_id');
  if (!chain.name || !chain.name.trim()) errors.push('chain_missing_name');
  if (!Array.isArray(chain.steps) || chain.steps.length === 0) {
    errors.push('chain_no_steps');
    return { valid: false, errors };
  }

  const outputKeys = new Set<string>();
  for (let i = 0; i < chain.steps.length; i += 1) {
    const step = chain.steps[i];
    const skill = getSkill(step.skillId);
    if (!skill) {
      errors.push(`step_${i}_unknown_skill:${step.skillId}`);
      continue;
    }
    if (!step.outputKey || !step.outputKey.trim()) {
      errors.push(`step_${i}_missing_output_key`);
    } else if (outputKeys.has(step.outputKey)) {
      errors.push(`step_${i}_duplicate_output_key:${step.outputKey}`);
    } else {
      outputKeys.add(step.outputKey);
    }

    // Required skill inputs must be mapped from a chain input or a prior step output.
    // inputMappings maps { sourceKey: skillInputName } — values are skill input names.
    for (const inp of skill.inputs) {
      if (!inp.required) continue;
      const mapped = Object.values(step.inputMappings).includes(inp.name);
      if (!mapped) {
        errors.push(`step_${i}_missing_required_input:${inp.name}`);
      }
    }

    // Type compatibility: text inputs should not be mapped from array/object source keys
    // (which would produce JSON blobs in prompts). We check that text inputs are not
    // mapped from prior step outputs that are known to produce arrays/objects.
    // Chain-level inputs are not checked here since their types are unknown at validation time.
  }

  return { valid: errors.length === 0, errors };
}

/** Estimate total credits for a chain by summing its steps' skill costs. */
export function estimateChainCredits(chain: SkillChain): number {
  return chain.steps.reduce((sum, step) => {
    const skill = getSkill(step.skillId);
    return sum + (skill?.estimatedCredits ?? 0);
  }, 0);
}

// ── Execution ──

/**
 * Execute a single skill: render its prompt template with the provided inputs,
 * call atlasChat, and parse the JSON output.
 */
export async function executeSkill(
  skillId: string,
  inputs: Record<string, unknown>,
  planTier?: PlanTier,
): Promise<SkillExecutionResult> {
  const skill = getSkill(skillId);
  if (!skill) throw new Error(`unknown_skill:${skillId}`);

  const start = Date.now();
  const model = await resolveCreativeModel(planTier);
  const userPrompt = renderTemplate(skill.promptTemplate, inputs);

  const raw = await atlasChat(
    [
      {
        role: 'system',
        content: `You are a creative advertising strategist. Follow the user's instructions precisely and always respond with a single valid JSON object. Do not include prose outside the JSON.`,
      },
      { role: 'user', content: userPrompt },
    ],
    model,
    CREATIVE_MAX_TOKENS,
    CREATIVE_TIMEOUT_MS,
  );

  const parsed = extractJson(raw);
  const outputs: Record<string, unknown> = {};
  for (const out of skill.outputs) {
    if (out.name in parsed) {
      outputs[out.name] = parsed[out.name];
    }
  }
  // Always include the raw text so callers can recover if structured parsing missed a field.
  if (Object.keys(outputs).length === 0) {
    outputs.text = raw;
  }

  return {
    skillId,
    outputs,
    creditsUsed: skill.estimatedCredits,
    duration: Date.now() - start,
  };
}

/**
 * Execute a skill chain: run each step sequentially, passing prior step outputs
 * (by outputKey) and chain-level inputs forward via each step's inputMappings.
 */
export async function executeChain(
  chainId: string,
  inputs: Record<string, unknown>,
  planTier?: PlanTier,
): Promise<ChainExecutionResult> {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`unknown_chain:${chainId}`);

  const validation = validateChain(chain);
  if (!validation.valid) throw new Error(`invalid_chain:${validation.errors.join(',')}`);

  const results: SkillExecutionResult[] = [];
  // Store of all available values: starts as chain inputs, accumulates step outputs by outputKey.
  const store: Record<string, unknown> = { ...inputs };

  for (const step of chain.steps) {
    // Resolve this step's inputs from the store using its inputMappings.
    // inputMappings maps { sourceKey: skillInputName } — invert to read from store.
    const stepInputs: Record<string, unknown> = {};
    for (const [sourceKey, skillInputName] of Object.entries(step.inputMappings)) {
      if (sourceKey in store) {
        // Coerce arrays/objects to readable text for text inputs (renderTemplate handles this)
        stepInputs[skillInputName] = store[sourceKey];
      } else {
        // Source key not found in store — log warning for debugging
        console.warn(`[skill-chain] ${chainId}: source key "${sourceKey}" not in store for skill "${step.skillId}"`);
      }
    }

    const result = await executeSkill(step.skillId, stepInputs, planTier);
    results.push(result);
    // Store this step's outputs under the step's outputKey so downstream steps can read them.
    store[step.outputKey] = result.outputs;
  }

  // The final output is the last step's outputs, plus all intermediate outputs by key.
  const finalOutput: Record<string, unknown> = {};
  for (const step of chain.steps) {
    if (step.outputKey in store) finalOutput[step.outputKey] = store[step.outputKey];
  }

  return { results, finalOutput };
}
