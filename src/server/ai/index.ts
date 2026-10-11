import "server-only";
import { env } from "../env";
import { chatCompletion, ping } from "./openai-compatible";
import type { ChatPrompt, PingResult } from "./types";
import { DEFAULT_WORKERS_AI_MODEL, pingWorkersAi, runWorkersAi, workersAiBinding } from "./workers-ai";

/** The AI backend this request uses, whichever kind it is. */
export interface AiClient {
  label: string;
  model: string;
  chat(p: ChatPrompt, signal: AbortSignal): Promise<string>;
  ping(): Promise<PingResult>;
}

/**
 * Cloudflare Workers AI through the `AI` binding when deployed (no API key needed), otherwise the
 * OpenAI-compatible endpoint from `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` (local dev, other hosts).
 * `null` when neither is available.
 */
export function resolveAi(): AiClient | null {
  const binding = workersAiBinding();
  if (binding) {
    const model = process.env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL;
    return {
      label: "Cloudflare Workers AI",
      model,
      chat: (p, signal) => runWorkersAi(binding, model, p, signal),
      ping: () => pingWorkersAi(binding, model),
    };
  }
  const c = env.ai();
  if (!c) return null;
  return { label: c.label, model: c.model, chat: (p, signal) => chatCompletion(c, p, signal), ping: () => ping(c) };
}
