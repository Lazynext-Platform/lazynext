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
  '--to-schema', 'prisma/schema.prisma',
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

// Parse the Prisma schema SQL to extract expected columns per table.
// This is used to generate ALTER TABLE statements for pre-existing tables
// that are missing columns added by later migrations.
function parsePrismaColumns(sql) {
  const tables = {};
  const createTableRegex = /CREATE TABLE "([^"]+)" \(([^;]+)\)/g;
  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = {};
    const lines = body.split('\n').filter(l => {
      const trimmed = l.trim();
      return trimmed && !trimmed.startsWith('CONSTRAINT');
    });
    for (const line of lines) {
      const colMatch = line.match(/"([^"]+)"\s+(TEXT|INTEGER|DATETIME|BOOLEAN|REAL|BLOB|NUMERIC)/);
      if (colMatch) {
        const colName = colMatch[1];
        const colType = colMatch[2];
        let defaultVal = '';
        const defMatch = line.match(/DEFAULT\s+('([^']*)'|\d+|CURRENT_TIMESTAMP|true|false)/);
        if (defMatch) defaultVal = defMatch[0];
        const isNotNull = line.includes('NOT NULL');
        columns[colName] = { type: colType, default: defaultVal, notNull: isNotNull };
      }
    }
    tables[tableName] = columns;
  }
  return tables;
}

// Query existing D1 schema and generate ALTER TABLE statements for missing columns.
// This handles the case where CREATE TABLE IF NOT EXISTS skips a pre-existing table
// that is missing columns added by later migrations.
function generateAlterStatements(prismaTables) {
  // Query D1 for existing table schemas
  const queryResult = spawnSync('npx', [
    'wrangler', 'd1', 'execute', 'lazynext-db',
    '--remote',
    '--command', "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE '_prisma%' AND name NOT LIKE 'd1_%'",
    '--json',
  ], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  if (queryResult.error || queryResult.status !== 0) {
    console.warn('Warning: could not query existing D1 schema for column diff. Skipping ALTER TABLE generation.');
    console.warn('This is safe for fresh databases but may miss columns on pre-existing tables.');
    return '';
  }

  let d1Tables = {};
  try {
    const parsed = JSON.parse(queryResult.stdout);
    const results = parsed[0]?.results || parsed.results || [];
    for (const row of results) {
      const tableName = row.name;
      const sql = row.sql;
      if (!sql) continue;
      const columns = new Set();
      // Match both quoted and unquoted column names followed by a type
      const colRegex = /(?:"([^"]+)"|(\w+))\s+(?:TEXT|INTEGER|DATETIME|BOOLEAN|REAL|BLOB|NUMERIC)/g;
      let m;
      while ((m = colRegex.exec(sql)) !== null) {
        columns.add(m[1] || m[2]);
      }
      d1Tables[tableName] = columns;
    }
  } catch {
    console.warn('Warning: could not parse D1 schema JSON. Skipping ALTER TABLE generation.');
    return '';
  }

  // Generate ALTER TABLE statements for missing columns
  const alterStatements = [];
  for (const [table, prismaCols] of Object.entries(prismaTables)) {
    const d1Cols = d1Tables[table];
    if (!d1Cols) continue; // Table doesn't exist yet — CREATE TABLE will handle it
    for (const [colName, colDef] of Object.entries(prismaCols)) {
      if (d1Cols.has(colName)) continue;
      let stmt = `ALTER TABLE "${table}" ADD COLUMN "${colName}" ${colDef.type}`;
      if (colDef.notNull && colDef.default) {
        stmt += ` NOT NULL ${colDef.default}`;
      } else if (colDef.default) {
        stmt += ` ${colDef.default}`;
      }
      alterStatements.push(stmt + ';');
    }
  }

  if (alterStatements.length > 0) {
    console.log(`Generated ${alterStatements.length} ALTER TABLE statements for missing columns.`);
  }
  return alterStatements.join('\n');
}

const prismaTables = parsePrismaColumns(schemaSql);
const alterSql = generateAlterStatements(prismaTables);
if (alterSql) {
  schemaSql += '\n\n-- ALTER TABLE statements for pre-existing tables with missing columns\n' + alterSql + '\n';
}

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
