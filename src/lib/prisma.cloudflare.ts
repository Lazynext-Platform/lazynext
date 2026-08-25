import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Create a fresh PrismaClient per request to avoid cross-request promise
// resolution issues in the Cloudflare Workers runtime. The WeakMap cache
// previously shared a single client across concurrent requests in the same
// isolate, causing intermittent 500/hang errors when RSC page renders and
// API calls raced (D4). Creating per-request is cheap because PrismaD1 is
// a thin wrapper around the D1 binding.
function makeClient(): PrismaClient {
  const { env } = getCloudflareContext();
  const db = (env as unknown as { DB?: object }).DB;
  if (!db) {
    throw new Error('D1 binding "DB" not found — check wrangler.jsonc d1_databases');
  }
  return new PrismaClient({
    adapter: new PrismaD1(db as ConstructorParameters<typeof PrismaD1>[0]),
  });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = makeClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
