import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mmail is a per-user, always-fresh app, so route-level caching is intentionally off.
  poweredByHeader: false,
};

export default nextConfig;
