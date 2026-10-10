import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RootsListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import snippets from "../../../src/data/snippets.json";
import templates from "../../../src/data/templates.json";
import community from "../../../src/data/community.generated.json";
import spec from "../../../public/llms-full.txt";
import { loadNodeEngine } from "../../../src/engine/node";
import { BRAND } from "../../../src/lib/brand";
import { previewLink, readDeck, validateDeck, writeDeck, type Context } from "./handlers";

import { startLocalSlideServer } from "./local-server";
import { defaultRoot, rootFromClient } from "./workspace";

const VERSION = "0.1.5";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

/** An explicit workspace wins; otherwise the client's MCP roots (after connect), then defaultRoot(). */
const explicitRoot = arg("root") ?? process.env.MD2SLIDES_ROOT;

const ctx: Context = {
  engine: loadNodeEngine(() => readFileSync(fileURLToPath(new URL("./slide_engine_bg.wasm", import.meta.url)))),
  root: explicitRoot ?? defaultRoot(),
  appUrl: arg("app-url") ?? process.env.MD2SLIDES_APP_URL ?? BRAND.url,
};

// Check if user passed a file to open or preview directly via CLI
const directFile =
  arg("file") ??
  arg("open") ??
  process.argv.slice(2).find((a) => !a.startsWith("-") && a.endsWith(".md"));

if (directFile) {
  const portStr = arg("port");
  const port = portStr ? parseInt(portStr, 10) : 4321;
  await startLocalSlideServer(ctx, directFile, {
    port,
    open: !process.argv.includes("--no-open"),
  });
}

/** Settles once the workspace is known (the client's roots are read right after initialize). */
let workspaceReady: Promise<void> = Promise.resolve();

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: (e as Error).message }] });

const server = new McpServer(
  { name: "md2slides", version: VERSION },
  {
    instructions:
      "md2slides turns Markdown files into slide decks. Before writing a deck, call get_syntax once. Write decks with create_deck (it validates with the md2slides engine and writes the .md into the user's workspace); fix any reported problems with update_deck. Share the returned preview link with the user.",
  },
);

server.registerTool("get_syntax", { title: "md2slides syntax", description: "The full md2slides Markdown specification (blocks, layouts, themes, diagrams, presenter features). Read before writing a deck." }, async () => ({
  content: [{ type: "text", text: spec }],
}));

server.registerTool(
  "list_blocks",
  { title: "List blocks", description: "Ready-made md2slides blocks (cards, stats, flows, timelines, code, charts, Mermaid diagrams…) with their Markdown.", inputSchema: { query: z.string().optional().describe("Filter by label or category") } },
  async ({ query }) => {
    const q = query?.toLowerCase();
    return json(snippets.filter((s) => !q || `${s.label} ${s.cat}`.toLowerCase().includes(q)).map(({ label, cat, md }) => ({ label, category: cat, markdown: md })));
  },
);

server.registerTool("list_templates", { title: "List templates", description: "Built-in and community deck templates (with author credit), including their Markdown." }, async () =>
  json([
    ...templates.map((t) => ({ id: t.id, name: t.name, category: t.cat, author: t.author, markdown: t.md })),
    ...community.templates.map((t) => ({ id: t.id, name: t.name, category: t.cat, author: t.author, github: `https://github.com/${t.authorGithub}`, description: t.description, markdown: t.md })),
  ]),
);

server.registerTool(
  "validate_deck",
  { title: "Validate deck", description: "Parse deck Markdown with the md2slides engine and report slide count, titles and problems (line, severity, message).", inputSchema: { markdown: z.string() } },
  async ({ markdown }) => json(validateDeck(ctx, markdown)),
);

const writeSchema = {
  path: z.string().describe("File path relative to the workspace, ending in .md (e.g. decks/q3-review.md)"),
  markdown: z.string().describe("The complete deck in md2slides Markdown"),
  force: z.boolean().optional().describe("Write even if the deck has parser errors"),
};

server.registerTool(
  "create_deck",
  {
    title: "Create deck",
    description: "Validate and write a new deck .md file into the user's workspace/repo. Returns problems, a preview link and next steps. Refuses to overwrite unless overwrite is true.",
    inputSchema: { ...writeSchema, overwrite: z.boolean().optional() },
    annotations: { destructiveHint: false },
  },
  async (args) => workspaceReady.then(() => writeDeck(ctx, args, "create")).then(json, fail),
);

server.registerTool(
  "update_deck",
  { title: "Update deck", description: "Validate and replace the contents of an existing deck .md file in the workspace.", inputSchema: writeSchema, annotations: { destructiveHint: true } },
  async (args) => workspaceReady.then(() => writeDeck(ctx, args, "update")).then(json, fail),
);

server.registerTool(
  "read_deck",
  { title: "Read deck", description: "Read an existing deck .md file from the workspace.", inputSchema: { path: z.string() }, annotations: { readOnlyHint: true } },
  async ({ path }) => {
    try {
      await workspaceReady;
      return { content: [{ type: "text", text: readDeck(ctx, path) }] };
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "preview_link",
  { title: "Preview link", description: "A view-only link that opens the deck in the md2slides viewer (the deck travels inside the link; nothing is uploaded).", inputSchema: { markdown: z.string().optional(), path: z.string().optional() } },
  async ({ markdown, path }) => {
    try {
      await workspaceReady;
      const md = markdown ?? (path ? readDeck(ctx, path) : undefined);
      if (!md) throw new Error("Pass markdown or a workspace path");
      return json({ url: await previewLink(ctx, md, path) });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerPrompt(
  "new_deck",
  { title: "New md2slides deck", description: "Write a new deck about a topic and save it to the workspace.", argsSchema: { topic: z.string(), slides: z.string().optional(), path: z.string().optional() } },
  ({ topic, slides, path }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Write an md2slides deck of about ${slides ?? "8"} slides about: ${topic}.\nFirst call get_syntax, then create_deck with path "${path ?? "decks/new-deck.md"}". If problems are reported, fix them with update_deck. Finish by giving me the preview link.`,
        },
      },
    ],
  }),
);

/** Follow the client's workspace folder (MCP roots) when no --root was given. */
async function syncRootFromClient() {
  if (explicitRoot || !server.server.getClientCapabilities()?.roots) return;
  try {
    const root = rootFromClient((await server.server.listRoots()).roots);
    if (root) ctx.root = root;
  } catch (e) {
    console.error(`md2slides MCP: could not read the client's roots (${(e as Error).message})`);
  }
}

server.server.setNotificationHandler(RootsListChangedNotificationSchema, () => (workspaceReady = syncRootFromClient()));
server.server.oninitialized = () => {
  workspaceReady = syncRootFromClient().then(() => console.error(`md2slides MCP ${VERSION} ready · workspace ${ctx.root}`));
};

await server.connect(new StdioServerTransport());

