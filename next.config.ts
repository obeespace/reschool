import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize production builds
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Compress output
  compress: true,
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'sonner'],
  },
  webpack: (config, { isServer }) => {
    // During Cloudflare builds, replace @libsql/client with a no-op stub.
    // @libsql/client v0.15.x has a broken "workerd" export that esbuild
    // cannot resolve. The stub is safe because the Worker always uses the
    // D1 binding (globalThis.DB) and never calls createLocalLibsqlClient.
    if (isServer && process.env.CLOUDFLARE_BUILD === '1') {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        '@libsql/client': path.resolve(__dirname, 'app/db/libsql-noop.ts'),
        '@libsql/client/web': path.resolve(__dirname, 'app/db/libsql-noop.ts'),
      };
    }
    return config;
  },
};

export default nextConfig;
