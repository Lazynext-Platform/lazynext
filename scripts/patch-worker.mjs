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
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, '.open-next', 'dist');

if (!existsSync(join(distDir, 'worker.js'))) {
  console.error('worker.js not found in .open-next/dist/. Run wrangler deploy --dry-run first.');
  process.exit(1);
}

// Patch all __require functions
const workerPath = join(distDir, 'worker.js');
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
console.log(`Patched ${patchCount} __require function(s) in worker.js`);

// Create wrangler.jsonc in the dist directory
const projectWrangler = readFileSync(join(projectRoot, 'wrangler.jsonc'), 'utf8');
const distWrangler = projectWrangler
  .replace(/"main":\s*"[^"]*"/, `"main": "worker.js"`)
  .replace(/"directory":\s*"[^"]*"/g, (match) => {
    if (match.includes('assets')) {
      return `"directory": "${join(projectRoot, '.open-next', 'assets').replace(/\\/g, '/')}"`;
    }
    return match;
  });

writeFileSync(join(distDir, 'wrangler.jsonc'), distWrangler);
console.log('Created wrangler.jsonc in .open-next/dist/');
