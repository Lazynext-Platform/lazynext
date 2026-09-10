#!/usr/bin/env node
/**
 * Consolidates ALL API route families into catch-all routes.
 *
 * For each top-level directory under src/app/api (e.g., disaster-recovery, email, etc.),
 * this script:
 * 1. Moves all route.ts files to handler modules in src/lib/api-handlers/<family>/
 * 2. Creates an optional catch-all route src/app/api/<family>/[[...path]]/route.ts
 * 3. The catch-all route dispatches to the appropriate handler based on path matching
 *
 * This reduces ~3,000+ route entry points to ~200 catch-all routes,
 * dramatically reducing Next.js per-route bundle overhead.
 *
 * Skips: creative (already consolidated), auth (special NextAuth handling)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync, mkdirSync, rmdirSync } from 'fs';
import { join, dirname, relative } from 'path';

const ROOT = join(import.meta.dirname, '..');
const API_DIR = join(ROOT, 'src/app/api');
const HANDLERS_DIR = join(ROOT, 'src/lib/api-handlers');

// Families to skip (already consolidated or special handling)
const SKIP_FAMILIES = new Set([
  'creative', // already consolidated with [tool] route
  'auth',     // NextAuth special handling
]);

// Get all top-level route family directories
const families = readdirSync(API_DIR).filter(name => {
  const fullPath = join(API_DIR, name);
  return statSync(fullPath).isDirectory() && !SKIP_FAMILIES.has(name);
});

console.log(`\n=== Route Consolidation: ${families.length} families ===\n`);

let totalRoutesMoved = 0;
let totalCatchAllsCreated = 0;
const familyStats = [];

for (const family of families.sort()) {
  const familyDir = join(API_DIR, family);
  
  // Find all route.ts files in this family
  const routeFiles = [];
  function findRoutes(dir, relPath = '') {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relEntry = relPath ? `${relPath}/${entry}` : entry;
      if (statSync(fullPath).isDirectory()) {
        findRoutes(fullPath, relEntry);
      } else if (entry === 'route.ts') {
        routeFiles.push({ fullPath, relPath: relPath || '' });
      }
    }
  }
  findRoutes(familyDir);
  
  if (routeFiles.length === 0) {
    continue;
  }
  
  // Skip if there's already a [[...path]] optional catch-all
  if (existsSync(join(familyDir, '[[...path]]'))) {
    console.log(`SKIP: ${family} - already has [[...path]] catch-all`);
    continue;
  }
  
  // Skip if there's only 1 route (no benefit from consolidation)
  if (routeFiles.length <= 1) {
    continue;
  }
  
  console.log(`Processing: ${family} (${routeFiles.length} routes)`);
  
  // Create handler directory
  const handlerDir = join(HANDLERS_DIR, family);
  mkdirSync(handlerDir, { recursive: true });
  
  // For each route file, move it to a handler module
  const routeEntries = [];
  
  for (const { fullPath, relPath } of routeFiles) {
    // Determine the path pattern segments
    // relPath is like "" or "plans" or "plans/[id]/activate" or "[id]"
    const segments = relPath ? relPath.split('/') : [];
    
    // Create a valid module name from the path
    const moduleName = segments.length === 0 ? 'index' : segments.map(s => {
      if (s.startsWith('[') && s.endsWith(']')) {
        return '_' + s.slice(1, -1).replace(/\./g, '_');
      }
      return s.replace(/-/g, '_');
    }).join('__');
    
    // Read the route file content
    const content = readFileSync(fullPath, 'utf8');
    
    // Determine which HTTP methods are exported
    const methods = [];
    if (content.includes('export async function GET') || content.includes('export const GET')) methods.push('GET');
    if (content.includes('export async function POST') || content.includes('export const POST')) methods.push('POST');
    if (content.includes('export async function PUT') || content.includes('export const PUT')) methods.push('PUT');
    if (content.includes('export async function PATCH') || content.includes('export const PATCH')) methods.push('PATCH');
    if (content.includes('export async function DELETE') || content.includes('export const DELETE')) methods.push('DELETE');
    if (content.includes('export async function HEAD') || content.includes('export const HEAD')) methods.push('HEAD');
    if (content.includes('export async function OPTIONS') || content.includes('export const OPTIONS')) methods.push('OPTIONS');
    
    // Determine which segments are dynamic
    const paramNames = segments
      .filter(s => s.startsWith('[') && s.endsWith(']'))
      .map(s => s.slice(1, -1).replace(/\./g, '_'));
    
    // Write the handler module
    const handlerPath = join(handlerDir, `${moduleName}.ts`);
    
    // The handler module is the original route file, but we need to modify the params
    // The original uses { params }: { params: Promise<{...}> }
    // We need to change it to accept a plain params object
    let handlerContent = content;
    
    // Replace params Promise type with plain object
    // Pattern: { params }: { params: Promise<{ id: string }> }
    // Replace with: { params }: { params: { id: string } }
    handlerContent = handlerContent.replace(
      /\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*Promise<([^>]+)>\s*\}/g,
      '{ params }: { params: $1 }'
    );
    
    // Replace `await params` with just `params` (since it's no longer a Promise)
    // But only when params is the Next.js route params, not other Promises
    // We need to be careful here. Let's only replace `const { ... } = await params;`
    handlerContent = handlerContent.replace(
      /const\s*\{([^}]+)\}\s*=\s*await\s+params\s*;/g,
      'const {$1} = params;'
    );
    
    writeFileSync(handlerPath, handlerContent);
    
    routeEntries.push({
      moduleName,
      segments,
      methods,
      paramNames,
      hasParams: paramNames.length > 0,
    });
    
    // Delete the original route file
    unlinkSync(fullPath);
    
    // Try to clean up empty directories (but not the family dir itself, since we'll create [...path] in it)
    let dir = dirname(fullPath);
    while (dir !== familyDir && dir.startsWith(familyDir)) {
      try {
        const remaining = readdirSync(dir);
        if (remaining.length === 0) {
          rmdirSync(dir);
          dir = dirname(dir);
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  }
  
  totalRoutesMoved += routeFiles.length;
  
  // Generate the catch-all route
  // Sort routes so that static segments come before dynamic ones (for matching priority)
  const sortedRoutes = [...routeEntries].sort((a, b) => {
    // Routes with fewer dynamic segments come first
    const aDynamic = a.paramNames.length;
    const bDynamic = b.paramNames.length;
    if (aDynamic !== bDynamic) return aDynamic - bDynamic;
    // Routes with more segments come first (more specific)
    return b.segments.length - a.segments.length;
  });
  
  // Generate imports
  const imports = sortedRoutes.map(r => 
    `import * as ${r.moduleName} from '@/lib/api-handlers/${family}/${r.moduleName}';`
  ).join('\n');
  
  // Generate route table
  const routeTable = sortedRoutes.map(r => {
    const segmentsStr = JSON.stringify(r.segments);
    const paramNamesStr = JSON.stringify(r.paramNames);
    const methodHandlers = r.methods.map(m => 
      `${m}: ${r.moduleName}.${m}`
    ).join(', ');
    return `  { segments: ${segmentsStr}, paramNames: ${paramNamesStr}, handlers: { ${methodHandlers} } },`;
  }).join('\n');
  
  const catchAllCode = `/**
 * AUTO-GENERATED by scripts/consolidate-all-routes.mjs
 * Catch-all route handler for /api/${family}/*
 * Consolidates ${routeFiles.length} routes into a single entry point.
 */
