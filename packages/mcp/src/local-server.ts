import { createServer, type ServerResponse } from "node:http";
import { existsSync, readFileSync, watchFile, unwatchFile } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { exec } from "node:child_process";
import { encodeShare } from "../../../src/domain/share/codec";
import type { Context } from "./handlers";
import { validateDeck } from "./handlers";

function openBrowser(url: string) {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

export async function startLocalSlideServer(ctx: Context, filePath: string, opts: { port?: number; open?: boolean; version?: string } = {}) {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const baseDir = dirname(fileURLToPath(import.meta.url));
  const playerJsPath = join(baseDir, "player/player.js");
  const playerCssPath = join(baseDir, "player/player.css");
  const appCssPath = join(baseDir, "player/app.css");

  const playerJs = existsSync(playerJsPath) ? readFileSync(playerJsPath, "utf8") : "";
  const playerCss = existsSync(playerCssPath) ? readFileSync(playerCssPath, "utf8") : "";
  const appCss = existsSync(appCssPath) ? readFileSync(appCssPath, "utf8") : "";

  const wasmPath = join(baseDir, "slide_engine_bg.wasm");
  const wasmBinary = existsSync(wasmPath) ? readFileSync(wasmPath) : null;

  const getHtml = async () => {
    const md = readFileSync(fullPath, "utf8");
    const name = filePath.split("/").pop()!.replace(/\.md$/, "") || "deck";
    const encoded = await encodeShare({
      v: 1,
      md,
      path: filePath,
      name,
      created: Date.now(),
      opts: { notes: true, download: true, present: false },
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name} — md2slides</title>
  <style>
    ${appCss}
    ${playerCss}
  </style>
</head>
<body class="bg-zinc-950 text-zinc-50 overflow-hidden m-0 p-0">
  <div id="root"></div>
  <script>
    window.__MD2SLIDES_WASM__ = '/wasm/slide_engine_bg.wasm';
    window.__MD2SLIDES_DECK__ = ${JSON.stringify(encoded)};
  </script>
  <script>
    ${playerJs}
  </script>
  <script>
    // Live reload on markdown edits
    try {
      const evt = new EventSource('/_reload');
      evt.onmessage = (e) => {
        if (e.data === 'reload') window.location.reload();
      };
    } catch(e) {}
  </script>
</body>
</html>`;
  };

  const initialMd = readFileSync(fullPath, "utf8");
  const validation = validateDeck(ctx, initialMd);

  let port = opts.port ?? 4321;
  let sseClients: ServerResponse[] = [];

  const server = createServer(async (req, res) => {
    const url = req.url || "/";

    if (url === "/_reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      sseClients.push(res);
      req.on("close", () => {
        sseClients = sseClients.filter((c) => c !== res);
      });
      return;
    }

    // Serve Wasm engine binary
    if (url.endsWith(".wasm") || url.includes("slide_engine_bg")) {
      if (wasmBinary) {
        res.writeHead(200, {
          "Content-Type": "application/wasm",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(wasmBinary);
        return;
      }
    }

    try {
      const html = await getHtml();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end((e as Error).message);
    }
  });

  const notifyChange = () => {
    const md = readFileSync(fullPath, "utf8");
    const v = validateDeck(ctx, md);
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Updated ${filePath} (${v.slides} slides)`);
    for (const client of sseClients) {
      client.write("data: reload\n\n");
    }
  };

  watchFile(fullPath, { interval: 300 }, notifyChange);

  const tryListen = (currentPort: number) => {
    server.listen(currentPort, () => {
      const localUrl = `http://localhost:${currentPort}`;
      const ver = opts.version ? `v${opts.version}` : "v0.1.5";
      console.log(`\n✨ md2slides ${ver} (Local Server Mode)`);
      console.log(`📄 File: ${filePath} (${validation.slides} slide${validation.slides === 1 ? "" : "s"})`);
      console.log(`🌐 Local Slides Server: \x1b[36m${localUrl}\x1b[0m (Live Reload active)`);

      if (opts.open !== false) {
        console.log(`🚀 Opening browser at ${localUrl}...`);
        openBrowser(localUrl);
      }

      console.log(`\n⌨️  Press Ctrl+C to stop the local server.\n`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        tryListen(currentPort + 1);
      } else {
        console.error("Server error:", err);
      }
    });
  };

  tryListen(port);

  process.on("SIGINT", () => {
    unwatchFile(fullPath);
    server.close();
    process.exit(0);
  });
}
