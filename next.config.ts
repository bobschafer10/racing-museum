import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/logos/tracks/:slug.jpg",
          destination: "/api/track-logo/:slug",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;