#!/usr/bin/env node
/**
 * Apply pending D1 migrations to the production Cloudflare D1 database.
 *
 * Usage:
 *   node scripts/apply-d1-migrations.mjs          # dry-run (prints SQL)
 *   node scripts/apply-d1-migrations.mjs --apply   # actually apply via wrangler
 *
 * This script reads all migration.sql files from prisma/migrations/*/,
 * concatenates them, and applies them via `wrangler d1 execute`.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const migrationsDir = join(projectRoot, 'prisma', 'migrations');
const shouldApply = process.argv.includes('--apply');

if (!existsSync(migrationsDir)) {
  console.error('No migrations directory found at', migrationsDir);
  process.exit(1);
}

const migrationDirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .sort();

if (migrationDirs.length === 0) {
  console.log('No migrations to apply.');
  process.exit(0);
}

let allSql = '';
for (const dir of migrationDirs) {
  const sqlPath = join(migrationsDir, dir.name, 'migration.sql');
  if (existsSync(sqlPath)) {
    const sql = readFileSync(sqlPath, 'utf8');
    console.log(`Found migration: ${dir.name} (${sql.length} bytes)`);
    allSql += `-- Migration: ${dir.name}\n${sql}\n\n`;
  }
}

if (!allSql.trim()) {
  console.log('No migration.sql files found.');
  process.exit(0);
}

if (!shouldApply) {
  console.log('\n--- SQL to apply (dry-run) ---\n');
  console.log(allSql);
  console.log('\nTo apply, run: node scripts/apply-d1-migrations.mjs --apply');
  process.exit(0);
}

// Write to a temp file and execute via wrangler
const tmpPath = join(projectRoot, '.d1-migration-tmp.sql');
import { writeFileSync, unlinkSync } from 'node:fs';
writeFileSync(tmpPath, allSql);

console.log(`\nApplying ${migrationDirs.length} migration(s) to D1 database "lazynext-db"...`);

const result = spawnSync('npx', [
  'wrangler', 'd1', 'execute', 'lazynext-db',
  '--remote',
  '--file', tmpPath,
], {
  cwd: projectRoot,
  stdio: 'inherit',
  encoding: 'utf8',
});

try { unlinkSync(tmpPath); } catch {}

if (result.error) throw result.error;
if (result.status !== 0) {
  console.error('wrangler d1 execute failed');
  process.exit(1);
}

console.log('Done.');
