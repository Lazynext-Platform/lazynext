/**
 * Pre-build step: remove unused Prisma WASM engines from node_modules BEFORE
 * the OpenNext/esbuild build bundles them into handler.mjs.
 *
 * This is necessary because the post-build trim (trim-prisma-wasm.mjs) runs
 * AFTER esbuild has already bundled everything into handler.mjs, so deleting
 * files from node_modules at that point has no effect on the bundle size.
 *
 * For Cloudflare (D1), only the sqlite engine is needed. Removing postgresql,
 * mysql, sqlserver, and cockroachdb engines before the build reduces the
 * bundled handler.mjs by ~8 MB.
 */
import { readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('..', import.meta.url).pathname;
const prismaRuntimeDir = join(
  projectRoot,
  'node_modules',
  '@prisma',
  'client',
  'runtime',
);

const isCloudflareBuild = process.env.DEPLOY_TARGET !== 'vercel';

// Database engines to delete (not used by this project)
const DELETE_ENGINES = isCloudflareBuild
  ? ['cockroachdb', 'mysql', 'sqlserver', 'postgresql']
  : ['cockroachdb', 'mysql', 'sqlserver'];

// Prisma 7 "small" engine variants — we only need "fast"
const DELETE_VARIANTS = ['small'];

let removedCount = 0;
let removedBytes = 0;

function removeEngineFiles(dir, engineName) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry.includes(`_${engineName}.`) || entry.includes(`.${engineName}.`) ||
        entry.includes(`_${engineName}_`) || entry.includes(`.${engineName}_`)) {
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        rmSync(fullPath, { recursive: true, force: true });
        removedCount++;
        removedBytes += stat.size;
        console.log(`  pre-trim removed: ${entry} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
      } catch {}
    }
  }
}

console.log(`Pre-trimming unused Prisma WASM engines from node_modules (target: ${isCloudflareBuild ? 'cloudflare' : 'vercel'})...`);

for (const engine of DELETE_ENGINES) {
  removeEngineFiles(prismaRuntimeDir, engine);
}
for (const variant of DELETE_VARIANTS) {
  removeEngineFiles(prismaRuntimeDir, variant);
}

console.log(`\nDone: removed ${removedCount} files, freed ${(removedBytes / 1024 / 1024).toFixed(1)} MB`);
