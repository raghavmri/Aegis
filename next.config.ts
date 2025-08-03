import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});
export const nextConfig: NextConfig = withPWA({
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
});

export default nextConfig;
