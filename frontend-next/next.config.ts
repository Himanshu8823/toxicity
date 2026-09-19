import type { NextConfig } from 'next';

/**
 * The Express backend that used to serve `/api/*` has been migrated into
 * Route Handlers under `app/api/`, so there is no longer a rewrite here —
 * requests are served by this app directly.
 */
const nextConfig: NextConfig = {
  // Turbopack's native Windows binary crashes silently on this machine
  // (vercel/next.js#95015), so `dev` and `build` run webpack via --webpack.

  // The repo has lockfiles at both the monorepo root and here, so Next has to
  // be told which directory is the app's root instead of guessing.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    remotePatterns: [
      // YouTube thumbnails returned in `videoInfo.thumbnail`.
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
};

export default nextConfig;
