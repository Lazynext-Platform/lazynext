/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
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
};

export default nextConfig;
