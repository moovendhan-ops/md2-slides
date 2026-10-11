import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ship the Wasm engine and the syntax spec with the server functions that read them from disk.
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/wasm/slide_engine_bg.wasm", "./public/llms-full.txt"],
  },
  webpack(config, { isServer }) {
    // Browser-only libraries (PDF export, Mermaid diagrams, in-browser AI): keep them out of the
    // server (Worker) bundle, which Cloudflare caps in size. They are only loaded from effects
    // and event handlers, never while rendering on the server.
    if (isServer) {
      const browserOnly = ["jspdf", "modern-screenshot", "mermaid", "@mlc-ai/web-llm"];
      config.resolve.alias = { ...config.resolve.alias, ...Object.fromEntries(browserOnly.map((m) => [m, false])) };
    }
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
