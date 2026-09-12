#!/usr/bin/env node
/**
 * Seed 52 competitor platforms as Knowledge records (Memory model, type=knowledge)
 * into the production Cloudflare D1 database.
 *
 * Usage:
 *   node scripts/seed-competitors.mjs                          # dry-run (prints SQL)
 *   node scripts/seed-competitors.mjs --apply                  # apply via wrangler
 *   node scripts/seed-competitors.mjs --apply --org <id> --workspace <id>  # specify org/workspace
 *
 * The script is idempotent: it checks for existing competitor knowledge records
 * by sourceId prefix "competitor-seed:" and only inserts missing ones.
 *
 * Data source: docs/research/competitor-platforms.md (52 platforms from the
 * user-provided platform spreadsheet, verified 2026-09-11).
 */
import { spawnSync } from 'node:child_process';

const shouldApply = process.argv.includes('--apply');

// Parse --org and --workspace args
const orgIdx = process.argv.indexOf('--org');
const wsIdx = process.argv.indexOf('--workspace');
const orgArg = orgIdx >= 0 && orgIdx + 1 < process.argv.length ? process.argv[orgIdx + 1] : null;
const workspaceArg = wsIdx >= 0 && wsIdx + 1 < process.argv.length ? process.argv[wsIdx + 1] : null;

