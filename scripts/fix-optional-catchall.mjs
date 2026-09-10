#!/usr/bin/env node
/**
 * Converts all [...path] catch-all routes to [[...path]] optional catch-all
 * so that base paths (e.g. /api/accounting) resolve to the index handler
 * instead of returning 404.
 *
 * Also patches the generated route.ts to default `path` to [] when undefined
 * (optional catch-all yields undefined for the base path).
 */
import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const apiDir = join(process.cwd(), 'src/app/api');
const families = readdirSync(apiDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let converted = 0;
let skipped = 0;

for (const family of families) {
  const familyDir = join(apiDir, family);
  const requiredCatchAll = join(familyDir, '[...path]');
  const optionalCatchAll = join(familyDir, '[[...path]]');

  if (!existsSync(requiredCatchAll)) {
    skipped++;
    continue;
  }

  // If optional catch-all already exists, skip (don't overwrite)
  if (existsSync(optionalCatchAll)) {
    console.log(`SKIP: ${family} - [[...path]] already exists`);
    skipped++;
    continue;
  }

  const routeFile = join(requiredCatchAll, 'route.ts');
  if (!existsSync(routeFile)) {
    console.log(`SKIP: ${family} - no route.ts in [...path]`);
    skipped++;
    continue;
  }

  let code = readFileSync(routeFile, 'utf8');

  // Patch the dispatch function to default path to [] when undefined.
  // Optional catch-all params.path is string[] | undefined.
  code = code.replace(
    /const \{ path \} = await params;/g,
    'const { path = [] } = await params;',
  );

  // Patch the type annotations: { path: string[] } -> { path?: string[] }
  code = code.replace(
    /\{ params: Promise<\{ path: string\[\] \}> \}/g,
    '{ params: Promise<{ path?: string[] }> }',
  );

  writeFileSync(routeFile, code);

  // Rename the directory: [...path] -> [[...path]]
  renameSync(requiredCatchAll, optionalCatchAll);

  converted++;
}

console.log(`\n=== Conversion Complete ===`);
console.log(`Converted: ${converted}`);
console.log(`Skipped: ${skipped}`);
