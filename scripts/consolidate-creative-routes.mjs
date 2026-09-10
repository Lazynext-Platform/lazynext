#!/usr/bin/env node
/**
 * Consolidates simple creative API routes into a single dynamic route.
 *
 * Routes that follow the standard pattern (import from individual library,
 * GET returns schema, POST authenticates + deducts credits + calls generate)
 * are consolidated into /api/creative/[tool]/route.ts with a registry.
 *
 * Routes with sub-paths or non-standard patterns are kept as-is.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = join(import.meta.dirname, '..');
const CREATIVE_API_DIR = join(ROOT, 'src/app/api/creative');
const CREATIVE_LIB_DIR = join(ROOT, 'src/lib/creative');

// Get all simple creative route directories (no sub-paths)
const allDirs = readdirSync(CREATIVE_API_DIR).filter(name => {
  const fullPath = join(CREATIVE_API_DIR, name);
  return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'route.ts'));
});

// Routes to KEEP (have sub-paths or non-standard patterns)
const keepRoutes = new Set([
  'ab-test', // has /plan and /results sub-routes
  'approvals', // has /stages sub-route
  'audio-studio', // has /tts, /voices, /music, /mix sub-routes
  'comments', // has /stream sub-route
  'compliance', // has /rules sub-route
  'pipeline', // has /[id] and /templates sub-routes
  'reference-analysis', // has /deep sub-route
  'share', // has /[token] sub-route
  'skills', // has /list and /chain sub-routes
  'tools', // has /execute sub-route
  'variant-matrix', // has /[id] and /analyze sub-routes
  // Complex routes that use different patterns (not individual library)
  'brief', // uses intelligence.ts
  'script', // uses intelligence.ts
  'storyboard', // uses intelligence.ts
  'director', // NDJSON streaming
  'refine', // uses intelligence.ts
  'remix', // uses intelligence.ts
  'variants', // uses intelligence.ts
  'performance', // uses intelligence.ts
  'score', // uses intelligence.ts
  'hooks', // uses intelligence.ts
  'angles', // uses intelligence.ts
  'templates', // uses intelligence.ts
  'assets', // file upload handling
  'brief-assistant', // uses intelligence.ts
  'brief-intelligence', // uses intelligence.ts
  'clip-editor', // editor integration
  'media-service-boundary', // service boundary
  'mcp-server', // MCP server
  'ugc', // may have different pattern
  'export', // file export
  'regenerate', // may have different pattern
  'diff', // diff comparison
  'inspiration', // may have different pattern
  'leaderboard', // may have different pattern
  'ml-insights', // may have different pattern
  'autonomous-pipeline', // complex pipeline
  'ab-automation', // complex automation
  'workflow-templates', // template management
  'calendar', // may use different pattern
  'schedule', // may use different pattern
  'optimal-times', // may use different pattern
  'personas', // may use different pattern
  'trend-intelligence', // may use different pattern
  'intelligence', // may use different pattern
  'competitor-intel', // may use different pattern
  'audience-insights', // may use different pattern
  'testing-lab', // may use different pattern
  'forecast', // may use different pattern
  'forecasting', // may use different pattern
  'fatigue', // may use different pattern
  'quality-scoring', // may use different pattern
  'shot-planner', // may use different pattern
  'scene-analysis', // may use different pattern
  'campaign-orchestrator', // may use different pattern
  'product-image', // may use different pattern
  'narrative', // may use different pattern
  'viral-analysis', // may use different pattern
  'creator-kits', // may use different pattern
  'brand-concepts', // may use different pattern
  'brand-check', // may use different pattern
  'brand-voice', // may use different pattern
  'repurposing', // may use different pattern
  'concept-expander', // may use different pattern
  'auto-variants', // may use different pattern
  'adapt-platform', // may use different pattern
  'url-to-brief', // may use different pattern
  'product-brief', // may use different pattern
  'reference-remix', // may use different pattern
  'multi-concept', // may use different pattern
  'performance-loop', // may use different pattern
  'skill-chain-builder', // may use different pattern
  'brand-guardrails', // may use different pattern
  'smart-calendar', // may use different pattern
  'competitor-watch', // may use different pattern
  'hook-library', // may use different pattern
  'hook-tester', // may use different pattern
  'trend-spotter', // may use different pattern
  'brief-analyzer', // may use different pattern
  'brief-template-builder', // may use different pattern
]);

// Routes to consolidate (standard pattern: individual library with CREDIT_COST + generate + validate)
const consolidatable = allDirs.filter(name => !keepRoutes.has(name));

console.log(`\n=== Consolidation Plan ===`);
console.log(`Total simple creative route dirs: ${allDirs.length}`);
console.log(`Routes to keep separate: ${keepRoutes.size}`);
console.log(`Routes to consolidate: ${consolidatable.length}`);
console.log(`Consolidatable routes: ${consolidatable.join(', ')}\n`);

// For each consolidatable route, extract the key info from the route file
const registry = [];

for (const toolName of consolidatable) {
  const routeFile = join(CREATIVE_API_DIR, toolName, 'route.ts');
  const routeContent = readFileSync(routeFile, 'utf8');

  // Extract library import path
  const libImportMatch = routeContent.match(/from\s+'@\/lib\/creative\/([^']+)'/);
  if (!libImportMatch) {
    console.log(`SKIP: ${toolName} - no @/lib/creative/ import found`);
    continue;
  }

  const libPath = libImportMatch[1];

  // Extract credit cost constant name
  const creditCostMatch = routeContent.match(/([A-Z_]+_CREDIT_COST|[A-Z_]+_COST)\b/);
  const creditCostName = creditCostMatch ? creditCostMatch[1] : null;

  // Extract generate function name
  const generateMatch = routeContent.match(/\b(generate[A-Za-z]+)\b/);
  const generateName = generateMatch ? generateMatch[1] : null;

  // Extract validate function name
  const validateMatch = routeContent.match(/\b(validate[A-Za-z]+)\b/);
  const validateName = validateMatch ? validateMatch[1] : null;

  // Extract input type name
  const inputTypeMatch = routeContent.match(/type\s+([A-Za-z]+Input)\b/);
  const inputTypeName = inputTypeMatch ? inputTypeMatch[1] : null;

  // Check if the route has the standard pattern (GET + POST with withAtlas)
  const hasWithAtlas = routeContent.includes('withAtlas');
  const hasGET = routeContent.includes('export async function GET');
  const hasPOST = routeContent.includes('export const POST');

  if (!hasWithAtlas || !hasGET || !hasPOST) {
    console.log(`SKIP: ${toolName} - non-standard pattern (withAtlas=${hasWithAtlas}, GET=${hasGET}, POST=${hasPOST})`);
    continue;
  }

  // Extract the GET handler body (returns schema info)
  const getMatch = routeContent.match(/export async function GET\(\)\s*\{([\s\S]*?)\n\}/);
  const getBody = getMatch ? getMatch[1].trim() : '';

  // Extract the credit cost value from the library file
  const libFile = join(CREATIVE_LIB_DIR, `${libPath}.ts`);
  let creditCostValue = null;
  if (existsSync(libFile)) {
    const libContent = readFileSync(libFile, 'utf8');
    if (creditCostName) {
      // Match: export const FOO_CREDIT_COST = 3; or export const FOO_COST = 3;
      const costMatch = libContent.match(new RegExp(`export\\s+const\\s+${creditCostName}\\s*=\\s*(\\d+)`));
      if (costMatch) {
        creditCostValue = parseInt(costMatch[1], 10);
      }
    }
  }

  registry.push({
    toolName,
    libPath,
    creditCostName,
    creditCostValue,
    generateName,
    validateName,
    inputTypeName,
    getBody,
  });

  console.log(`OK: ${toolName} -> lib=${libPath}, cost=${creditCostName}=${creditCostValue}, gen=${generateName}, val=${validateName}`);
}

console.log(`\n=== Registry: ${registry.length} routes to consolidate ===\n`);

if (registry.length === 0) {
  console.log('No routes to consolidate. Exiting.');
  process.exit(0);
}

// Generate the registry file
const registryCode = `/**
 * AUTO-GENERATED by scripts/consolidate-creative-routes.mjs
 * Registry of consolidatable creative tools. Each entry maps a tool name
 * (URL path segment) to its library function, credit cost, and validators.
 *
 * This registry is used by /api/creative/[tool]/route.ts to dispatch requests
 * to the appropriate creative tool without requiring individual route files.
 */
