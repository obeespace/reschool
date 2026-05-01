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
    if (isServer) {
      config.externals = [...(config.externals || []), '@libsql/client'];
    }
    return config;
  },
};

export default nextConfig;
