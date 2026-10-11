import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { deltaOf, sseData } from "./sse";
import { AiRequestError, type ChatPrompt, type PingResult } from "./types";

/** The parts of the Cloudflare Workers AI binding (`env.AI`) used here. */
export interface WorkersAiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

/** A small, fast instruction model; override with `WORKERS_AI_MODEL`. */
export const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

/** The `AI` binding when running on Cloudflare Workers with `"ai": { "binding": "AI" }`, else `null`. */
export function workersAiBinding(): WorkersAiBinding | null {
  try {
    const ai = (getCloudflareContext().env as { AI?: WorkersAiBinding }).AI;
    return ai && typeof ai.run === "function" ? ai : null;
  } catch {
    return null; // Not running on Workers.
  }
}

/** Text from a Workers AI result: `{ response }` for most models, OpenAI-style `choices` for some. */
function textOf(out: unknown): string {
  const o = out as { response?: unknown; choices?: { message?: { content?: string } }[] } | null;
  if (typeof o?.response === "string") return o.response;
  if (o?.response && typeof o.response === "object") return JSON.stringify(o.response);
  return o?.choices?.[0]?.message?.content ?? "";
}

const input = (p: ChatPrompt, stream: boolean) => ({
  messages: [
    { role: "system", content: p.system },
    { role: "user", content: p.user },
  ],
  max_tokens: p.maxTokens,
  temperature: 0.7,
  ...(stream ? { stream: true } : {}),
});

function requestError(e: unknown) {
  if (e instanceof AiRequestError) return e;
  const msg = (e as Error).message || "Workers AI request failed";
  // Workers AI reports quota/capacity errors as text, e.g. "3036: Account limited…" or "3040: Out of capacity".
  return new AiRequestError(/\b(3036|3040|429)\b|rate limit|capacity/i.test(msg) ? 429 : 0, msg);
}

/** Stream a chat prompt on the Workers AI binding, yielding text deltas. */
export async function* streamWorkersAi(ai: WorkersAiBinding, model: string, p: ChatPrompt, signal: AbortSignal): AsyncGenerator<string> {
  let body: unknown;
  try {
    body = await ai.run(model, input(p, true));
  } catch (e) {
    throw requestError(e);
  }
  if (!(body instanceof ReadableStream)) {
    // Some models ignore `stream`; hand back the whole reply at once.
    const text = textOf(body);
    if (text) yield text;
    return;
  }
  const stop = () => body.cancel().catch(() => {});
  signal.addEventListener("abort", stop, { once: true });
  try {
    for await (const data of sseData(body as ReadableStream<Uint8Array>)) {
      if (signal.aborted) throw new AiRequestError(0, "Timed out");
      const d = deltaOf(data);
      if (d) yield d;
    }
  } finally {
    signal.removeEventListener("abort", stop);
  }
}

/** Run a chat prompt on the Workers AI binding and return the assistant's text. */
export async function runWorkersAi(ai: WorkersAiBinding, model: string, p: ChatPrompt, signal: AbortSignal): Promise<string> {
  const aborted = new Promise<never>((_, reject) => {
    const stop = () => reject(new AiRequestError(0, "Timed out"));
    if (signal.aborted) stop();
    signal.addEventListener("abort", stop, { once: true });
  });
  let out: unknown;
  try {
    out = await Promise.race([
      ai.run(model, input(p, false)),
      aborted,
    ]);
  } catch (e) {
    throw requestError(e);
  }
  const text = textOf(out);
  if (!text.trim()) throw new AiRequestError(0, "The model returned no text");
  return text;
}

/** Check the binding answers by asking for a 1-token completion. */
export async function pingWorkersAi(ai: WorkersAiBinding, model: string, timeoutMs = 10_000): Promise<PingResult> {
  const t0 = Date.now();
  try {
    await runWorkersAi(ai, model, { system: "Reply with OK.", user: "ping", maxTokens: 1 }, AbortSignal.timeout(timeoutMs));
  } catch (e) {
    const err = e as AiRequestError;
    // A 1-token reply can come back empty; the request itself succeeded.
    if (!err.message?.startsWith("The model returned no text")) return { ok: false, method: "chat", latencyMs: Date.now() - t0, status: err.status || undefined, error: err.message };
  }
  return { ok: true, method: "chat", latencyMs: Date.now() - t0 };
}
