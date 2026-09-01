/**
 * Post-build step: remove unused Prisma WASM query engines from the
 * OpenNext server-functions bundle to reduce the Cloudflare Worker size.
 *
 * The project only uses SQLite (D1). Prisma's client
 * runtime includes WASM engines for ALL database types (CockroachDB, MySQL,
 * SQLServer, PostgreSQL) which are never loaded but inflate the bundle by ~25MB,
 * pushing the Worker past Cloudflare's compressed size limit and causing
 * intermittent 503 "Worker exceeded resource limits" errors.
 *
 * This script runs after `opennextjs-cloudflare build` and before
 * `opennextjs-cloudflare deploy` to delete the unused engine files.
 */
import { readdirSync, rmSync, statSync, existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
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
// For Cloudflare (D1), only sqlite is needed.
const KEEP_ENGINES = new Set(['sqlite']);

// Database engines we DELETE (not used by this project)
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

console.log('Trimming unused Prisma WASM engines from OpenNext bundle...');

for (const engine of DELETE_ENGINES) {
  removeEngineFiles(prismaRuntimeDir, engine);
}

// Remove "small" engine variants (Prisma 7) — we only need "fast"
for (const variant of DELETE_VARIANTS) {
  removeEngineFiles(prismaRuntimeDir, variant);
}

// Also clean .prisma/client directory if it exists
if (existsSync(dotPrismaDir)) {
  for (const engine of DELETE_ENGINES) {
    removeEngineFiles(dotPrismaDir, engine);
  }
  for (const variant of DELETE_VARIANTS) {
    removeEngineFiles(dotPrismaDir, variant);
  }
}

console.log(`\nDone: removed ${removedCount} files, freed ${(removedBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`Kept engines: ${[...KEEP_ENGINES].join(', ')}`);

// Prisma 7: swap the "fast" WASM engine with the "small" variant to reduce bundle size.
// The "fast" engine is 3.2 MB (1.1 MB gzipped); the "small" engine is 1.6 MB (~550 KB gzipped).
// Both share identical JS wrappers (wasm-bindgen interface is the same), so the edge.js
// runtime works unchanged with either binary. The "small" engine is designed for
// constrained environments like Cloudflare Workers and is the recommended choice when
// bundle size is a concern.
const smallWasmSrc = join(projectRoot, 'node_modules', 'prisma', 'build', 'query_compiler_small_bg.sqlite.wasm');
const fastWasmTargets = [
  join(dotPrismaDir, 'query_compiler_fast_bg.wasm'),
  join(projectRoot, 'node_modules', '.prisma', 'client', 'query_compiler_fast_bg.wasm'),
];
if (existsSync(smallWasmSrc)) {
  const smallStat = statSync(smallWasmSrc);
  let swapped = false;
  for (const target of fastWasmTargets) {
    if (existsSync(target)) {
      const targetStat = statSync(target);
      copyFileSync(smallWasmSrc, target);
      swapped = true;
      console.log(`  swapped fast→small WASM at ${target.split('/').pop()} (${(targetStat.size / 1024).toFixed(0)} KiB → ${(smallStat.size / 1024).toFixed(0)} KiB)`);
    }
  }
  if (swapped) {
    console.log(`  WASM swap saved ${((3227 - smallStat.size / 1024)).toFixed(0)} KiB uncompressed (~500 KiB gzipped)`);
  }
} else {
  console.log('  [warn] small WASM engine not found — keeping fast engine');
}

// Prisma 7: remove the legacy query_compiler_bg.wasm (not used in workerd/edge runtime).
// The edge.js entry point only uses query_compiler_fast_bg.* and wasm-compiler-edge.
const legacyWasmFiles = [
  join(dotPrismaDir, 'query_compiler_bg.wasm'),
  join(dotPrismaDir, 'query_compiler_bg.js'),
  join(dotPrismaDir, 'wasm.js'),
  // The .prisma/client/query_compiler_fast_bg.wasm-base64.js is a duplicate of
  // @prisma/client/runtime/query_compiler_fast_bg.{sqlite,postgresql}.wasm-base64.js
  // and is only referenced by index.js (not edge.js, which workerd uses).
  join(dotPrismaDir, 'query_compiler_fast_bg.wasm-base64.js'),
];
for (const file of legacyWasmFiles) {
  if (existsSync(file)) {
    const stat = statSync(file);
    rmSync(file, { force: true });
    removedCount++;
    removedBytes += stat.size;
    console.log(`  removed legacy: ${file.split('/').pop()} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
  }
}

