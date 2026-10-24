import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Material Mail is a per-user, always-fresh app, so route-level caching is intentionally off.
  poweredByHeader: false,
};

export default nextConfig;
