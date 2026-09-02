/**
 * Verify OpenNext and Next.js compatibility.
 * Checks that the installed versions are compatible and that
 * the --dangerouslyUseUnsupportedNextVersion flag is NOT needed.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

const nextVersion = pkg.dependencies?.next;
const openNextVersion = pkg.dependencies?.['@opennextjs/cloudflare'] ||
  pkg.devDependencies?.['@opennextjs/cloudflare'];

console.log('=== OpenNext / Next.js Compatibility Check ===');
console.log(`Next.js:           ${nextVersion}`);
console.log(`@opennextjs/cloudflare: ${openNextVersion}`);

// Next.js 16.x is supported by OpenNext 1.20.x+
const nextMajor = parseInt(nextVersion?.replace(/[^\d]/g, '')?.slice(0, 2) || '0', 10);
const openNextMinor = parseFloat(openNextVersion?.replace(/[^\d.]/g, '') || '0');

let ok = true;

if (nextMajor >= 16 && openNextMinor < 1.2) {
  console.log('ERROR: Next.js 16+ requires @opennextjs/cloudflare 1.20.0 or later');
  ok = false;
}

// Check that --dangerouslyUseUnsupportedNextVersion is NOT in any scripts
const scripts = pkg.scripts || {};
const dangerousFlag = '--dangerouslyUseUnsupportedNextVersion';
const offendingScripts = Object.entries(scripts)
  .filter(([_, cmd]) => cmd.includes(dangerousFlag))
  .map(([name]) => name);

if (offendingScripts.length > 0) {
  console.log(`ERROR: ${dangerousFlag} found in scripts: ${offendingScripts.join(', ')}`);
  console.log('OpenNext 1.20.6+ officially supports Next.js 16 — remove this flag.');
  ok = false;
} else {
  console.log('OK: --dangerouslyUseUnsupportedNextVersion flag is not used');
}

// Check CI workflow for the flag
try {
  const ci = readFileSync(join(projectRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  if (ci.includes(dangerousFlag)) {
    console.log(`ERROR: ${dangerousFlag} found in CI workflow`);
    ok = false;
  } else {
    console.log('OK: CI workflow does not use the unsupported flag');
  }
} catch {
  // No CI file is fine
}

if (ok) {
  console.log('');
  console.log('OK: OpenNext and Next.js are compatible.');
  process.exit(0);
} else {
  console.log('');
  console.log('FAIL: Compatibility issues detected.');
  process.exit(1);
}
