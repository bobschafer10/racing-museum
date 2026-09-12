import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Render occasionally sees slower network/database response times while
  // Next.js is prerendering Supabase-backed museum pages. Keep the normal
  // static/ISR behavior, but give legitimate page-data work more headroom
  // than Next's 60-second default so a transient slowdown does not fail an
  // otherwise healthy deployment.
  staticPageGenerationTimeout: 180,
};

export default nextConfig;
