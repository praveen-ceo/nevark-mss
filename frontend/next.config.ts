import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker standalone image (copies only what's needed to run)
  output: "standalone",
};

export default nextConfig;
