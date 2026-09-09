/**
 * Pre-build step: remove unused Prisma WASM query engines from
 * node_modules/@prisma/client/runtime/ BEFORE the OpenNext build runs.
 *
 * The OpenNext bundler copies @prisma/client/runtime/* into the server
 * bundle. If we only delete files after the build, the bundler has already
 * inlined the unused engines (cockroachdb, mysql, sqlserver, postgresql,
 * and the "small" variants) into handler.mjs, inflating it by ~25 MB.
 *
 * This script removes those engines from node_modules before the build so
 * the bundler never sees them.
 *
 * The project only uses SQLite (Cloudflare D1).
 */
import { readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('..', import.meta.url).pathname;

// Source node_modules locations to clean BEFORE the build
const prismaRuntimeDir = join(
  projectRoot,
  'node_modules',
  '@prisma',
  'client',
  'runtime',
);

const dotPrismaDir = join(projectRoot, 'node_modules', '.prisma', 'client');

// Database engines we DELETE (not used by this project — only sqlite/D1 is used)
const DELETE_ENGINES = ['cockroachdb', 'mysql', 'sqlserver', 'postgresql'];

// Prisma 7 ships both "fast" and "small" WASM engine variants.
// We only need "fast" — "small" is a fallback for constrained environments.
const DELETE_VARIANTS = ['small'];

let removedCount = 0;
let removedBytes = 0;

function removeEngineFiles(dir, engineName) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    // Match patterns like _cockroachdb., .cockroachdb., _small_bg., _small.
    if (entry.includes(`_${engineName}.`) || entry.includes(`.${engineName}.`) ||
        entry.includes(`_${engineName}_`) || entry.includes(`.${engineName}_`)) {
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        rmSync(fullPath, { recursive: true, force: true });
        removedCount++;
        removedBytes += stat.size;
        console.log(`  removed: ${entry} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
      } catch {
        // File may have already been removed
      }
    }
  }
}

console.log('Pre-build: trimming unused Prisma WASM engines from node_modules...');

for (const dir of [prismaRuntimeDir, dotPrismaDir]) {
  if (!existsSync(dir)) {
    console.log(`  skip (not found): ${dir}`);
    continue;
  }
  console.log(`  cleaning: ${dir}`);
  for (const engine of DELETE_ENGINES) {
    removeEngineFiles(dir, engine);
  }
  for (const variant of DELETE_VARIANTS) {
    removeEngineFiles(dir, variant);
  }
}

// Remove TypeScript declaration files (.d.ts) from .prisma/client — they're
// 14.5 MB and not needed at runtime.
if (existsSync(dotPrismaDir)) {
  const entries = readdirSync(dotPrismaDir);
  for (const entry of entries) {
    if (entry.endsWith('.d.ts')) {
      const fullPath = join(dotPrismaDir, entry);
      const stat = statSync(fullPath);
      rmSync(fullPath, { force: true });
      removedCount++;
      removedBytes += stat.size;
      console.log(`  removed .d.ts: ${entry} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
    }
  }
}

// Remove the base64-encoded WASM from .prisma/client — it's only referenced
// by index.js (not edge.js, which workerd uses). The actual .wasm file is kept.
const base64Wasm = join(dotPrismaDir, 'query_compiler_fast_bg.wasm-base64.js');
if (existsSync(base64Wasm)) {
  const stat = statSync(base64Wasm);
  rmSync(base64Wasm, { force: true });
  removedCount++;
  removedBytes += stat.size;
  console.log(`  removed: query_compiler_fast_bg.wasm-base64.js (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
}

// Remove index-browser.js (not used in workerd)
const indexBrowser = join(dotPrismaDir, 'index-browser.js');
if (existsSync(indexBrowser)) {
  const stat = statSync(indexBrowser);
  rmSync(indexBrowser, { force: true });
  removedCount++;
  removedBytes += stat.size;
  console.log(`  removed: index-browser.js (${(stat.size / 1024).toFixed(0)} KiB)`);
}

console.log(`\nDone: removed ${removedCount} files, freed ${(removedBytes / 1024 / 1024).toFixed(1)} MB`);
console.log('Kept engines: sqlite (for Cloudflare D1)');