// Remove unused .mjs variants of wasm-base64 (only .js is referenced by the edge runtime)
if (existsSync(prismaRuntimeDir)) {
  const runtimeEntries = readdirSync(prismaRuntimeDir);
  for (const entry of runtimeEntries) {
    if (entry.endsWith('wasm-base64.mjs')) {
      const fullPath = join(prismaRuntimeDir, entry);
      try {
        const stat = statSync(fullPath);
        rmSync(fullPath, { force: true });
        removedCount++;
        removedBytes += stat.size;
        console.log(`  removed mjs: ${entry} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
      } catch {}
    }
  }
}

// --- Patch __require to add MODULE_NOT_FOUND error code ---
// The Node.js middleware (proxy.ts) runtime calls getInstrumentationModule()
// which tries to require("instrumentation.js"). In workerd, `require` is not
// defined, so __require throws "Dynamic require of ... is not supported".
// The catch block in getInstrumentationModule checks for err.code ===
// "MODULE_NOT_FOUND" but the thrown Error doesn't have that code. We patch
// all __require functions in the OpenNext output to add the code so the
// catch block swallows the error gracefully.
const REQUIRE_PATCHES = [
  // With spaces (index.mjs style)
  [
    `throw Error('Dynamic require of "' + x + '" is not supported')`,
    `{const __e=new Error('Dynamic require of "' + x + '" is not supported');__e.code='MODULE_NOT_FOUND';throw __e}`,
  ],
  // Without spaces (handler.mjs esbuild style)
  [
    `throw Error('Dynamic require of "'+x+'" is not supported')`,
    `{const __e=new Error('Dynamic require of "'+x+'" is not supported');__e.code='MODULE_NOT_FOUND';throw __e}`,
  ],
  // Patch the require.apply fallback: in workerd with nodejs_compat, `require`
  // is defined, so the fallback error above is never reached. Instead, the
  // actual `require` throws an error without MODULE_NOT_FOUND code, causing
  // the instrumentation module loader to re-throw instead of silently catching.
  // Wrap require.apply with a try/catch that adds the code.
  [
    `if (typeof require !== "undefined") return require.apply(this, arguments);`,
    `if (typeof require !== "undefined") { try { return require.apply(this, arguments); } catch(__re) { if(!__re.code) __re.code='MODULE_NOT_FOUND'; throw __re; } }`,
  ],
  // Patch getInstrumentationModule: in workerd, the dynamic require of
  // instrumentation.js fails because the file is in /bundle/.next/server/
  // which is not resolvable by workerd's require. The instrumentation file
  // is a no-op (just exports register()), so we short-circuit the function
  // to return a no-op module instead of trying to require it.
  // Match the unique pattern: interopDefault(await __require(
  [
    `cachedInstrumentationModule = (0, _interopdefault.interopDefault)(await __require(`,
    `cachedInstrumentationModule = { register: async () => {} }; void (0, _interopdefault.interopDefault)(await __require(`,
  ],
];

// Patch: remove afterRegistration() call in registerInstrumentation.
// In workerd (Edge runtime), afterRegistration() throws
// "Node.js instrumentation extensions should not be loaded in the Edge runtime."
// Since our instrumentation is a no-op, there's nothing to after-register.
const INSTRUMENTATION_PATCHES = [
  [
    `await instrumentation.register();\n          (0, _instrumentationnodeextensions.afterRegistration)();`,
    `await instrumentation.register();`,
  ],
];

const patchFiles = [
  join(projectRoot, '.open-next', 'server-functions', 'default', 'index.mjs'),
  join(projectRoot, '.open-next', 'server-functions', 'default', 'handler.mjs'),
  join(projectRoot, '.open-next', 'middleware', 'handler.mjs'),
];

let patchCount = 0;
for (const file of patchFiles) {
  if (!existsSync(file)) continue;
  let content = readFileSync(file, 'utf8');
  let filePatched = false;
  for (const [old, neu] of REQUIRE_PATCHES) {
    const matches = content.split(old).length - 1;
    if (matches > 0) {
      content = content.split(old).join(neu);
      patchCount += matches;
      filePatched = true;
    }
  }
  if (filePatched) {
    writeFileSync(file, content);
    console.log(`  patched __require in ${file.split('/').pop()}`);
  }
}
if (patchCount > 0) {
  console.log(`Patched ${patchCount} __require function(s) with MODULE_NOT_FOUND error code`);
}

// Apply instrumentation patches (only to middleware handler)
const middlewareHandler = join(projectRoot, '.open-next', 'middleware', 'handler.mjs');
if (existsSync(middlewareHandler)) {
  let content = readFileSync(middlewareHandler, 'utf8');
  let instPatched = false;
  for (const [old, neu] of INSTRUMENTATION_PATCHES) {
    if (content.includes(old)) {
      content = content.split(old).join(neu);
      instPatched = true;
      console.log(`  patched instrumentation in handler.mjs`);
    }
  }
  if (instPatched) {
    writeFileSync(middlewareHandler, content);
  }
}

// --- Trim unnecessary Next.js modules from the server function bundle ---
// These modules are bundled by Next.js/OpenNext but not used in our production
// Cloudflare Worker. Removing them reduces the compressed bundle size.

const nextCompiledDir = join(
  projectRoot,
  '.open-next',
  'server-functions',
  'default',
  'node_modules',
  'next',
  'dist',
  'compiled',
);

const trimModules = [
  // next-devtools is only used in development mode
  { path: join(nextCompiledDir, 'next-devtools'), label: 'next-devtools' },
  // @next/font is not used — we use Tailwind CSS for fonts
  { path: join(nextCompiledDir, '@next', 'font'), label: '@next/font' },
  // Turbo and experimental runtime variants are not used in production
  { path: join(nextCompiledDir, 'next-server', 'app-page-turbo.runtime.prod.js'), label: 'next-server/app-page-turbo' },
  { path: join(nextCompiledDir, 'next-server', 'app-page-turbo-experimental.runtime.prod.js'), label: 'next-server/app-page-turbo-experimental' },
  { path: join(nextCompiledDir, 'next-server', 'app-page-experimental.runtime.prod.js'), label: 'next-server/app-page-experimental' },
  // Pages runtime is not used — we only use the app router
  { path: join(nextCompiledDir, 'next-server', 'pages.runtime.prod.js'), label: 'next-server/pages' },
  { path: join(nextCompiledDir, 'next-server', 'pages-turbo.runtime.prod.js'), label: 'next-server/pages-turbo' },
];

console.log('\nTrimming unused Next.js modules from server function bundle...');
let nextTrimmedBytes = 0;
for (const { path: modPath, label } of trimModules) {
  if (existsSync(modPath)) {
    const stat = statSync(modPath);
    rmSync(modPath, { recursive: true, force: true });
    nextTrimmedBytes += stat.size;
    console.log(`  removed: ${label} (${(stat.size / 1024).toFixed(0)} KiB)`);
  }
}
if (nextTrimmedBytes > 0) {
  console.log(`  Next.js trim saved ${(nextTrimmedBytes / 1024).toFixed(0)} KiB uncompressed (~${(nextTrimmedBytes / 1024 / 4).toFixed(0)} KiB gzipped)`);
}

// --- Remove source maps, .d.ts files, and other non-runtime artifacts ---
// These are not needed at runtime and inflate the bundle.

const serverFuncDir = join(projectRoot, '.open-next', 'server-functions', 'default');
const removePatterns = [
  // Source maps — not needed in production workerd
  '**/*.map',
  // TypeScript declarations — not needed at runtime
  '**/*.d.ts',
  // Font metrics — we use Tailwind CSS, not capsize fonts
  'node_modules/next/dist/server/capsize-font-metrics.json',
];

console.log('\nRemoving source maps and non-runtime artifacts...');
let artifactBytes = 0;
let artifactCount = 0;

function removeGlob(dir, pattern) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      removeGlob(fullPath, pattern);
    } else {
      // Check if file matches pattern
      const relativePath = fullPath.replace(serverFuncDir + '/', '');
      if (pattern === '**/*.map' && entry.name.endsWith('.map')) {
        const stat = statSync(fullPath);
        rmSync(fullPath, { force: true });
        artifactBytes += stat.size;
        artifactCount++;
      } else if (pattern === '**/*.d.ts' && entry.name.endsWith('.d.ts')) {
        const stat = statSync(fullPath);
        rmSync(fullPath, { force: true });
        artifactBytes += stat.size;
        artifactCount++;
      } else if (pattern === 'node_modules/next/dist/server/capsize-font-metrics.json' &&
                 relativePath === pattern) {
        const stat = statSync(fullPath);
        rmSync(fullPath, { force: true });
        artifactBytes += stat.size;
        artifactCount++;
        console.log(`  removed: capsize-font-metrics.json (${(stat.size / 1024).toFixed(0)} KiB)`);
      }
    }
  }
}

for (const pattern of removePatterns) {
  removeGlob(serverFuncDir, pattern);
}
if (artifactCount > 0) {
  console.log(`  removed ${artifactCount} artifacts, saved ${(artifactBytes / 1024).toFixed(0)} KiB uncompressed`);
}
