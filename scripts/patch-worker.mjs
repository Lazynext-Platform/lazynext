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
const CLOUDFLARE_LIMIT_BYTES = 64 * 1024 * 1024; // 64 MiB
const currentSize = existsSync(workerPath) ? statSync(workerPath).size : 0;
if (currentSize > CLOUDFLARE_LIMIT_BYTES) {
  console.log(`Worker is ${(currentSize / 1024 / 1024).toFixed(1)} MB (> 64 MiB), running esbuild minification...`);
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
  console.log(`Worker is already ${(currentSize / 1024 / 1024).toFixed(1)} MB (≤ 64 MiB), skipping esbuild minification`);
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

// --- Remove Prisma WASM from the dist directory ---
// The dry-run step copies the WASM to .open-next/dist/. Remove it so it's
// not included in the Worker bundle (it's served from Cloudflare Assets instead).
console.log('\nRemoving Prisma WASM from dist directory...');
let wasmRemoved = 0;
let wasmBytes = 0;
if (existsSync(distDir)) {
  const entries = readdirSync(distDir);
  for (const entry of entries) {
    if (entry.endsWith('.wasm') && entry.includes('query_compiler')) {
      const wasmPath = join(distDir, entry);
      const stat = statSync(wasmPath);
      rmSync(wasmPath, { force: true });
      wasmRemoved++;
      wasmBytes += stat.size;
      console.log(`  removed: ${entry} (${(stat.size / 1024).toFixed(0)} KiB)`);
    }
  }
}
if (wasmRemoved > 0) {
  console.log(`Removed ${wasmRemoved} WASM file(s), saved ${(wasmBytes / 1024 / 1024).toFixed(1)} MB`);
} else {
  console.log('  no WASM files found in dist directory');
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
