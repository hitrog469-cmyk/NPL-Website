import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  transpilePackages: ["@npl/cricket-core", "@npl/data"],
  // Workspace root, so Turbopack resolves the shared packages and /data.
  turbopack: { root: path.join(__dirname, "../..") },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Short, phone-friendly addresses for the scorer (paths are case-sensitive).
  async redirects() {
    return [
      { source: "/score", destination: "/studio/scorer", permanent: false },
      { source: "/Score", destination: "/studio/scorer", permanent: false },
      { source: "/Studio/:path*", destination: "/studio/:path*", permanent: false },
      { source: "/studio/scorer/Rehearsal", destination: "/studio/scorer/rehearsal", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default config;
