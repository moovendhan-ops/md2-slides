import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ship the Wasm engine and the syntax spec with the server functions that read them from disk.
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/wasm/slide_engine_bg.wasm", "./public/llms-full.txt"],
  },
  webpack(config, { isServer }) {
    // PDF export runs only in the browser; keep its libraries out of the server (Worker) bundle.
    if (isServer) config.resolve.alias = { ...config.resolve.alias, jspdf: false, "modern-screenshot": false };
    return config;
  },
  async headers() {
    return [
      {
        source: "/wasm/:file*",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
