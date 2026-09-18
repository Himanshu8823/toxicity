import type { NextConfig } from 'next';

/**
 * `/api/*` is rewritten to the Express backend so the browser only ever talks
 * to its own origin — this replaces the `proxy` field the old CRA app used.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000';

const nextConfig: NextConfig = {
  // Turbopack's native Windows binary crashes silently on this machine
  // (vercel/next.js#95015), so `dev` and `build` run webpack via --webpack.

  // The repo has lockfiles at both the monorepo root and here, so Next has to
  // be told which directory is the app's root instead of guessing.
  outputFileTracingRoot: import.meta.dirname,
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
