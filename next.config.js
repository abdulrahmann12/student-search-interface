/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tree-shake large packages so only used exports land in the client bundle
  experimental: {
    optimizePackageImports: ['xlsx'],
  },
  // Prevent Next.js from trying to bundle server-only packages into client chunks
  serverExternalPackages: ['mysql2', 'bcryptjs'],
};

export default nextConfig;
