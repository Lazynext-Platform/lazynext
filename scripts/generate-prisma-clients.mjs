import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalSchemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
const prismaBin = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);

function generate(schemaPath) {
  const result = spawnSync(prismaBin, ['generate', '--schema', schemaPath], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`prisma generate failed for ${path.relative(projectRoot, schemaPath)}`);
  }
}

// Only generate the canonical SQLite client (used by Cloudflare D1).
// The Neon/PostgreSQL client has been removed — the project is Cloudflare-only.
generate(canonicalSchemaPath);
