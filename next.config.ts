import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Assets are static files; the runtime image optimizer is intentionally off (ADR-0001, ADR-0004).
  images: { unoptimized: true },
};

export default nextConfig;
