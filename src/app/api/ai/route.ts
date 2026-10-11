import fs from "node:fs/promises";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { resolveAi, type AiClient } from "@/server/ai";
import { AiRequestError, type ChatPrompt } from "@/server/ai/types";
import { notify } from "@/server/notify";
import { extractDeck } from "@/services/ai/extract-deck";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  prompt?: string;
  slides?: number;
  /** A deck to revise: `prompt` is then the change to make. */
  current?: string;
  /** Stream NDJSON lines (`{provider, model}`, `{d}` deltas, then `{done}` or `{error}`) instead of one JSON reply. */
  stream?: boolean;
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

/**
 * POST { prompt, slides, current?, stream? } → { markdown, provider, model }, or an NDJSON stream.
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

  const current = typeof b.current === "string" ? b.current.trim() : "";
  if (current.length > 40_000) return fail("the deck to revise is too long (max 40000 characters)", 400);

  const slides = Math.min(20, Math.max(2, Number(b.slides) || 6));
  const finish = "Return ONLY the Markdown file, starting with the front-matter --- line. No explanations, no code fences.";
  const chat = {
    system: `You write slide decks in md2slides Markdown. Follow this specification exactly:\n\n${await loadSpec(req.url)}`,
    user: current
      ? `Here is the current deck:\n\n${current}\n\nRevise it with this change:\n${prompt}\n\nKeep everything the change does not ask to alter. Return the complete updated deck. ${finish}`
      : `Write a deck of about ${slides} slides for this request:\n${prompt}\n\n${finish}`,
    maxTokens: 3000,
  };
  if (b.stream) return streamDeck(ai, chat);

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

/** Stream the model's output as NDJSON so the editor can render slides while they are written. */
function streamDeck(ai: AiClient, chat: ChatPrompt) {
  const enc = new TextEncoder();
  const signal = AbortSignal.timeout(90_000);
  const body = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      send({ provider: ai.label, model: ai.model });
      let text = "";
      try {
        for await (const d of ai.stream(chat, signal)) {
          text += d;
          send({ d });
        }
        if (!hasSlides(extractDeck(text))) throw new AiRequestError(0, "The model's output contained no slides");
        send({ done: true });
      } catch (e) {
        const err = e instanceof AiRequestError ? e : new AiRequestError(0, (e as Error).message);
        notify("error", "AI generation failed", { provider: ai.label, model: ai.model, status: String(err.status), error: err.message });
        send({ error: err.rateLimited ? `${ai.label} is rate limiting requests — try again shortly` : `AI generation failed: ${err.message}` });
      }
      ctrl.close();
    },
  });
  return new Response(body, { headers: { ...noStore, "content-type": "application/x-ndjson; charset=utf-8", "x-accel-buffering": "no" } });
}
