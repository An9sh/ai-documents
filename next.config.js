/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve server-only modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        crypto: false,
        stream: false,
        os: false,
        path: false,
        net: false,
        dns: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig 