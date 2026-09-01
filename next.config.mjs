/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  // Optimize barrel imports for large icon/dependency libraries to avoid
  // pulling the entire package into client bundles.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Turbopack (used by `next dev` in Next.js 16) ignores webpack config, so we
  // mirror the async_hooks client alias here. The bare `async_hooks` specifier
  // resolves normally server-side (Node.js / workerd nodejs_compat) but must be
  // stubbed away in browser bundles — client component graphs transitively
  // import it (page → atlas.ts → request-context.ts) but never call it.
  turbopack: {
    resolveAlias: {
      // Conditionally alias only for the browser target; server keeps the real
      // Node.js built-in.
      async_hooks: { browser: './src/lib/empty-stub.ts' },
      'node:async_hooks': { browser: './src/lib/empty-stub.ts' },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'node:async_hooks': false,
      };
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        async_hooks: false,
        'node:async_hooks': false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'static.atlascloud.ai' },
      { protocol: 'https', hostname: '**.atlascloud.ai' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.(mp4|webm|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|css|js)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
