import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cache the PrismaClient per Workers isolate. Each isolate is
// single-threaded, so reusing the client within the same isolate is safe
// and avoids the CPU cost of re-initializing the WASM query compiler on
// every request — a critical optimization for the 10ms CPU limit on the
// Cloudflare Workers free plan.
//
// The no_handle_cross_request_promise_resolution compatibility flag
// prevents cross-request promise resolution, so even if a Prisma promise
// from request A is still pending when request B arrives, workerd will
// not resolve it across the request boundary.
const globalForPrisma = globalThis as unknown as {
  __prismaClient?: PrismaClient;
  __prismaEnv?: unknown;
};

function getClient(): PrismaClient {
  const { env } = getCloudflareContext();
  // Reuse cached client if the env (D1 binding) hasn't changed
  if (globalForPrisma.__prismaClient && globalForPrisma.__prismaEnv === env) {
    return globalForPrisma.__prismaClient;
  }
  const db = (env as unknown as { DB?: object }).DB;
  if (!db) {
    throw new Error('D1 binding "DB" not found — check wrangler.jsonc d1_databases');
  }
  const client = new PrismaClient({
    adapter: new PrismaD1(db as ConstructorParameters<typeof PrismaD1>[0]),
  });
  globalForPrisma.__prismaClient = client;
  globalForPrisma.__prismaEnv = env;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
