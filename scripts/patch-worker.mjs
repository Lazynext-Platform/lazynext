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
import { readFileSync, writeFileSync, existsSync, rmSync, renameSync, readdirSync, statSync } from 'node:fs';
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
// The wrangler --dry-run --minify flag should already minify the bundle.
// We only run esbuild if the file is still too large (> 64 MiB) after wrangler's minification.
// We use aggressive options: drop console/debugger, target es2022, pure console functions.
// IMPORTANT: The size check must account for the Prisma WASM module that will be
// attached to the worker at deploy time. The WASM is ~3.2 MB, so we minify if
// (worker JS + WASM) would exceed the 64 MiB limit.
const CLOUDFLARE_LIMIT_BYTES = 64 * 1024 * 1024; // 64 MiB
const currentSize = existsSync(workerPath) ? statSync(workerPath).size : 0;
// Calculate WASM size from the dist directory
let wasmSize = 0;
if (existsSync(distDir)) {
  for (const entry of readdirSync(distDir)) {
    if (entry.endsWith('.wasm') && entry.includes('query_compiler')) {
      wasmSize += statSync(join(distDir, entry)).size;
    }
  }
}
const totalSize = currentSize + wasmSize;
if (totalSize > CLOUDFLARE_LIMIT_BYTES) {
  console.log(`Worker is ${(currentSize / 1024 / 1024).toFixed(1)} MB + WASM ${(wasmSize / 1024 / 1024).toFixed(1)} MB = ${(totalSize / 1024 / 1024).toFixed(1)} MB (> 64 MiB), running esbuild minification...`);
  try {
    const minifiedPath = join(distDir, `${workerName}.min`);
    execSync(
      `npx esbuild "${workerPath}" --minify --format=esm --target=es2022 ` +
      `--drop:console --drop:debugger ` +
      `--pure:console.log --pure:console.info --pure:console.warn --pure:console.error --pure:console.debug --pure:console.trace ` +
      `--legal-comments=none --charset=ascii --tree-shaking=true ` +
      `--define:process.env.NODE_ENV='"production"' ` +
      `--metafile="${join(distDir, 'metafile.json')}" ` +
      `--outfile="${minifiedPath}"`,
      {
        stdio: 'pipe',
        timeout: 120_000,
        maxBuffer: 200 * 1024 * 1024,
      },
    );
    if (existsSync(minifiedPath)) {
      const rawSize = statSync(workerPath).size;
      const minSize = statSync(minifiedPath).size;
      rmSync(workerPath, { force: true });
      renameSync(minifiedPath, workerPath);
      console.log(`Minified ${workerName} with esbuild (${(rawSize / 1024 / 1024).toFixed(1)} MB → ${(minSize / 1024 / 1024).toFixed(1)} MB)`);

      // Analyze metafile to find largest contributors
      const metafilePath = join(distDir, 'metafile.json');
      if (existsSync(metafilePath)) {
        try {
          const meta = JSON.parse(readFileSync(metafilePath, 'utf8'));
          const inputs = Object.entries(meta.inputs || {})
            .map(([path, info]) => ({ path, bytes: info.bytes }))
            .sort((a, b) => b.bytes - a.bytes)
            .slice(0, 30);
          console.log('\n=== Top 30 largest bundle inputs ===');
          for (const { path, bytes } of inputs) {
            console.log(`  ${(bytes / 1024).toFixed(0)} KiB  ${path.replace(projectRoot + '/', '')}`);
          }
          const totalBytes = Object.values(meta.inputs || {}).reduce((sum, i) => sum + i.bytes, 0);
          console.log(`  Total inputs: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
        } catch (e) {
          console.log(`[warn] metafile analysis skipped: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } catch (e) {
    console.log(`[warn] esbuild minification skipped: ${e instanceof Error ? e.message : String(e)}`);
  }
} else {
  console.log(`Worker is ${(currentSize / 1024 / 1024).toFixed(1)} MB + WASM ${(wasmSize / 1024 / 1024).toFixed(1)} MB = ${(totalSize / 1024 / 1024).toFixed(1)} MB (≤ 64 MiB), skipping esbuild minification`);
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

// --- Analyze wrangler metafile (from --metafile flag) ---
// This shows the actual module-level breakdown of what wrangler bundled.
const wranglerMetafile = join(distDir, 'metafile.json');
if (existsSync(wranglerMetafile)) {
  try {
    const meta = JSON.parse(readFileSync(wranglerMetafile, 'utf8'));
    const inputs = Object.entries(meta.inputs || {})
      .map(([path, info]) => ({ path, bytes: info.bytes }))
      .sort((a, b) => b.bytes - a.bytes);
    console.log('\n=== Wrangler metafile: Top 50 largest bundled modules ===');
    for (const { path, bytes } of inputs.slice(0, 50)) {
      console.log(`  ${(bytes / 1024).toFixed(0)} KiB  ${path.replace(projectRoot + '/', '')}`);
    }
    const totalBytes = Object.values(meta.inputs || {}).reduce((sum, i) => sum + i.bytes, 0);
    console.log(`  Total bundled: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

    // Group by top-level package/directory
    const groups = {};
    for (const { path, bytes } of inputs) {
      const relPath = path.replace(projectRoot + '/', '');
      let group;
      if (relPath.includes('node_modules/')) {
        const match = relPath.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//);
        group = match ? `node_modules/${match[1]}` : 'node_modules/other';
      } else if (relPath.startsWith('.open-next/server-functions/default/.next/server/app/api/')) {
        group = '.next/server/app/api/*';
      } else if (relPath.startsWith('.open-next/server-functions/default/.next/server/app/')) {
        group = '.next/server/app/* (pages)';
      } else if (relPath.startsWith('src/')) {
        const match = relPath.match(/src\/([^/]+)/);
        group = match ? `src/${match[1]}` : 'src/other';
      } else {
        group = 'other';
      }
      groups[group] = (groups[group] || 0) + bytes;
    }
    console.log('\n=== Bundled size by group ===');
    for (const [group, bytes] of Object.entries(groups).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${(bytes / 1024 / 1024).toFixed(1)} MB  ${group}`);
    }
  } catch (e) {
    console.log(`[warn] wrangler metafile analysis failed: ${e instanceof Error ? e.message : String(e)}`);
  }
} else {
  console.log('[info] No wrangler metafile found (use --metafile flag to enable)');
}

// --- Keep Prisma WASM in the dist directory ---
// The worker code has a static import reference to the WASM module.
// Removing it causes "No such module" errors at runtime, breaking all
// Prisma operations (signup, login, etc.). The minified worker (~54 MB)
// plus the WASM (~3.2 MB) is ~57 MB, well under the 64 MiB limit.
console.log('\nKeeping Prisma WASM in dist directory (required by worker at runtime)...');
if (existsSync(distDir)) {
  const entries = readdirSync(distDir);
  for (const entry of entries) {
    if (entry.endsWith('.wasm') && entry.includes('query_compiler')) {
      const stat = statSync(join(distDir, entry));
      console.log(`  kept: ${entry} (${(stat.size / 1024).toFixed(0)} KiB)`);
    }
  }
}

// --- Remove local-only and native packages from the dist directory ---
// These may be copied by the wrangler dry-run. Remove them so they're not
// included in the final Worker upload.
const removePkgs = ['better-sqlite3', '@prisma/adapter-better-sqlite3', 'sharp', '@img', 'effect', 'elkjs', '@electric-sql', '@aws-sdk', '@smithy'];
console.log('\nRemoving local-only/native packages from dist directory...');
let pkgBytes = 0;
for (const pkg of removePkgs) {
  const pkgPath = join(distDir, 'node_modules', pkg);
  if (existsSync(pkgPath)) {
    const stat = statSync(pkgPath);
    rmSync(pkgPath, { recursive: true, force: true });
    pkgBytes += stat.size;
    console.log(`  removed: ${pkg} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
  }
}
if (pkgBytes > 0) {
  console.log(`  Package removal saved ${(pkgBytes / 1024 / 1024).toFixed(1)} MB`);
} else {
  console.log('  no local-only packages found in dist');
}
