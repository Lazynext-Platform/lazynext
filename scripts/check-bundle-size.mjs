/**
 * Check the bundle size of the Cloudflare Worker after build.
 * Fails CI if the compressed worker exceeds the 10 MiB limit.
 * Reports the size and headroom for visibility.
 */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// The Cloudflare Workers limit is 10 MiB (10,240 KiB) for compressed uploads
const LIMIT_KIB = 10240;
const WARN_KIB = 9728; // 95% of limit — warn at this threshold

// Find the worker bundle
const distDir = join(projectRoot, '.open-next', 'dist');
const candidates = ['worker-entry.js', 'worker.js'];

let workerPath = null;
for (const name of candidates) {
  const p = join(distDir, name);
  if (existsSync(p)) {
    workerPath = p;
    break;
  }
}

if (!workerPath) {
  console.error('Bundle size check: no worker bundle found in .open-next/dist/');
  console.error('Run `npm run cf:build` first.');
  process.exit(1);
}

const raw = readFileSync(workerPath);
const rawKiB = raw.length / 1024;
const compressed = gzipSync(raw);
const compressedKiB = compressed.length / 1024;
const headroomKiB = LIMIT_KIB - compressedKiB;
const pct = (compressedKiB / LIMIT_KIB) * 100;

console.log('=== Bundle Size Report ===');
console.log(`Worker file:     ${workerPath}`);
console.log(`Raw size:        ${rawKiB.toFixed(1)} KiB`);
console.log(`Gzipped size:    ${compressedKiB.toFixed(1)} KiB`);
console.log(`Limit:           ${LIMIT_KIB} KiB (10 MiB)`);
console.log(`Headroom:        ${headroomKiB.toFixed(1)} KiB`);
console.log(`Usage:           ${pct.toFixed(1)}% of limit`);

if (compressedKiB > LIMIT_KIB) {
  console.log('');
  console.log(`ERROR: Bundle size ${compressedKiB.toFixed(1)} KiB exceeds limit of ${LIMIT_KIB} KiB!`);
  console.log('Reduce bundle size before deploying.');
  process.exit(1);
} else if (compressedKiB > WARN_KIB) {
  console.log('');
  console.log(`WARNING: Bundle size ${compressedKiB.toFixed(1)} KiB is above warning threshold of ${WARN_KIB} KiB`);
  console.log('Consider reducing bundle size to maintain margin.');
} else {
  console.log('');
  console.log('OK: Bundle size is within limits.');
}

process.exit(0);