import type { PlanTier } from '@/lib/plan-tier';

export interface CreativeToolEntry {
  toolName: string;
  creditCost: number;
  generate: (input: unknown, planTier: PlanTier) => Promise<unknown>;
  validate: (input: unknown) => { valid: boolean; errors: string[] };
  schema: Record<string, unknown>;
  maxDuration: number;
}

// Lazy-loaded tool registry — imports are deferred until first request for a tool.
// This allows tree-shaking to remove unused tools if needed.
const toolLoaders: Record<string, () => Promise<CreativeToolEntry>> = {
${registry.map(entry => {
  const libImport = `@/lib/creative/${entry.libPath}`;
  return `  '${entry.toolName}': async () => {
    const {
      ${entry.creditCostName || 'CREDIT_COST'},
      ${entry.generateName || 'generate'},
      ${entry.validateName || 'validate'},
    } = await import('${libImport}');
    return {
      toolName: '${entry.toolName}',
      creditCost: ${entry.creditCostName || 'CREDIT_COST'},
      generate: ${entry.generateName || 'generate'},
      validate: ${entry.validateName || 'validate'},
      schema: {},
      maxDuration: 60,
    };
  },`;
}).join('\n')}
};

const toolCache = new Map<string, CreativeToolEntry>();

export async function getTool(name: string): Promise<CreativeToolEntry | null> {
  if (toolCache.has(name)) return toolCache.get(name)!;
  const loader = toolLoaders[name];
  if (!loader) return null;
  const entry = await loader();
  toolCache.set(name, entry);
  return entry;
}

