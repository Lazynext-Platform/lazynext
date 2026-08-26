import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// OpenNext Cloudflare adapter. Prisma uses queryCompiler(engineType=client) + D1 driver adapter,
// no Rust engine / no eval, runs on Workers (nodejs_compat).
const config = defineCloudflareConfig({});

// next-auth v4's openid-client requires node:https https.request(); unenv stubs it as
// notImplemented, but workerd (2024-09-23+ nodejs_compat) natively supports node:http/https.
// Externalize them from the bundle so workerd's real implementation is used instead of unenv's stub.
(config as unknown as { edgeExternals: string[] }).edgeExternals = [
  'node:crypto',
  'node:http',
  'node:https',
];

export default config;