// 52 competitor platforms from docs/research/competitor-platforms.md
const platforms = [
  { name: 'Polsia', url: 'https://polsia.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Cofounder.co', url: 'https://cofounder.co/', category: 'Autonomous Company / AI Workforce', note: 'PDF also writes Cofounder; normalized' },
  { name: 'Audos', url: 'https://mate.audos.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official product site' },
  { name: 'Venture City', url: 'https://www.venturecity.ai/', category: 'Autonomous Company / AI Workforce', note: 'PDF also uses VentureCity; normalized' },
  { name: 'NanoCorp', url: 'https://www.nanocorp.so/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Zilla', url: 'https://www.zilla.build/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Locus Founder', url: 'https://locusfounder.com/', category: 'Autonomous Company / AI Workforce', note: 'PDF also writes Locus; normalized' },
  { name: 'cto AI Business', url: 'https://cto.new/tools/try-ai-business', category: 'AI Coding / App Builder', note: 'Verified product page' },
  { name: 'CoFounder.AI', url: 'https://cofounder.ai/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Frederick AI', url: 'https://www.frederick.ai/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Crevio', url: 'https://www.crevio.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Lindy', url: 'https://www.lindy.ai/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Sintra', url: 'https://sintra.ai/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Relevance AI', url: 'https://relevanceai.com/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Manus', url: 'https://www.manus.im/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Lovable', url: 'https://lovable.dev/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Replit', url: 'https://replit.com/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Cursor', url: 'https://cursor.com/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Bolt', url: 'https://bolt.new/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Devin', url: 'https://devin.ai/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Polycorp', url: 'https://ema.polycorp.ai/', category: 'Autonomous Company / AI Workforce', note: 'Verified current product site' },
  { name: 'Prometheus', url: 'https://systemprometheus.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Twin', url: 'https://twin.so/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Agentica', url: 'https://astarlabshub.com/', category: 'Autonomous Company / AI Workforce', note: 'Agentica product; current site under Astarlabshub' },
  { name: 'Buildpad', url: 'https://buildpad.io/', category: 'Autonomous Company / AI Workforce', note: 'PDF label: AI Cofounder; current brand is Buildpad' },
  { name: 'Tycoon', url: 'https://tycoon.us/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Launchyard', url: 'https://launchyard.dev/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'BusinessKit', url: 'https://businesskit.io/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'MakerPad', url: 'https://www.makerpad.co/', category: 'No-Code / Builder', note: 'PDF also writes Makerpad; normalized' },
  { name: 'Collision', url: 'https://www.collision.com/', category: 'Unverified / Parked', note: 'Domain parked/for sale; active site not verified' },
  { name: 'OhMyUnicorn Forge', url: 'https://ohmyunicorn.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Kitty.build', url: 'https://kitty.build/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Ceres', url: '', category: 'Unverified / Parked', note: 'No confident current official platform site verified' },
  { name: 'AgentCeres', url: 'https://agentceres.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Vibiz', url: 'https://www.vibiz.ai/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Amboras', url: 'https://www.amboras.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Sapphire', url: '', category: 'Unverified / Parked', note: 'No confident current official platform site verified' },
  { name: 'Genspark', url: 'https://www.genspark.ai/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'AutoGPT', url: 'https://www.agpt.co/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Viktor', url: 'https://www.viktor.ai/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Paperclip', url: 'https://paperclip.ceo/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Kortix', url: 'https://kortix.com/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Arceus', url: 'https://arceus.sh/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Base44', url: 'https://base44.com/', category: 'AI Coding / App Builder', note: 'Verified current official site' },
  { name: 'Claude Code', url: 'https://claude.com/product/claude-code', category: 'AI Coding / App Builder', note: 'Verified current official product page' },
  { name: 'Durable', url: 'https://durable.com/', category: 'No-Code / Builder', note: 'Verified current official site' },
  { name: 'Zapier', url: 'https://zapier.com/', category: 'No-Code / Builder', note: 'Verified current official site' },
  { name: 'Make', url: 'https://www.make.com/en', category: 'No-Code / Builder', note: 'Verified current official site' },
  { name: 'DragonOS', url: 'https://www.dragonos.co.in/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Atris', url: 'https://atris.ai/', category: 'AI Agent / Automation', note: 'Verified current official site' },
  { name: 'Starts.live', url: 'https://starts.live/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
  { name: 'Audos Black', url: 'https://audos-black.com/', category: 'Autonomous Company / AI Workforce', note: 'Verified current official site' },
];

function runWranglerQuery(args) {
  const result = spawnSync('npx', ['wrangler', 'd1', 'execute', 'lazynext-db', '--remote', '--json', ...args], {
    encoding: 'utf-8',
    timeout: 30000,
  });
  return result;
}

function runWranglerCommand(args) {
  const result = spawnSync('npx', ['wrangler', 'd1', 'execute', 'lazynext-db', '--remote', ...args], {
    encoding: 'utf-8',
    timeout: 30000,
  });
  return result;
}

function getExistingSourceIds() {
  // Query for existing competitor-seed records
  const result = runWranglerQuery(['--command', "SELECT sourceId FROM Memory WHERE sourceId LIKE 'competitor-seed:%'"]);
  if (result.status !== 0) {
    console.error('Failed to query existing records:', result.stderr);
    return new Set();
  }
  const existing = new Set();
  try {
    const parsed = JSON.parse(result.stdout);
    const rows = parsed[0]?.results || [];
    for (const row of rows) {
      existing.add(row.sourceId);
    }
  } catch {
    // If parsing fails, assume none exist
  }
  return existing;
}

function getOrgAndWorkspace() {
  if (orgArg && workspaceArg) {
    return { organizationId: orgArg, workspaceId: workspaceArg };
  }
  // Query for the first organization and workspace
  const orgResult = runWranglerQuery(['--command', 'SELECT id FROM Organization LIMIT 1']);
  if (orgResult.status !== 0) {
    console.error('Failed to query organization:', orgResult.stderr);
    process.exit(1);
  }
  let organizationId;
  try {
    const parsed = JSON.parse(orgResult.stdout);
    organizationId = parsed[0]?.results?.[0]?.id;
  } catch { /* empty */ }
  if (!organizationId) {
    console.error('No organization found in D1. Specify --org <id> and --workspace <id>.');
    process.exit(1);
  }

  const wsResult = runWranglerQuery(['--command', `SELECT id FROM Workspace WHERE organizationId = '${organizationId}' LIMIT 1`]);
  let workspaceId;
  if (wsResult.status === 0) {
    try {
      const parsed = JSON.parse(wsResult.stdout);
      workspaceId = parsed[0]?.results?.[0]?.id;
    } catch { /* empty */ }
  }
  if (!workspaceId) {
    console.error('No workspace found for organization', organizationId, '. Specify --workspace <id>.');
    process.exit(1);
  }
  return { organizationId, workspaceId };
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

function buildInsertSql(platform, { organizationId, workspaceId }) {
  const sourceId = `competitor-seed:${platform.name}`;
  const content = `Competitor: ${platform.name}\nURL: ${platform.url || '(none)'}\nCategory: ${platform.category}\nVerification: ${platform.note}\nSource: platforms_from_pdf-1.xlsx (52-platform competitor index, verified 2026-09-11)`;
  const tags = JSON.stringify(['competitor', 'research', platform.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')]);
  return `INSERT INTO Memory (id, workspaceId, organizationId, type, content, source, sourceId, confidence, accessPolicy, lifecycle, tags, relatedMemoryIds, createdBy, createdAt, updatedAt) VALUES (lower(hex(randomblob(8)) || '-' || hex(randomblob(4)) || '-4' || substr(hex(randomblob(16)), 1, 3) || '-' || substr(hex(randomblob(16)), 1, 3) || '-' || substr(hex(randomblob(16)), 1, 12)), '${escapeSql(workspaceId)}', '${escapeSql(organizationId)}', 'knowledge', '${escapeSql(content)}', 'external', '${escapeSql(sourceId)}', 0.8, 'workspace', 'permanent', '${escapeSql(tags)}', '[]', 'system', datetime('now'), datetime('now'));`;
}

// Main
console.log(`\n=== Competitor Seed Script ===`);
console.log(`Platforms to seed: ${platforms.length}`);
console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY-RUN'}\n`);

if (shouldApply) {
  const { organizationId, workspaceId } = getOrgAndWorkspace();
  console.log(`Organization: ${organizationId}`);
  console.log(`Workspace: ${workspaceId}\n`);

  const existing = getExistingSourceIds();
  if (existing.size > 0) {
    console.log(`Found ${existing.size} existing competitor-seed records.`);
  }

  let inserted = 0;
  let skipped = 0;
  for (const platform of platforms) {
    const sourceId = `competitor-seed:${platform.name}`;
    if (existing.has(sourceId)) {
      console.log(`  SKIP: ${platform.name} (already seeded)`);
      skipped++;
      continue;
    }
    const sql = buildInsertSql(platform, { organizationId, workspaceId });
    const result = runWranglerCommand(['--command', sql]);
    if (result.status === 0) {
      console.log(`  INSERTED: ${platform.name}`);
      inserted++;
    } else {
      console.error(`  FAILED: ${platform.name} — ${result.stderr?.trim() || result.stdout?.trim()}`);
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped, ${platforms.length - inserted - skipped} failed.`);
} else {
  console.log('DRY RUN — would insert the following Memory records:\n');
  console.log('(Requires --org <id> --workspace <id> or auto-detect from D1)\n');
  for (const platform of platforms) {
    console.log(`  ${platform.name.padEnd(20)} ${platform.url || '(no URL)'.padEnd(40)} [${platform.category}]`);
  }
  console.log(`\nRun with --apply to insert into D1.`);
}
