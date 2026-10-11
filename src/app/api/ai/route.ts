import fs from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { resolveAi } from "@/server/ai";
import { AiRequestError } from "@/server/ai/types";
import { notify } from "@/server/notify";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  prompt?: string;
  slides?: number;
}

/** Output that does not parse into slides is retried once; other failures are returned as-is. */
const ATTEMPTS = 2;

let spec: string | null = null;
/**
 * The syntax spec the model follows. On Cloudflare Workers there is no filesystem, so it comes
 * from the static-assets binding; on Node (dev, tests) it is read from disk.
 */
async function loadSpec(origin: string) {
  if (spec) return spec;
  try {
    const assets = (getCloudflareContext().env as { ASSETS?: { fetch: typeof fetch } }).ASSETS;
    const res = await assets?.fetch(new URL("/llms-full.txt", origin));
    if (res?.ok) return (spec = await res.text());
  } catch {
    // Not running on Workers.
  }
  return (spec = await fs.readFile(path.join(process.cwd(), "public", "llms-full.txt"), "utf8"));
}

/**
 * Cheap check that the model returned a deck: at least one slide title.
 * (The server-side Wasm engine can't load on Workers; the editor parses the result anyway.)
 */
const hasSlides = (md: string) => /^#{1,2}\s+\S/m.test(md);
const noStore = { "cache-control": "no-store" };
const fail = (msg: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error: msg, ...extra }, { status, headers: noStore });

/** Strip chat chatter / code fences so only the deck Markdown remains. */
function extractDeck(text: string) {
  let md = text.trim();
  const fence = md.match(/```(?:markdown|md)?\s*\n([\s\S]*?)\n```/);
  if (fence) md = fence[1];
  const fm = md.indexOf("---");
  if (fm > 0 && md.slice(0, fm).trim().split("\n").length <= 3) md = md.slice(fm);
  return md.trim() + "\n";
}

/**
 * POST { prompt, slides } → { markdown, provider, model }.
 * Uses Cloudflare Workers AI (the `AI` binding) on Workers, else the OpenAI-compatible endpoint.
 */
export async function POST(req: Request) {
  try {
    return await generate(req);
  } catch (e) {
    // Never answer with an empty 500: the dialog shows this message.
    notify("error", "AI route crashed", { error: (e as Error).message });
    return fail(`AI generation failed: ${(e as Error).message}`, 500);
  }
}

async function generate(req: Request) {
  const b = (await req.json().catch(() => null)) as Body | null;
  const prompt = b?.prompt?.trim();
  if (!b || !prompt) return fail("prompt is required", 400);
  if (prompt.length > 4000) return fail("prompt is too long (max 4000 characters)", 400);
  const ai = resolveAi();
  if (!ai) return fail("AI is not configured on the server (add the Workers AI binding, or set AI_BASE_URL, AI_API_KEY and AI_MODEL)", 503);
  const wait = rateLimit(`ai:${clientIp(req)}`, 10, 60_000);
  if (wait) return fail(`Too many generations — try again in ${wait}s`, 429, { retryAfter: wait });

  const slides = Math.min(20, Math.max(2, Number(b.slides) || 6));
  const chat = {
    system: `You write slide decks in md2slides Markdown. Follow this specification exactly:\n\n${await loadSpec(req.url)}`,
    user: `Write a deck of about ${slides} slides for this request:\n${prompt}\n\nReturn ONLY the Markdown file, starting with the front-matter --- line. No explanations, no code fences.`,
    maxTokens: 3000,
  };
  let lastError: AiRequestError | null = null;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const markdown = extractDeck(await ai.chat(chat, AbortSignal.timeout(60_000)));
      if (hasSlides(markdown)) return NextResponse.json({ markdown, provider: ai.label, model: ai.model }, { headers: noStore });
      lastError = new AiRequestError(0, "The model's output contained no slides");
    } catch (e) {
      lastError = e instanceof AiRequestError ? e : new AiRequestError(0, (e as Error).message);
      break;
    }
  }
  const err = lastError!;
  notify("error", "AI generation failed", { provider: ai.label, model: ai.model, status: String(err.status), error: err.message });
  if (err.rateLimited) return fail(`${ai.label} is rate limiting requests — try again shortly`, 429);
  return fail(`AI generation failed: ${err.message}`, 502);
}
