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
  // Redirect old ad-studio routes to the creative hub
  async redirects() {
    return [
      // Old studio pages → creative hub
      { source: '/creative-studio', destination: '/creative', permanent: true },
      { source: '/creative-director', destination: '/creative', permanent: true },
      { source: '/lazynext-studio', destination: '/creative', permanent: true },
      { source: '/ugc-studio', destination: '/creative', permanent: true },
      { source: '/narrative-studio', destination: '/creative', permanent: true },
      { source: '/drama-studio', destination: '/creative', permanent: true },
      { source: '/image-studio', destination: '/creative', permanent: true },
      { source: '/audio-studio', destination: '/creative', permanent: true },
      // Old pipeline → creative pipelines
      { source: '/pipeline', destination: '/creative/pipelines', permanent: true },
      { source: '/workflow-builder', destination: '/creative/pipelines', permanent: true },
      // Old inspiration → creative
      { source: '/inspiration', destination: '/creative', permanent: true },
      { source: '/ml-insights', destination: '/analytics', permanent: true },
      { source: '/performance', destination: '/analytics', permanent: true },
      { source: '/analytics-hub', destination: '/analytics', permanent: true },
      // Old media → files
      { source: '/media-service-boundary', destination: '/files', permanent: true },
      { source: '/clip-editor', destination: '/creative', permanent: true },
      // Old skills → agents
      { source: '/skills', destination: '/agents', permanent: true },
      { source: '/skill-chains', destination: '/agents', permanent: true },
      // Old safety → integrations
      { source: '/meta-safety', destination: '/integrations', permanent: true },
      { source: '/google-safety', destination: '/integrations', permanent: true },
      // /mcp-server is now a real page that renders the MCP server UI component.
      // It calls /api/mcp (protocol 2026-07-28) — no redirect needed.
    ];
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
      // Legal pages are static content — cache at edge for 1 hour, revalidate
      {
        source: '/terms',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/privacy',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/cookies',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/acceptable-use',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/ai-policy',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api-terms',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/dpa',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/subprocessors',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/security',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      // API v1 metadata endpoint — cache briefly
      {
        source: '/api/v1',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' },
        ],
      },
      // MCP metadata (GET) — cache briefly
      {
        source: '/mcp',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' },
        ],
      },
      // OAuth protected resource metadata — cache for 1 hour
      {
        source: '/.well-known/oauth-protected-resource',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