export function listToolNames(): string[] {
  return Object.keys(toolLoaders);
}
`;

const registryPath = join(ROOT, 'src/lib/creative/tool-registry.ts');
writeFileSync(registryPath, registryCode);
console.log(`Written: ${registryPath}`);

// Generate the dynamic route
const routeCode = `/**
 * AUTO-GENERATED by scripts/consolidate-creative-routes.mjs
 * Dynamic route handler for consolidated creative tools.
 * Replaces ${registry.length} individual route files with a single dynamic route.
 *
 * URL pattern: /api/creative/[tool] (e.g., /api/creative/ad-caption-generator)
 */
import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeAtlasError } from '@/lib/security';
import { getTool, listToolNames } from '@/lib/creative/tool-registry';

export const maxDuration = 60;

/**
 * GET /api/creative/[tool]
 * Returns the credit cost and tool info.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tool: string }> },
) {
  const { tool } = await params;
  const entry = await getTool(tool);
  if (!entry) {
    return NextResponse.json({ error: 'not_found', detail: \`Tool '\${tool}' not found\` }, { status: 404 });
  }
  return NextResponse.json({
    feature: entry.toolName,
    creditCost: entry.creditCost,
    schema: entry.schema,
  });
}

/**
 * GET /api/creative (list all available tools)
 */
export async function getList() {
  return NextResponse.json({ tools: listToolNames() });
}

async function __byokPOST(
  req: Request,
  { params }: { params: Promise<{ tool: string }> },
) {
  const { tool } = await params;
  const entry = await getTool(tool);
  if (!entry) {
    return NextResponse.json({ error: 'not_found', detail: \`Tool '\${tool}' not found\` }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const validation = entry.validate(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = entry.creditCost;

  try {
    await deductCredits(uid, cost, \`creative:\${tool}\`);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS'
            ? 'insufficient_credits'
            : 'charge_failed',
      },
      { status: 402 },
    );
  }

  try {
    const result = await entry.generate(body, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, \`creative:\${tool}\`).catch(() => {});
    const { error, status } = safeAtlasError(e, \`creative/\${tool}\`, 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
`;

const routeDir = join(CREATIVE_API_DIR, '[tool]');
const routePath = join(routeDir, 'route.ts');

// Check if there's already a [tool] directory (unlikely but be safe)
if (existsSync(routePath)) {
  console.log(`WARNING: ${routePath} already exists!`);
} else {
  // Create the directory and write the route file
  const { mkdirSync } = await import('fs');
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(routePath, routeCode);
  console.log(`Written: ${routePath}`);
}

// Delete the individual route files
let deletedCount = 0;
for (const entry of registry) {
  const routeFile = join(CREATIVE_API_DIR, entry.toolName, 'route.ts');
  if (existsSync(routeFile)) {
    unlinkSync(routeFile);
    // Try to remove the empty directory
    try {
      rmdirSync(join(CREATIVE_API_DIR, entry.toolName));
    } catch {
      // Directory may not be empty (e.g., has sub-routes)
    }
    deletedCount++;
  }
}

console.log(`\nDeleted ${deletedCount} individual route files`);
console.log(`\n=== Consolidation Complete ===`);
console.log(`Created: src/lib/creative/tool-registry.ts`);
console.log(`Created: src/app/api/creative/[tool]/route.ts`);
console.log(`Deleted: ${deletedCount} individual route files`);
console.log(`Remaining: ${keepRoutes.size} routes kept as separate files`);
