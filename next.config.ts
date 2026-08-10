import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray lockfile lives higher up under the home dir).
  turbopack: { root: process.cwd() },
  images: {
    // Product/variant images: external URLs/placeholders + MinIO images the API
    // serves at http://localhost:3008/api/products/images/* (the gateway port).
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'localhost', port: '3008' },
    ],
    // Next 16 blocks optimizing local-IP sources by default (returns HTTP 400).
    // The API gateway is on localhost, so opt in for local dev.
    dangerouslyAllowLocalIP: true,
    // Next 16 restricts usable qualities to this list; allow higher-quality
    // encodes for large images like the hero banner.
    qualities: [75, 90, 100],
  },
};

export default nextConfig;
