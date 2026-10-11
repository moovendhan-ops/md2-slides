import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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
      ai.run(model, {
        messages: [
          { role: "system", content: p.system },
          { role: "user", content: p.user },
        ],
        max_tokens: p.maxTokens,
        temperature: 0.7,
      }),
      aborted,
    ]);
  } catch (e) {
    if (e instanceof AiRequestError) throw e;
    const msg = (e as Error).message || "Workers AI request failed";
    // Workers AI reports quota/capacity errors as text, e.g. "3036: Account limited…" or "3040: Out of capacity".
    throw new AiRequestError(/\b(3036|3040|429)\b|rate limit|capacity/i.test(msg) ? 429 : 0, msg);
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
