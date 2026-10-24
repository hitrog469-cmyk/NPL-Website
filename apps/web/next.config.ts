import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  transpilePackages: ["@npl/cricket-core", "@npl/data"],
  // Workspace root, so Turbopack resolves the shared packages and /data.
  turbopack: { root: path.join(__dirname, "../..") },
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Pages read /data with fs at runtime too (on-demand football pages and
  // every hourly revalidation), so the server functions must ship it (~8 MB).
  outputFileTracingIncludes: { "/**": ["../../data/**/*"] },
  // Short, phone-friendly address for the scorer. Redirect matching ignores
  // case, so never add a rule whose source differs from its destination only
  // by case: it loops.
  async redirects() {
    return [{ source: "/score", destination: "/studio/scorer", permanent: false }];
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