import { NextRequest, NextResponse } from 'next/server';
${imports}

interface RouteEntry {
  segments: string[];
  paramNames: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlers: Record<string, (req: NextRequest, ctx?: { params: Record<string, string> }) => any>;
}

const routes: RouteEntry[] = [
${routeTable}
];

function matchRoute(pathSegments: string[]): { route: RouteEntry; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.segments.length !== pathSegments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < route.segments.length; i++) {
      const pattern = route.segments[i];
      const actual = pathSegments[i];
      if (pattern.startsWith('[') && pattern.endsWith(']')) {
        // Dynamic segment - extract param
        const paramName = pattern.slice(1, -1).replace(/\\./g, '_');
        params[paramName] = actual;
      } else if (pattern !== actual) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return null;
}

async function dispatch(
  req: NextRequest,
  method: string,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  const match = matchRoute(path);
  if (!match) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const handler = match.route.handlers[method];
  if (!handler) {
    return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
  }
  const ctx = match.route.paramNames.length > 0 ? { params: match.params } : undefined;
  return handler(req, ctx);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, 'GET', ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, 'POST', ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, 'PUT', ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, 'PATCH', ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, 'DELETE', ctx);
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, 'HEAD', ctx);
}

export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, 'OPTIONS', ctx);
}
`;
  
  // Write the catch-all route
  const catchAllDir = join(familyDir, '[[...path]]');
  mkdirSync(catchAllDir, { recursive: true });
  writeFileSync(join(catchAllDir, 'route.ts'), catchAllCode);
  
  totalCatchAllsCreated++;
  familyStats.push({ family, routes: routeFiles.length });
}

console.log(`\n=== Consolidation Complete ===`);
console.log(`Families processed: ${familyStats.length}`);
console.log(`Routes moved: ${totalRoutesMoved}`);
console.log(`Catch-all routes created: ${totalCatchAllsCreated}`);
console.log(`\nFamily breakdown:`);
for (const { family, routes } of familyStats.sort((a, b) => b.routes - a.routes)) {
  console.log(`  ${family}: ${routes} routes`);
}
