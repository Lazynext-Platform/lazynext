#!/usr/bin/env node
/**
 * Apply pending D1 migrations to the production Cloudflare D1 database.
 *
 * Usage:
 *   node scripts/apply-d1-migrations.mjs          # dry-run (prints SQL)
 *   node scripts/apply-d1-migrations.mjs --apply   # actually apply via wrangler
 *
 * This script reads all migration.sql files from prisma/migrations/ subdirs,
 * tracks which migrations have already been applied in the `_prisma_migrations`
 * table, and only applies pending migrations.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
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

// Collect all migration SQL files
const migrations = [];
for (const dir of migrationDirs) {
  const sqlPath = join(migrationsDir, dir.name, 'migration.sql');
  if (existsSync(sqlPath)) {
    const sql = readFileSync(sqlPath, 'utf8');
    migrations.push({ name: dir.name, sql });
    console.log(`Found migration: ${dir.name} (${sql.length} bytes)`);
  }
}

if (migrations.length === 0) {
  console.log('No migration.sql files found.');
  process.exit(0);
}

// Ensure the _prisma_migrations tracking table exists
const MIGRATION_TABLE_SQL = `CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);`;

function runWranglerD1(sql, captureJson = false) {
  const tmpPath = join(projectRoot, '.d1-migration-tmp.sql');
  writeFileSync(tmpPath, sql);

  const args = [
    'wrangler', 'd1', 'execute', 'lazynext-db',
    '--remote',
    '--file', tmpPath,
  ];
  if (captureJson) args.push('--json');

  const result = spawnSync('npx', args, {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  try { unlinkSync(tmpPath); } catch {}

  return result;
}

function getAppliedMigrations() {
  // First, ensure the tracking table exists
  const createResult = runWranglerD1(MIGRATION_TABLE_SQL);
  if (createResult.error || createResult.status !== 0) {
    console.warn('Warning: could not create _prisma_migrations table — will apply all migrations');
    return new Set();
  }

  // Query applied migrations
  const queryResult = runWranglerD1('SELECT id FROM _prisma_migrations;', true);
  if (queryResult.error || queryResult.status !== 0) {
    console.warn('Warning: could not query _prisma_migrations table — will apply all migrations');
    return new Set();
  }

  const applied = new Set();
  try {
    const output = queryResult.stdout.trim();
    // wrangler --json outputs a JSON array. Sometimes there are log lines
    // before the JSON, so find the first '[' and parse from there.
    const jsonStart = output.indexOf('[');
    if (jsonStart === -1) {
      // No JSON array found — maybe wrangler version outputs differently
      console.warn('Warning: no JSON array in wrangler output — will apply all migrations');
      return new Set();
    }
    const jsonStr = output.slice(jsonStart);
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      for (const batch of parsed) {
        if (batch.results && Array.isArray(batch.results)) {
          for (const row of batch.results) {
            if (row.id) applied.add(row.id);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Warning: failed to parse wrangler JSON output — will apply all migrations:', e.message);
    return new Set();
  }
  return applied;
}

// Determine which migrations are pending
let pendingMigrations;
if (shouldApply) {
  const applied = getAppliedMigrations();
  pendingMigrations = migrations.filter(m => !applied.has(m.name));
  console.log(`\n${applied.size} migration(s) already applied, ${pendingMigrations.length} pending.`);
} else {
  pendingMigrations = migrations;
}

if (pendingMigrations.length === 0) {
  console.log('All migrations already applied. Nothing to do.');
  process.exit(0);
}

if (!shouldApply) {
  console.log('\n--- SQL to apply (dry-run) ---\n');
  for (const m of pendingMigrations) {
    console.log(`-- Migration: ${m.name}\n${m.sql}\n`);
  }
  console.log('\nTo apply, run: node scripts/apply-d1-migrations.mjs --apply');
  process.exit(0);
}

// Apply migrations one by one so a failure on one doesn't block others
// that might already be partially applied.
let applied = 0;
let skipped = 0;
for (const m of pendingMigrations) {
  // Use INSERT OR IGNORE so duplicate tracking entries don't fail
  const sql = `${m.sql}\n\nINSERT OR IGNORE INTO _prisma_migrations (id) VALUES ('${m.name}');`;
  console.log(`\nApplying: ${m.name}...`);

  const result = runWranglerD1(sql);

  if (result.error || result.status !== 0) {
    // Check if it's a "table already exists" error — if so, the migration
    // was already applied, just not tracked. Insert the tracking record.
    const stderr = (result.stderr || '').toLowerCase();
    const stdout = (result.stdout || '').toLowerCase();
    const alreadyExists = stderr.includes('already exists') || stdout.includes('already exists');

    if (alreadyExists) {
      console.log(`  → Tables already exist, recording as applied`);
      const trackResult = runWranglerD1(`INSERT OR IGNORE INTO _prisma_migrations (id) VALUES ('${m.name}');`);
      if (trackResult.status === 0) {
        skipped++;
      } else {
        console.error(`  → Failed to record tracking entry for ${m.name}`);
        console.error(`  → ${(result.stderr || result.stdout || '').trim()}`);
      }
    } else {
      console.error(`  → FAILED: ${(result.stderr || result.stdout || '').trim()}`);
      // Don't exit — continue with other migrations
    }
  } else {
    console.log(`  → OK`);
    applied++;
  }
}

console.log(`\nDone. Applied ${applied} migration(s), skipped ${skipped} (already existed).`);
