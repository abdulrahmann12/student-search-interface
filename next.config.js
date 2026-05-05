/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tree-shake large packages so only used exports land in the client bundle
  experimental: {
    optimizePackageImports: ['xlsx'],
  },
};

export default nextConfig;
