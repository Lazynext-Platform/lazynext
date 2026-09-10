import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// OpenNext Cloudflare adapter. Prisma uses queryCompiler(engineType=client) + D1 driver adapter,
// no Rust engine / no eval, runs on Workers (nodejs_compat).
const config = defineCloudflareConfig({});

// next-auth v4's openid-client requires node:https https.request(); unenv stubs it as
// notImplemented, but workerd (2024-09-23+ nodejs_compat) natively supports node:http/https.
// Externalize them from the bundle so workerd's real implementation is used instead of unenv's stub.
(config as unknown as { edgeExternals: string[] }).edgeExternals = [
  // Node.js built-ins that workerd supports natively with nodejs_compat.
  // Externalizing them prevents unenv polyfills from being bundled.
  'node:crypto',
  'node:http',
  'node:https',
  'node:buffer',
  'node:stream',
  'node:url',
  'node:util',
  'node:assert',
  'node:path',
  'node:events',
  'node:timers',
  'node:string_decoder',
  'node:zlib',
  'node:diagnostics_channel',
  'node:net',
  'node:tls',
  'node:dns',
  'node:os',
  'node:process',
  'node:perf_hooks',
  'node:async_hooks',
  // Client-side only packages — don't bundle into the server worker
  '@ffmpeg/ffmpeg',
  '@ffmpeg/util',
];

export default config;
