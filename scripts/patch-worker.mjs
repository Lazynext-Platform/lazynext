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
// The wrangler dry-run outputs an unminified bundle (~126 MB). Esbuild minification
// reduces it to ~98 MB. We use --drop=console to strip console.log calls and
// --minify for maximum compression.
try {
  const minifiedPath = join(distDir, `${workerName}.min`);
  execSync(
    `npx esbuild "${workerPath}" --minify --format=esm --outfile="${minifiedPath}"`,
    { stdio: 'pipe', timeout: 120_000 },
  );
  if (existsSync(minifiedPath)) {
    const origSize = statSync(workerPath).size;
    const minSize = statSync(minifiedPath).size;
    rmSync(workerPath, { force: true });
    renameSync(minifiedPath, workerPath);
    console.log(`Minified ${workerName} with esbuild: ${(origSize / 1024 / 1024).toFixed(1)} MB -> ${(minSize / 1024 / 1024).toFixed(1)} MB`);
  }
} catch (e) {
  console.log(`[warn] esbuild minification skipped: ${e instanceof Error ? e.message : String(e)}`);
}

// Bundle analysis: show the largest strings in the worker to identify bloat
try {
  const finalContent = readFileSync(workerPath, 'utf8');
  const finalSize = (finalContent.length / 1024 / 1024).toFixed(1);
  console.log(`\n=== Bundle analysis ===`);
  console.log(`Final worker size: ${finalSize} MB`);

  // Count occurrences of common module patterns to identify heavy dependencies
  const patterns = [
    { name: 'Prisma', regex: /prisma/gi },
    { name: 'NextAuth', regex: /next-?auth/gi },
    { name: 'openid-client', regex: /openid-client/gi },
    { name: 'Atlas', regex: /atlascloud|atlas/gi },
    { name: 'DodoPayments', regex: /dodopayment/gi },
    { name: 'Resend', regex: /resend/gi },
    { name: 'bcryptjs', regex: /bcrypt/gi },
    { name: 'lucide-react', regex: /lucide/gi },
    { name: 'wasm-base64', regex: /[A-Za-z0-9+/]{10000,}/g },
  ];
  for (const { name, regex } of patterns) {
    const matches = finalContent.match(regex);
    if (matches && matches.length > 0) {
      console.log(`  ${name}: ${matches.length} occurrences`);
    }
  }

  // Check for large base64 blobs (indicator of WASM still inlined)
  const largeBlobs = finalContent.match(/[A-Za-z0-9+/]{50000,}/g);
  if (largeBlobs) {
    let totalBlobSize = 0;
    for (const blob of largeBlobs) totalBlobSize += blob.length;
    console.log(`  Large base64 blobs: ${largeBlobs.length} blobs, ${(totalBlobSize / 1024 / 1024).toFixed(1)} MB total`);
  } else {
    console.log(`  No large base64 blobs found (good!)`);
  }
  console.log(`=== End bundle analysis ===\n`);
} catch (e) {
  console.log(`[warn] bundle analysis skipped: ${e instanceof Error ? e.message : String(e)}`);
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

// --- Strip inlined base64 WASM data from the bundled worker ---
// The wrangler dry-run bundles everything into worker-entry.js, including
// base64-encoded WASM data from @prisma/client/runtime/. These base64 strings
// are 4+ MB each and are fallbacks for environments that can't load .wasm files
// directly. workerd CAN load .wasm files directly via WebAssembly.instantiate,
// so the base64 fallback is never used at runtime.
//
// We replace large base64 string literals (50,000+ chars) with empty strings.
// This typically saves ~40 MB, bringing the worker under Cloudflare's 64 MiB
// uncompressed size limit.
//
// The actual .wasm file is KEPT in the dist directory so workerd can load it.
console.log('\nStripping inlined base64 WASM data from worker...');
let strippedContent = readFileSync(workerPath, 'utf8');
const beforeSize = strippedContent.length;

// Match string literals containing 50,000+ base64 characters
// These are the inlined WASM base64 data
const base64Regex = /"([A-Za-z0-9+/]{50000,}={0,2})"/g;
const matches = strippedContent.match(base64Regex);
if (matches) {
  let totalStripped = 0;
  for (const match of matches) {
    totalStripped += match.length - 2; // subtract quotes
  }
  strippedContent = strippedContent.replace(base64Regex, '""');
  writeFileSync(workerPath, strippedContent);
  console.log(`  Stripped ${matches.length} base64 blob(s), saved ${(totalStripped / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Worker size: ${(beforeSize / 1024 / 1024).toFixed(1)} MB → ${(strippedContent.length / 1024 / 1024).toFixed(1)} MB`);
} else {
  console.log('  No large base64 blobs found');
}

// --- Keep the Prisma WASM file in the dist directory ---
// Unlike the previous approach (which deleted the .wasm file), we KEEP it
// because workerd needs it for WebAssembly.instantiate. The base64 fallback
// has been stripped above, so the .wasm file is the only WASM source.
console.log('\nChecking for Prisma WASM in dist directory...');
if (existsSync(distDir)) {
  const entries = readdirSync(distDir);
  for (const entry of entries) {
    if (entry.endsWith('.wasm') && entry.includes('query_compiler')) {
      const wasmPath = join(distDir, entry);
      const stat = statSync(wasmPath);
      console.log(`  kept: ${entry} (${(stat.size / 1024).toFixed(0)} KiB)`);
    }
  }
}
