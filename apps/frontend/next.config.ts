import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker production images.
  // The image only contains server.js + static files — no node_modules bloat.
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  // Allow images from any domain (adjust to your actual domains in prod)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
