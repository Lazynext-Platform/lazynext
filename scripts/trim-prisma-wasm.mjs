/**
 * Post-build step: remove unused Prisma WASM query engines from the
 * OpenNext server-functions bundle to reduce the Cloudflare Worker size.
 *
 * The project only uses SQLite (D1) and PostgreSQL (Neon). Prisma's client
 * runtime includes WASM engines for ALL database types (CockroachDB, MySQL,
 * SQLServer) which are never loaded but inflate the bundle by ~25MB,
 * pushing the Worker past Cloudflare's compressed size limit and causing
 * intermittent 503 "Worker exceeded resource limits" errors.
 *
 * This script runs after `opennextjs-cloudflare build` and before
 * `opennextjs-cloudflare deploy` to delete the unused engine files.
 */
import { readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('..', import.meta.url).pathname;
const prismaRuntimeDir = join(
  projectRoot,
  '.open-next',
  'server-functions',
  'default',
  'node_modules',
  '@prisma',
  'client',
  'runtime',
);

const dotPrismaDir = join(
  projectRoot,
  '.open-next',
  'server-functions',
  'default',
  'node_modules',
  '.prisma',
  'client',
);

// Database engines we KEEP (used by this project)
const KEEP_ENGINES = new Set(['sqlite', 'postgresql']);

// Database engines we DELETE (not used by this project)
const DELETE_ENGINES = ['cockroachdb', 'mysql', 'sqlserver'];

let removedCount = 0;
let removedBytes = 0;

function removeEngineFiles(dir, engineName) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry.includes(`_${engineName}.`) || entry.includes(`.${engineName}.`)) {
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

console.log('Trimming unused Prisma WASM engines from OpenNext bundle...');

for (const engine of DELETE_ENGINES) {
  removeEngineFiles(prismaRuntimeDir, engine);
}

// Also clean .prisma/client directory if it exists
if (existsSync(dotPrismaDir)) {
  for (const engine of DELETE_ENGINES) {
    removeEngineFiles(dotPrismaDir, engine);
  }
}

console.log(`\nDone: removed ${removedCount} files, freed ${(removedBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`Kept engines: ${[...KEEP_ENGINES].join(', ')}`);
