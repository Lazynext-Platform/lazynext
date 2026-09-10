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
  // Client-side only packages — don't bundle into the server worker
  '@ffmpeg/ffmpeg',
  '@ffmpeg/util',
  // Local-only packages — not used in the Cloudflare Worker (production uses D1)
  'better-sqlite3',
  '@prisma/adapter-better-sqlite3',
  // Native image processing — not compatible with workerd, externalize to avoid bundling
  'sharp',
  '@img/sharp-darwin-arm64',
  '@img/sharp-libvips-darwin-arm64',
  '@img/sharp-wasm32',
  '@img/sharp-linux-x64',
  '@img/sharp-linux-arm64',
  '@img/sharp-linux-arm',
  '@img/colour',
  // Prisma CLI-only transitive deps — never needed at runtime in the worker
  'effect',
  'elkjs',
  '@electric-sql/pglite',
  '@electric-sql/pglite-socket',
  '@electric-sql/pglite-tools',
  // AWS SDK — transitive dep of @opennextjs/aws, not used by the Cloudflare adapter
  // (Cloudflare R2 is accessed via bindings, not the AWS SDK)
  '@aws-sdk/client-s3',
  '@aws-sdk/core',
  '@aws-sdk/credential-providers',
  '@smithy',
  // Prisma WASM base64 files — NOT used by the workerd runtime path.
  // The workerd path uses wasm-worker-loader.mjs which imports the .wasm file
  // directly. These base64 .js files are only used by the default/node condition.
  // Externalizing them prevents esbuild from bundling ~4.3 MB of unused base64.
  '@prisma/client/runtime/query_compiler_fast_bg.sqlite.wasm-base64.js',
];

export default config;
