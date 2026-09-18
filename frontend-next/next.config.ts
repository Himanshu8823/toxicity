import type { NextConfig } from 'next';

/**
 * `/api/*` is rewritten to the Express backend so the browser only ever talks
 * to its own origin — this replaces the `proxy` field the old CRA app used.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000';

const nextConfig: NextConfig = {
  // Pin the workspace root: the repo has lockfiles at both the monorepo root
  // and here, and Turbopack otherwise guesses (and warns) about which to use.
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      // YouTube thumbnails returned in `videoInfo.thumbnail`.
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
};

export default nextConfig;
