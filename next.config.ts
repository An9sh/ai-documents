import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add any image domains you need to use with next/image
  },
  // Enable experimental features if needed
  // experimental: {
  //   appDir: true,
  // }
};

export default nextConfig;
