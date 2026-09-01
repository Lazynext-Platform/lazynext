/**
 * Post-bundle step: patch the wrangler-bundled worker.js to fix the
 * "Dynamic require of instrumentation.js is not supported" error.
 *
 * The Node.js middleware (proxy.ts) runtime calls getInstrumentationModule()
 * which tries to require("instrumentation.js"). In workerd, `require` is not
 * defined, so __require throws. The catch block checks for err.code ===
 * "MODULE_NOT_FOUND" but the thrown Error doesn't have that code.
 *
 * This script patches all __require functions in the bundled worker.js to
 * add the MODULE_NOT_FOUND error code so the catch block swallows the error.
 *
 * It also creates a wrangler.jsonc in the output directory so we can deploy
 * with --no-bundle (which preserves our patches).
 */
import { readFileSync, writeFileSync, existsSync, rmSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, '.open-next', 'dist');

// The wrangler dry-run outputs the bundled worker using the basename of
// the `main` entry from wrangler.jsonc. This is "worker-entry.js" when
// using the custom worker-entry.mjs wrapper, or "worker.js" otherwise.
// Find the actual bundled worker file dynamically.
const workerName = existsSync(join(distDir, 'worker-entry.js'))
  ? 'worker-entry.js'
  : 'worker.js';

if (!existsSync(join(distDir, workerName))) {
  console.error(`${workerName} not found in .open-next/dist/. Run wrangler deploy --dry-run first.`);
  process.exit(1);
}

// Patch all __require functions
const workerPath = join(distDir, workerName);
let content = readFileSync(workerPath, 'utf8');

const patches = [
  // With spaces (index.mjs style)
  [
    `throw Error('Dynamic require of "' + x + '" is not supported')`,
    `{const __e=new Error('Dynamic require of "' + x + '" is not supported');__e.code='MODULE_NOT_FOUND';throw __e}`,
  ],
  // Without spaces (esbuild minified style)
  [
    `throw Error('Dynamic require of "'+x+'" is not supported')`,
    `{const __e=new Error('Dynamic require of "'+x+'" is not supported');__e.code='MODULE_NOT_FOUND';throw __e}`,
  ],
];

let patchCount = 0;
for (const [old, neu] of patches) {
  const matches = content.split(old).length - 1;
  if (matches > 0) {
    content = content.split(old).join(neu);
    patchCount += matches;
  }
}

writeFileSync(workerPath, content);
console.log(`Patched ${patchCount} __require function(s) in ${workerName}`);

// Remove source map reference and .map file to reduce upload size
const mapFileName = `${workerName}.map`;
const mapPath = join(distDir, mapFileName);
if (existsSync(mapPath)) {
  rmSync(mapPath, { force: true });
  console.log(`Removed ${mapFileName} source map`);
}
// Strip sourceMappingURL comment from the worker
const mapCommentRegex = /\n\/\/# sourceMappingURL=.*$/;
if (mapCommentRegex.test(content)) {
  content = content.replace(mapCommentRegex, '');
  writeFileSync(workerPath, content);
  console.log(`Stripped sourceMappingURL comment from ${workerName}`);
}

// Minify the worker with esbuild to reduce the Cloudflare Worker bundle size.
// The wrangler dry-run outputs an unminified bundle (~55 MB). Esbuild minification
// reduces it to ~46 MB raw / ~8.5 MB gzipped, well under Cloudflare's 10 MiB limit.
try {
  const minifiedPath = join(distDir, `${workerName}.min`);
  execSync(`npx esbuild "${workerPath}" --minify --format=esm --outfile="${minifiedPath}"`, {
    stdio: 'pipe',
    timeout: 60_000,
  });
  if (existsSync(minifiedPath)) {
    rmSync(workerPath, { force: true });
    renameSync(minifiedPath, workerPath);
    console.log(`Minified ${workerName} with esbuild`);
  }
} catch (e) {
  console.log(`[warn] esbuild minification skipped: ${e instanceof Error ? e.message : String(e)}`);
}

// Create wrangler.jsonc in the dist directory
const projectWrangler = readFileSync(join(projectRoot, 'wrangler.jsonc'), 'utf8');
const distWrangler = projectWrangler
  .replace(/"main":\s*"[^"]*"/, `"main": "${workerName}"`)
  .replace(/"directory":\s*"[^"]*"/g, (match) => {
    if (match.includes('assets')) {
      return `"directory": "${join(projectRoot, '.open-next', 'assets').replace(/\\/g, '/')}"`;
    }
    return match;
  });

writeFileSync(join(distDir, 'wrangler.jsonc'), distWrangler);
console.log('Created wrangler.jsonc in .open-next/dist/');
