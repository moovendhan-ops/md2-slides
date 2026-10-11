import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ship the Wasm engine and the syntax spec with the server functions that read them from disk.
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/wasm/slide_engine_bg.wasm", "./public/llms-full.txt"],
  },
  webpack(config, { isServer, webpack }) {
    // pptxgenjs references `node:fs`/`node:https` (Node-only paths it maps to `false` for browsers);
    // drop the `node:` scheme so webpack applies that mapping instead of failing on it.
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:(fs|https)$/, (r: { request: string }) => {
          r.request = r.request.slice("node:".length);
        }),
      );
    }
    // Browser-only libraries (PDF export, Mermaid diagrams, in-browser AI): keep them out of the
    // server (Worker) bundle, which Cloudflare caps in size. They are only loaded from effects
    // and event handlers, never while rendering on the server.
    if (isServer) {
      const browserOnly = ["jspdf", "pptxgenjs", "modern-screenshot", "mermaid", "@mlc-ai/web-llm"];
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
