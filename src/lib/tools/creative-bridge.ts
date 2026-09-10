/**
 * Creative Tool Bridge
 *
 * Bridges creative tools from the creative tool registry (`src/lib/creative/tools.ts`)
 * into the OS AgentRuntime so OS agents (especially growth/design roles) can invoke
 * creative capabilities as standard OS tools.
 *
 * Each creative tool is registered with the AgentRuntime's tool executor registry
 * via `registerToolExecutor`, wrapping the creative tool's `execute` function so it
 * can be called by the standard tool execution pipeline.
 *
 * Tool names keep their `creative.` prefix (e.g. `creative.generateBrief`), which
 * matches the OS tool naming convention.
 *
 * Only safe tools are bridged — generation and analysis tools. Publishing and ad
 * platform mutation tools stay high-risk/manual and are NOT registered here.
 */
import {
  listTools,
  type CreativeTool,
  type ToolContext as CreativeToolContext,
} from '@/lib/creative/tools';
import {
  registerToolExecutor,
  unregisterToolExecutor,
  type ToolExecutionContext,
} from '@/lib/services/agent-runtime';
import type { JsonSchema } from '@/lib/creative/tools';

// ── Types ──

export interface CreativeBridgeToolDef {
  /** OS tool name (with `creative.` prefix). */
  name: string;
  /** Human-readable description. */
  description: string;
  /** Tool category — always 'creative' for bridged tools. */
  category: 'creative';
  /** Risk category — 'low' for most creative tools. */
  riskCategory: 'low' | 'medium';
  /** Input schema (from the creative tool's inputSchema). */
  inputSchema: JsonSchema;
  /** Budget category — creative tools consume credits. */
  budgetCategory: 'credits';
  /** Timeout in seconds. */
  timeoutSec: number;
  /** Allowed agent roles. */
  allowedRoles: string[];
}

// ── Config ──

/**
 * Creative tool names that are NOT safe for autonomous agent use.
 * These include publishing, ad platform mutations, and other high-risk operations.
 * They stay manual/high-risk and are excluded from the bridge.
 */
const EXCLUDED_TOOL_PATTERNS: string[] = [
  'creative.publish',
  'creative.launchCampaign',
  'creative.launch_campaign',
  'creative.createAd',
  'creative.updateAd',
  'creative.deleteAd',
];

/** Default timeout for creative tools (seconds). */
const DEFAULT_TIMEOUT_SEC = 60;

/** Roles allowed to use bridged creative tools. */
const ALLOWED_ROLES = ['growth', 'design', '*'];

// ── State ──

/** Tracks the creative tool names currently registered via the bridge. */
const registeredNames: Set<string> = new Set();

// ── Helpers ──

/**
 * Determine whether a creative tool is safe for agent use.
 * Excludes publishing, ad platform mutations, and other high-risk operations.
 */
function isSafeForAgentUse(tool: CreativeTool): boolean {
  for (const pattern of EXCLUDED_TOOL_PATTERNS) {
    if (tool.name === pattern || tool.name.startsWith(pattern + '.')) {
      return false;
    }
  }
  return true;
}

/**
 * Convert a creative ToolContext from an OS ToolExecutionContext.
 */
function toCreativeContext(ctx: ToolExecutionContext): CreativeToolContext {
  return {
    userId: ctx.userId,
    metadata: {
      workspaceId: ctx.workspaceId,
      organizationId: ctx.organizationId,
      agentRunId: ctx.agentRunId,
    },
  };
}

// ── Bridge API ──

/**
 * Register selected creative tools from the creative tool registry into the OS
 * AgentRuntime as OS tools. Wraps each creative tool's execute function so it
 * can be called by the standard tool execution pipeline.
 *
 * Only safe tools (generation, analysis) are registered — publishing and ad
 * platform mutation tools are excluded.
 *
 * This is idempotent: calling it multiple times will not duplicate registrations.
 */
export function registerCreativeTools(): string[] {
  const tools = listTools();
  const newlyRegistered: string[] = [];

  for (const tool of tools) {
    // Skip if already registered by the bridge
    if (registeredNames.has(tool.name)) continue;

    // Skip unsafe tools
    if (!isSafeForAgentUse(tool)) continue;

    // Skip tools without an execute function
    if (!tool.execute) continue;

    // Wrap the creative tool's execute function for the OS runtime
    const wrappedExecutor = async (
      input: Record<string, unknown>,
      ctx: ToolExecutionContext,
    ): Promise<Record<string, unknown>> => {
      try {
        const creativeCtx = toCreativeContext(ctx);
        const output = await tool.execute!(input, creativeCtx);
        return {
          tool: tool.name,
          ok: true,
          output,
          cost: tool.cost,
        } as Record<string, unknown>;
      } catch (e) {
        return {
          tool: tool.name,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          cost: 0,
        };
      }
    };

    registerToolExecutor(tool.name, wrappedExecutor);
    registeredNames.add(tool.name);
    newlyRegistered.push(tool.name);
  }

  return newlyRegistered;
}

/**
 * Return the list of creative tool names registered by the bridge.
 */
export function getCreativeToolNames(): string[] {
  return Array.from(registeredNames).sort();
}

/**
 * Return the tool definition metadata for all bridged creative tools.
 * This can be used to seed ToolDef records in the database.
 */
export function getCreativeToolDefs(): CreativeBridgeToolDef[] {
  const tools = listTools();
  const defs: CreativeBridgeToolDef[] = [];

  for (const tool of tools) {
    if (!isSafeForAgentUse(tool)) continue;
    if (!registeredNames.has(tool.name)) continue;

    defs.push({
      name: tool.name,
      description: tool.description,
      category: 'creative',
      riskCategory: 'low',
      inputSchema: tool.inputSchema,
      budgetCategory: 'credits',
      timeoutSec: DEFAULT_TIMEOUT_SEC,
      allowedRoles: [...ALLOWED_ROLES],
    });
  }

  return defs;
}

/**
 * Unregister all creative tools that were registered by the bridge.
 * Useful for testing and cleanup.
 */
export function unregisterCreativeTools(): void {
  for (const name of registeredNames) {
    unregisterToolExecutor(name);
  }
  registeredNames.clear();
}
