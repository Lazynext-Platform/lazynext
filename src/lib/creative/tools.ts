/**
 * MCP-style creative operation contracts.
 *
 * Each creative function is wrapped as a "tool" with:
 * - name: unique identifier (follows the `creative.*` convention)
 * - description: what the tool does
 * - inputSchema: JSON schema for the input
 * - outputSchema: JSON schema for the output
 * - cost: credit cost (from CREATIVE_COSTS)
 * - capabilities: model capabilities required to execute
 * - execute: the function to call (optional — the contract layer defines
 *   the interface; execution is wired up by the workflow layer)
 *
 * Inspired by OpenChatCut (#48) MCP concept but adapted for LazyNext's
 * architecture: the creative intelligence functions in intelligence.ts are
 * composable steps (brief → hooks → angles → script → storyboard) that can
 * be called individually or chained. This module exposes them as standardized,
 * agent-callable tool contracts with input/output validation.
 *
 * This file is self-contained — it defines schemas inline and does NOT import
 * from intelligence.ts, so it can be tested without TypeScript path alias
 * resolution for relative extensionless imports.
 */

// ── Credit costs per creative step (mirrors CREATIVE_COSTS in intelligence.ts) ──
export const CREATIVE_TOOL_COSTS = {
  brief: 3,
  hooks: 2,
  angles: 2,
  script: 3,
  storyboard: 3,
  referenceAnalysis: 5,
  score: 2,
  variants: 3,
  refine: 2,
  remix: 4,
} as const;

// ── Types ──

/** Model capability categories required by a tool (subset of providers/types.ts Capability). */
export type ToolCapability = 'text' | 'reasoning' | 'vision';

/** A minimal JSON Schema fragment for input/output validation. */
export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  description?: string;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  default?: unknown;
  additionalProperties?: boolean;
}

/** Execution context passed to every tool — provides session/user metadata. */
export interface ToolContext {
  /** User ID executing the tool. */
  userId?: string;
  /** Available credits for the user. */
  credits?: number;
  /** Preferred model override. */
  model?: string;
  /** Preferred output language code. */
  language?: string;
  /** Arbitrary metadata bag. */
  metadata?: Record<string, unknown>;
}

/** The result of executing a creative tool. */
export interface ToolResult<T = unknown> {
  /** The tool name that produced this result. */
  tool: string;
  /** Whether execution succeeded. */
  ok: boolean;
  /** The output data (typed by the tool's outputSchema). */
  output?: T;
  /** Error message if execution failed. */
  error?: string;
  /** Credits consumed by this execution. */
  cost: number;
}

/**
 * A creative operation exposed as an MCP-style tool contract.
 *
 * Each tool wraps a creative intelligence function with:
 * - a declarative JSON schema for input validation
 * - a declarative JSON schema for output shape
 * - a credit cost
 * - the model capabilities required to run it
 * - an optional execute function (the workflow layer wires this up)
 */
export interface CreativeTool {
  /** Unique tool name following the `creative.*` convention. */
  name: string;
  /** Human-readable description of what the tool does. */
  description: string;
  /** JSON schema describing the expected input. */
  inputSchema: JsonSchema;
  /** JSON schema describing the output shape. */
  outputSchema: JsonSchema;
  /** Credit cost to execute this tool. */
  cost: number;
  /** Model capabilities required to execute this tool. */
  capabilities: ToolCapability[];
  /**
   * The function to call. Optional at the contract layer — the workflow
   * layer wires this up to the actual intelligence.ts implementation.
   */
  execute?: (input: unknown, context: ToolContext) => Promise<unknown>;
}

// ── Registry ──

/** A Map of tool names to CreativeTool definitions. */
export type CreativeToolRegistry = Map<string, CreativeTool>;

/** The global tool registry. */
const registry: CreativeToolRegistry = new Map();

/** Register a creative tool. Throws if a tool with the same name already exists. */
export function registerTool(tool: CreativeTool): void {
  if (registry.has(tool.name)) {
    throw new Error(`creative tool already registered: ${tool.name}`);
  }
  registry.set(tool.name, tool);
}

