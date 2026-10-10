import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { SlideEngine } from "../../../src/engine/engine";
import { encodeShare } from "../../../src/domain/share/codec";

/**
 * Pure(ish) tool implementations for the md2slides MCP server, kept apart
 * from the transport so they can be unit-tested with a real engine.
 */

export interface Context {
  engine: SlideEngine;
  /** Workspace root that decks are written under (the user's repo). */
  root: string;
  /** Base URL of the md2slides app, for preview links. */
  appUrl: string;
}

export interface Validation {
  ok: boolean;
  slides: number;
  titles: string[];
  problems: { line: number; severity: string; message: string }[];
}

export function validateDeck(ctx: Pick<Context, "engine">, markdown: string): Validation {
  const deck = ctx.engine.parse(markdown);
  const problems = deck.problems.map((p) => ({ line: p.line + 1, severity: p.sev, message: p.msg }));
  return {
    ok: deck.slides.length > 0 && !problems.some((p) => p.severity === "error"),
    slides: deck.slides.length,
    titles: deck.slides.map((s, i) => s.title || `Slide ${i + 1}`),
    problems,
  };
}

/** A view-only link that carries the deck itself (same format as the app's share links). */
export async function previewLink(ctx: Pick<Context, "appUrl">, markdown: string, path = "deck.md"): Promise<string> {
  const name = path.split("/").pop()!.replace(/\.md$/, "") || "deck";
  const encoded = await encodeShare({ v: 1, md: markdown, path, name, created: Date.now(), opts: { notes: true, download: true, present: false } });
  return `${ctx.appUrl.replace(/\/+$/, "")}/v#${encoded}`;
}

/** Resolve `path` inside `root`, refusing anything that escapes it or isn't a .md file. */
export function resolveInRoot(root: string, path: string): string {
  if (!path.trim() || isAbsolute(path)) throw new Error("path must be relative to the workspace, e.g. decks/q3-review.md");
  if (!path.endsWith(".md")) throw new Error("path must end with .md");
  const full = resolve(root, path);
  const rel = relative(resolve(root), full);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("path must stay inside the workspace");
  return full;
}

export interface WriteArgs {
  path: string;
  markdown: string;
  /** Replace an existing file (create_deck refuses by default). */
  overwrite?: boolean;
  /** Write even when the deck has parser errors. */
  force?: boolean;
}

export async function writeDeck(ctx: Context, args: WriteArgs, mode: "create" | "update") {
  const full = resolveInRoot(ctx.root, args.path);
  const exists = existsSync(full);
  if (mode === "create" && exists && !args.overwrite) throw new Error(`${args.path} already exists: use update_deck, or overwrite: true`);
  if (mode === "update" && !exists) throw new Error(`${args.path} does not exist: use create_deck`);
  const markdown = args.markdown.endsWith("\n") ? args.markdown : args.markdown + "\n";
  const validation = validateDeck(ctx, markdown);
  if (!validation.ok && !args.force) return { written: false as const, path: args.path, validation };
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, markdown);
  return {
    written: true as const,
    path: args.path,
    /** Absolute location, so the user knows where the deck landed. */
    file: full,
    validation,
    preview: await previewLink(ctx, markdown, args.path),
    next: "Commit and push this file: it appears in the md2slides dashboard (Repositories) and in the VS Code extension. The preview link opens it right away.",
  };
}

export function readDeck(ctx: Pick<Context, "root">, path: string): string {
  return readFileSync(resolveInRoot(ctx.root, path), "utf8");
}
