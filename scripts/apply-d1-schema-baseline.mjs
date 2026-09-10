#!/usr/bin/env node
/**
 * Apply the full Prisma schema to D1 as a baseline.
 *
 * The initial Prisma schema (User, Account, Session, VerificationToken, etc.)
 * was never captured as a migration — only incremental changes were.
 * This script generates the full schema SQL using `prisma migrate diff`
 * and applies it to D1, using CREATE TABLE IF NOT EXISTS so existing
 * tables are not affected.
 *
 * Usage:
 *   node scripts/apply-d1-schema-baseline.mjs          # dry-run (prints SQL)
 *   node scripts/apply-d1-schema-baseline.mjs --apply   # actually apply
 */
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const shouldApply = process.argv.includes('--apply');

// Generate the full schema SQL from the Prisma schema
console.log('Generating full schema SQL from prisma/schema.prisma...');

const diffResult = spawnSync('npx', [
  'prisma', 'migrate', 'diff',
  '--from-empty',
  '--to-schema-datamodel', 'prisma/schema.prisma',
  '--script',
], {
  cwd: projectRoot,
  stdio: ['pipe', 'pipe', 'pipe'],
  encoding: 'utf8',
});

if (diffResult.error || diffResult.status !== 0) {
  console.error('Failed to generate schema SQL:');
  console.error(diffResult.stderr || diffResult.stdout);
  process.exit(1);
}

let schemaSql = diffResult.stdout;

// Convert CREATE TABLE to CREATE TABLE IF NOT EXISTS
// so we don't fail on tables that already exist from incremental migrations.
schemaSql = schemaSql.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ');

// Also convert CREATE INDEX to CREATE INDEX IF NOT EXISTS
schemaSql = schemaSql.replace(/CREATE INDEX /g, 'CREATE INDEX IF NOT EXISTS ');
schemaSql = schemaSql.replace(/CREATE UNIQUE INDEX /g, 'CREATE UNIQUE INDEX IF NOT EXISTS ');

console.log(`Generated ${schemaSql.length} bytes of SQL`);

if (!shouldApply) {
  console.log('\n--- SQL to apply (dry-run) ---\n');
  console.log(schemaSql);
  console.log('\nTo apply, run: node scripts/apply-d1-schema-baseline.mjs --apply');
  process.exit(0);
}

// Write to a temp file and execute via wrangler
const tmpPath = join(projectRoot, '.d1-schema-baseline.sql');
writeFileSync(tmpPath, schemaSql);

console.log('\nApplying full schema to D1 database "lazynext-db"...');

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
  console.error('wrangler d1 execute failed for schema baseline');
  process.exit(1);
}

console.log('Done. Full schema applied to D1.');