/** Get a tool by name. Returns undefined for unknown tools. */
export function getTool(name: string): CreativeTool | undefined {
  return registry.get(name);
}

/** List all registered creative tools. */
export function listTools(): CreativeTool[] {
  return Array.from(registry.values());
}

/** List all registered tool names. */
export function listToolNames(): string[] {
  return Array.from(registry.keys());
}

// ── Validation ──

/**
 * Validate a value against a minimal JSON Schema fragment.
 * Checks `type`, `required`, `enum`, `minimum`, and `maximum`.
 * Returns an array of error messages (empty if valid).
 */
export function validateAgainstSchema(value: unknown, schema: JsonSchema): string[] {
  const errors: string[] = [];

  if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
      return errors;
    }
    const obj = value as Record<string, unknown>;
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in obj) || obj[key] === undefined || obj[key] === null) {
          errors.push(`missing required property: ${key}`);
        }
      }
    }
    if (schema.properties) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (key in obj && obj[key] !== undefined && obj[key] !== null) {
          const subErrors = validateAgainstSchema(obj[key], subSchema);
          for (const e of subErrors) errors.push(`${key}: ${e}`);
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`expected array, got ${typeof value}`);
      return errors;
    }
    if (schema.items) {
      value.forEach((item, idx) => {
        const subErrors = validateAgainstSchema(item, schema.items!);
        for (const e of subErrors) errors.push(`[${idx}]: ${e}`);
      });
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`expected string, got ${typeof value}`);
    } else {
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`expected one of [${schema.enum.join(', ')}], got "${value}"`);
      }
    }
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number' || (schema.type === 'integer' && !Number.isInteger(value))) {
      errors.push(`expected ${schema.type}, got ${typeof value}`);
    } else {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`expected >= ${schema.minimum}, got ${value}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`expected <= ${schema.maximum}, got ${value}`);
      }
    }
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`expected boolean, got ${typeof value}`);
    }
  }

  return errors;
}

// ── Execution ──

/**
 * Execute a creative tool by name with input validation.
 *
 * 1. Looks up the tool in the registry.
 * 2. Validates the input against the tool's inputSchema.
 * 3. Calls the tool's execute function (if wired up).
 * 4. Returns a ToolResult with the output or error.
 *
 * If the tool has no execute function, returns an error indicating the
 * contract is defined but not yet wired up.
 */
export async function executeTool(
  name: string,
  input: unknown,
  context: ToolContext = {},
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return { tool: name, ok: false, error: `unknown tool: ${name}`, cost: 0 };
  }

  const validationErrors = validateAgainstSchema(input, tool.inputSchema);
  if (validationErrors.length > 0) {
    return {
      tool: name,
      ok: false,
      error: `input validation failed: ${validationErrors.join('; ')}`,
      cost: 0,
    };
  }

  if (!tool.execute) {
    return {
      tool: name,
      ok: false,
      error: `tool "${name}" is registered but has no execute function (contract only)`,
      cost: 0,
    };
  }

  try {
    const output = await tool.execute(input, context);
    return { tool: name, ok: true, output, cost: tool.cost };
  } catch (err) {
    return {
      tool: name,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      cost: 0,
    };
  }
}

// ── Shared schema fragments ──

const stringSchema = (description?: string): JsonSchema => ({ type: 'string', description });
const stringArraySchema = (description?: string): JsonSchema => ({
  type: 'array',
  description,
  items: { type: 'string' },
});

/** JSON schema fragment for a CreativeBrief object. */
const briefSchema: JsonSchema = {
  type: 'object',
  description: 'A structured creative brief.',
  required: ['product', 'productName', 'audience', 'platform', 'format', 'language'],
  properties: {
    objective: stringSchema('Campaign objective (awareness/consideration/conversion/retention)'),
    platform: stringSchema('Target platform (tiktok/instagram/youtube/facebook)'),
    format: stringSchema('Ad format (ugc/commercial/drama/skit)'),
    audience: stringSchema('Target audience description'),
    product: stringSchema('Product description (English anchor)'),
    productName: stringSchema('Product name'),
    offer: stringSchema('Offer/CTA incentive'),
    painPoint: stringSchema('Primary pain point addressed'),
    benefit: stringSchema('Primary benefit'),
    mechanism: stringSchema('How the product works/delivers'),
    proof: stringSchema('Evidence/proof points'),
    angle: stringSchema('Primary creative angle'),
    hook: stringSchema('Recommended opening hook'),
    cta: stringSchema('Call-to-action'),
    visualDirection: stringSchema('Visual style guidance'),
    soundDirection: stringSchema('Audio/voiceover guidance'),
    complianceConstraints: stringArraySchema('Claims to avoid, platform rules'),
    language: stringSchema('Output language code'),
  },
};

/** JSON schema fragment for a HookCandidate. */
const hookSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'type', 'text'],
  properties: {
    id: stringSchema('Unique hook identifier'),
    type: stringSchema('Hook type (conflict/suspense/painpoint/number/contrast/etc)'),
    text: stringSchema('The hook text in target language'),
    rationale: stringSchema('Why this hook works'),
    estimatedRetention: { type: 'integer', minimum: 1, maximum: 10 },
  },
};

/** JSON schema fragment for a CreativeAngle. */
const angleSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'name', 'description'],
  properties: {
    id: stringSchema('Unique angle identifier'),
    name: stringSchema('Angle name'),
    description: stringSchema('What the angle is'),
    emotionalTrigger: stringSchema('Social proof / urgency / curiosity / fear / aspiration'),
    targetAudience: stringSchema('Who this angle resonates with'),
    rationale: stringSchema('Why this angle works'),
  },
};

/** JSON schema fragment for a ScriptCandidate. */
const scriptSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'angleId', 'hookId', 'title', 'scenes', 'totalDurationSec', 'language'],
  properties: {
    id: stringSchema('Unique script identifier'),
    angleId: stringSchema('ID of the angle used'),
    hookId: stringSchema('ID of the hook used'),
    title: stringSchema('Script title'),
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['i', 'durationSec', 'visual', 'voiceover'],
        properties: {
          i: { type: 'integer', minimum: 1 },
          durationSec: { type: 'integer', minimum: 3, maximum: 15 },
          visual: stringSchema('What happens on screen'),
          voiceover: stringSchema('Spoken text in target language'),
          onScreenText: stringSchema('Caption/text overlay'),
        },
      },
    },
    totalDurationSec: { type: 'integer', minimum: 5, maximum: 60 },
    cta: stringSchema('Call-to-action'),
    language: stringSchema('Output language code'),
  },
};

/** JSON schema fragment for a StoryboardCandidate. */
const storyboardSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'scriptId', 'shots', 'ratio', 'totalDurationSec'],
  properties: {
    id: stringSchema('Unique storyboard identifier'),
    scriptId: stringSchema('ID of the source script'),
    shots: {
      type: 'array',
      items: {
        type: 'object',
        required: ['i', 'shot', 'prompt', 'durationSec', 'ratio'],
        properties: {
          i: { type: 'integer', minimum: 1 },
          shot: stringSchema('Framing/composition'),
          prompt: stringSchema('Generation prompt'),
          durationSec: { type: 'integer', minimum: 3, maximum: 15 },
          ratio: stringSchema('Aspect ratio'),
        },
      },
    },
    ratio: stringSchema('Aspect ratio'),
    totalDurationSec: { type: 'integer', minimum: 5, maximum: 60 },
  },
};

/** JSON schema fragment for a CreativeScore. */
const scoreSchema: JsonSchema = {
  type: 'object',
  required: ['overall', 'notes'],
  properties: {
    hookStrength: { type: 'integer', minimum: 1, maximum: 10 },
    clarity: { type: 'integer', minimum: 1, maximum: 10 },
    productVisibility: { type: 'integer', minimum: 1, maximum: 10 },
    brandConsistency: { type: 'integer', minimum: 1, maximum: 10 },
    emotionalImpact: { type: 'integer', minimum: 1, maximum: 10 },
    novelty: { type: 'integer', minimum: 1, maximum: 10 },
    platformFit: { type: 'integer', minimum: 1, maximum: 10 },
    ctaStrength: { type: 'integer', minimum: 1, maximum: 10 },
    audioQuality: { type: 'integer', minimum: 1, maximum: 10 },
    visualQuality: { type: 'integer', minimum: 1, maximum: 10 },
    complianceRisk: { type: 'integer', minimum: 0, maximum: 10 },
    overall: { type: 'integer', minimum: 1, maximum: 10 },
    notes: stringSchema('Evaluation notes'),
  },
};

/** JSON schema fragment for a CreativeVariant. */
const variantSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'parentCreativeId', 'variationType', 'rationale'],
  properties: {
    id: stringSchema('Unique variant identifier'),
    parentCreativeId: stringSchema('ID of the parent creative'),
    variationType: { type: 'string', enum: ['hook', 'script', 'visual', 'cta'] },
    hook: stringSchema('Alternative hook text'),
    script: stringSchema('Alternative script summary'),
    visual: stringSchema('Alternative visual direction'),
    cta: stringSchema('Alternative CTA'),
    rationale: stringSchema('Why this variant might perform better'),
  },
};

/** JSON schema fragment for a ReferenceCreativeAnalysis. */
const referenceAnalysisSchema: JsonSchema = {
  type: 'object',
  required: ['source', 'hook', 'narrativeStructure', 'pacing', 'emotionalTone'],
  properties: {
    source: stringSchema('Source URL or description'),
    duration: { type: 'integer', minimum: 1, maximum: 120 },
    format: stringSchema('Video format'),
    platform: stringSchema('Likely platform'),
    hook: stringSchema('Hook type and text'),
    hookDuration: { type: 'integer', minimum: 1, maximum: 10 },
    narrativeStructure: stringSchema('Story arc description'),
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['i', 'durationSec', 'description'],
        properties: {
          i: { type: 'integer', minimum: 1 },
          durationSec: { type: 'integer', minimum: 1, maximum: 30 },
          description: stringSchema('Scene description'),
          shotType: stringSchema('Shot type'),
        },
      },
    },
    shotTypes: stringArraySchema('Shot types used'),
    pacing: stringSchema('Fast/medium/slow + rhythm'),
    transitions: stringArraySchema('Transition styles'),
    captions: stringSchema('Caption style'),
    cta: stringSchema('CTA type and text'),
    talent: stringSchema('Presenter/actor description'),
    productPlacement: stringSchema('How product is shown'),
    music: stringSchema('Music style'),
    soundEffects: stringArraySchema('Sound effects'),
    emotionalTone: stringSchema('Emotional tone'),
    persuasionMechanisms: stringArraySchema('Persuasion mechanisms'),
    adaptationRecommendations: stringArraySchema('How to adapt for a new product'),
    originalityConstraints: stringArraySchema('What NOT to copy'),
  },
};

// ── Tool definitions ──

/** All creative tool definitions, registered below. */
const CREATIVE_TOOLS: CreativeTool[] = [
  {
    name: 'creative.generateBrief',
    description:
      'Generate a structured creative brief from product/brand info. ' +
      'This is the foundational step — all downstream generation (hooks, angles, ' +
      'scripts, storyboards) builds on the brief.',
    cost: CREATIVE_TOOL_COSTS.brief,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['product'],
      properties: {
        product: stringSchema('Product text or description'),
        productName: stringSchema('Product name'),
        platform: stringSchema('Target platform (tiktok/instagram/youtube/facebook)'),
        format: stringSchema('Ad format (ugc/commercial/drama/skit)'),
        audience: stringSchema('Target audience description'),
        learnings: stringSchema('Performance learnings from past campaigns'),
      },
    },
    outputSchema: briefSchema,
    execute: async (input: unknown) => {
      const { generateBrief } = await import('@/lib/creative/intelligence');
      return generateBrief(input as {
        product: string;
        productName?: string;
        platform?: string;
        format?: string;
        audience?: string;
        learnings?: string;
      });
    },
  },
  {
    name: 'creative.generateHooks',
    description:
      'Generate hook candidates (opening lines) for a creative brief. ' +
      'Returns multiple diverse hooks for A/B testing.',
    cost: CREATIVE_TOOL_COSTS.hooks,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['brief'],
      properties: {
        brief: briefSchema,
        count: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
      },
    },
    outputSchema: {
      type: 'array',
      items: hookSchema,
    },
    execute: async (input: unknown) => {
      const { generateHooks } = await import('@/lib/creative/intelligence');
      const typed = input as { brief: import('@/lib/creative/types').CreativeBrief; count?: number };
      return generateHooks(typed.brief, typed.count);
    },
  },
  {
    name: 'creative.generateAngles',
    description:
      'Generate creative angle candidates for a product. ' +
      'Each angle is a different way to position the product emotionally.',
    cost: CREATIVE_TOOL_COSTS.angles,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['brief'],
      properties: {
        brief: briefSchema,
        count: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
      },
    },
    outputSchema: {
      type: 'array',
      items: angleSchema,
    },
    execute: async (input: unknown) => {
      const { generateAngles } = await import('@/lib/creative/intelligence');
      const typed = input as { brief: import('@/lib/creative/types').CreativeBrief; count?: number };
      return generateAngles(typed.brief, typed.count);
    },
  },
  {
    name: 'creative.generateScript',
    description:
      'Generate a full ad script from a brief + angle + hook. ' +
      'The script is scene-by-scene with visual, voiceover, and on-screen text.',
    cost: CREATIVE_TOOL_COSTS.script,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['brief', 'angle', 'hook'],
      properties: {
        brief: briefSchema,
        angle: angleSchema,
        hook: hookSchema,
      },
    },
    outputSchema: scriptSchema,
    execute: async (input: unknown) => {
      const { generateScript } = await import('@/lib/creative/intelligence');
      const typed = input as {
        brief: import('@/lib/creative/types').CreativeBrief;
        angle: import('@/lib/creative/types').CreativeAngle;
        hook: import('@/lib/creative/types').HookCandidate;
      };
      return generateScript(typed.brief, typed.angle, typed.hook);
    },
  },
  {
    name: 'creative.generateStoryboard',
    description:
      'Generate a shot-by-shot storyboard from a brief + script. ' +
      'Each shot has a generation prompt, framing, and duration.',
    cost: CREATIVE_TOOL_COSTS.storyboard,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['brief', 'script'],
      properties: {
        brief: briefSchema,
        script: scriptSchema,
        ratio: { type: 'string', default: '9:16' },
      },
    },
    outputSchema: storyboardSchema,
    execute: async (input: unknown) => {
      const { generateStoryboard } = await import('@/lib/creative/intelligence');
      const typed = input as {
        brief: import('@/lib/creative/types').CreativeBrief;
        script: import('@/lib/creative/types').ScriptCandidate;
        ratio?: string;
      };
      return generateStoryboard(typed.brief, typed.script, typed.ratio);
    },
  },
  {
    name: 'creative.scoreCombination',
    description:
      'Score a hook+angle+script combination across 11 quality dimensions. ' +
      'Returns per-dimension scores (1-10) and a weighted overall score.',
    cost: CREATIVE_TOOL_COSTS.score,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['brief', 'script'],
      properties: {
        brief: briefSchema,
        script: scriptSchema,
        storyboard: storyboardSchema,
      },
    },
    outputSchema: scoreSchema,
    execute: async (input: unknown) => {
      const { scoreCreative } = await import('@/lib/creative/intelligence');
      return scoreCreative(input as {
        brief: import('@/lib/creative/types').CreativeBrief;
        script: import('@/lib/creative/types').ScriptCandidate;
        storyboard?: import('@/lib/creative/types').StoryboardCandidate | null;
      });
    },
  },
  {
    name: 'creative.generateVariants',
    description:
      'Generate A/B test variants of a creative. ' +
      'Each variant tweaks the hook, script, visual, or CTA.',
    cost: CREATIVE_TOOL_COSTS.variants,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['brief', 'script'],
      properties: {
        brief: briefSchema,
        script: scriptSchema,
        count: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
      },
    },
    outputSchema: {
      type: 'array',
      items: variantSchema,
    },
    execute: async (input: unknown) => {
      const { generateVariants } = await import('@/lib/creative/intelligence');
      const typed = input as {
        brief: import('@/lib/creative/types').CreativeBrief;
        script: import('@/lib/creative/types').ScriptCandidate;
        count?: number;
      };
      return generateVariants(typed.brief, typed.script, typed.count);
    },
  },
  {
    name: 'creative.refine',
    description:
      'Refine a creative element (brief, hook, angle, or script) via a natural ' +
      'language instruction. E.g. "make the hook more urgent" or "rewrite for a ' +
      'younger audience".',
    cost: CREATIVE_TOOL_COSTS.refine,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['type', 'instruction', 'brief', 'element'],
      properties: {
        type: { type: 'string', enum: ['brief', 'hook', 'angle', 'script'] },
        instruction: stringSchema('Natural language refinement instruction'),
        brief: briefSchema,
        element: {
          type: 'object',
          description: 'The creative element to refine (HookCandidate, CreativeAngle, ScriptCandidate, or CreativeBrief)',
        },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['type', 'refined', 'refinementNote'],
      properties: {
        type: { type: 'string', enum: ['brief', 'hook', 'angle', 'script'] },
        refined: {
          type: 'object',
          description: 'The refined creative element (same schema as input element)',
        },
        refinementNote: stringSchema('What was changed and why'),
      },
    },
    execute: async (input: unknown) => {
      const { refineCreative } = await import('@/lib/creative/intelligence');
      return refineCreative(input as {
        type: 'brief' | 'hook' | 'angle' | 'script';
        instruction: string;
        brief: import('@/lib/creative/types').CreativeBrief;
        element: Record<string, unknown>;
      });
    },
  },
  {
    name: 'creative.remix',
    description:
      'Remix a reference ad for a new product (viral2viral flow). ' +
      'Takes a reference creative analysis and generates an original brief that ' +
      'adapts the reference\'s persuasive structure without copying it.',
    cost: CREATIVE_TOOL_COSTS.remix,
    capabilities: ['text', 'reasoning'],
    inputSchema: {
      type: 'object',
      required: ['analysis', 'product'],
      properties: {
        analysis: referenceAnalysisSchema,
        product: stringSchema('Product text or description for the new ad'),
        productName: stringSchema('Product name'),
        platform: stringSchema('Target platform'),
        format: stringSchema('Ad format'),
      },
    },
    outputSchema: briefSchema,
    execute: async (input: unknown) => {
      const { remixFromReference } = await import('@/lib/creative/intelligence');
      return remixFromReference(input as {
        analysis: import('@/lib/creative/types').ReferenceCreativeAnalysis;
        product: string;
        productName?: string;
        platform?: string;
        format?: string;
      });
    },
  },
  {
    name: 'creative.analyzeReference',
    description:
      'Analyze a reference video ad and extract its marketing structure: ' +
      'hook, narrative, pacing, persuasion mechanisms, and adaptation recommendations.',
    cost: CREATIVE_TOOL_COSTS.referenceAnalysis,
    capabilities: ['text', 'reasoning', 'vision'],
    inputSchema: {
      type: 'object',
      required: ['sourceUrl'],
      properties: {
        sourceUrl: stringSchema('URL of the reference video to analyze'),
        transcript: stringSchema('Optional transcript of the reference video'),
      },
    },
    outputSchema: referenceAnalysisSchema,
    execute: async (input: unknown) => {
      const { analyzeReferenceCreative } = await import('@/lib/creative/intelligence');
      const typed = input as { sourceUrl: string; transcript?: string };
      return analyzeReferenceCreative(typed.sourceUrl, typed.transcript);
    },
  },
];

// ── Register all tools ──

for (const tool of CREATIVE_TOOLS) {
  registerTool(tool);
}
