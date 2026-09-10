/**
 * Pre-deploy diagnostic: analyze the .open-next/server-functions/default/
 * directory to find the largest files and directories before wrangler
 * bundles them into the Worker. This helps identify what's bloating the
 * Worker bundle above Cloudflare's 64 MiB limit.
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = new URL('..', import.meta.url).pathname;
const serverFuncDir = join(projectRoot, '.open-next', 'server-functions', 'default');

if (!existsSync(serverFuncDir)) {
  console.error('Server function directory not found. Run cf:build first.');
  process.exit(0); // Don't fail the build
}

console.log('=== Bundle Analysis: .open-next/server-functions/default/ ===\n');

// 1. Top-level directory sizes
console.log('--- Top-level directory sizes ---');
const topDirs = readdirSync(serverFuncDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => {
    const path = join(serverFuncDir, e.name);
    const size = dirSize(path);
    return { name: e.name, size };
  })
  .sort((a, b) => b.size - a.size);

for (const { name, size } of topDirs) {
  console.log(`  ${(size / 1024 / 1024).toFixed(1)} MB  ${name}`);
}

const totalSize = dirSize(serverFuncDir);
console.log(`  ${(totalSize / 1024 / 1024).toFixed(1)} MB  TOTAL\n`);

// 2. Top 30 largest individual files
console.log('--- Top 30 largest files ---');
const allFiles = [];
function collectFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath);
    } else if (entry.isFile()) {
      const stat = statSync(fullPath);
      allFiles.push({ path: fullPath.replace(serverFuncDir + '/', ''), size: stat.size });
    }
  }
}
collectFiles(serverFuncDir);
allFiles.sort((a, b) => b.size - a.size);
for (const { path, size } of allFiles.slice(0, 30)) {
  console.log(`  ${(size / 1024).toFixed(0)} KiB  ${path}`);
}

// 3. node_modules subdirectory sizes (top 20)
console.log('\n--- Top 20 node_modules packages ---');
const nmDir = join(serverFuncDir, 'node_modules');
if (existsSync(nmDir)) {
  const packages = [];
  function collectPackages(dir, prefix = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('@')) {
        // Scoped package — go one level deeper
        collectPackages(join(dir, entry.name), entry.name + '/');
      } else {
        const pkgPath = join(dir, entry.name);
        const size = dirSize(pkgPath);
        packages.push({ name: prefix + entry.name, size });
      }
    }
  }
  collectPackages(nmDir);
  packages.sort((a, b) => b.size - a.size);
  for (const { name, size } of packages.slice(0, 20)) {
    console.log(`  ${(size / 1024 / 1024).toFixed(1)} MB  ${name}`);
  }
}

// 4. .next/server directory analysis (route bundles)
const nextServerDir = join(serverFuncDir, '.next', 'server');
if (existsSync(nextServerDir)) {
  console.log('\n--- .next/server subdirectories ---');
  const subDirs = readdirSync(nextServerDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const path = join(nextServerDir, e.name);
      return { name: e.name, size: dirSize(path) };
    })
    .sort((a, b) => b.size - a.size);
  for (const { name, size } of subDirs) {
    console.log(`  ${(size / 1024 / 1024).toFixed(1)} MB  ${name}`);
  }
}

function dirSize(dir) {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        total += dirSize(fullPath);
      } else if (entry.isFile()) {
        total += statSync(fullPath).size;
      }
    }
  } catch {}
  return total;
}
