import "server-only";
import { deltaOf, sseData } from "./sse";
import { AiRequestError, type AiConfig, type ChatPrompt, type PingResult } from "./types";

interface ChatResponse {
  error?: { message?: string } | string;
  choices?: { message?: { content?: string | { text?: string }[] }; finish_reason?: string }[];
}

const errorText = (j: { error?: { message?: string } | string }, fallback: string) => (typeof j.error === "string" ? j.error : j.error?.message) || fallback;
const url = (c: AiConfig, path: string) => `${c.baseUrl.replace(/\/+$/, "")}/${path}`;
const headers = (c: AiConfig) => ({ authorization: `Bearer ${c.apiKey}`, "content-type": "application/json" });

/** `POST /chat/completions` and return the assistant's text. */
export async function chatCompletion(c: AiConfig, p: ChatPrompt, signal: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url(c, "chat/completions"), {
      method: "POST",
      signal,
      headers: headers(c),
      body: JSON.stringify({
        model: c.model,
        messages: [
          { role: "system", content: p.system },
          { role: "user", content: p.user },
        ],
        max_tokens: p.maxTokens,
        temperature: 0.7,
      }),
    });
  } catch (e) {
    throw new AiRequestError(0, (e as Error).name === "TimeoutError" ? "Timed out" : `Network error: ${(e as Error).message}`);
  }
  const j = (await res.json().catch(() => ({}))) as ChatResponse;
  if (!res.ok) throw new AiRequestError(res.status, errorText(j, res.statusText || "AI request failed"));
  const content = j.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((x) => x.text ?? "").join("") : (content ?? "");
  if (!text.trim()) throw new AiRequestError(0, `The model returned no text (${j.choices?.[0]?.finish_reason ?? "unknown"})`);
  return text;
}

/** `POST /chat/completions` with `stream: true`, yielding text deltas as they arrive. */
export async function* chatStream(c: AiConfig, p: ChatPrompt, signal: AbortSignal): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch(url(c, "chat/completions"), {
      method: "POST",
      signal,
      headers: headers(c),
      body: JSON.stringify({
        model: c.model,
        messages: [
          { role: "system", content: p.system },
          { role: "user", content: p.user },
        ],
        max_tokens: p.maxTokens,
        temperature: 0.7,
        stream: true,
      }),
    });
  } catch (e) {
    throw new AiRequestError(0, (e as Error).name === "TimeoutError" ? "Timed out" : `Network error: ${(e as Error).message}`);
  }
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => ({}))) as ChatResponse;
    throw new AiRequestError(res.status, errorText(j, res.statusText || "AI request failed"));
  }
  for await (const data of sseData(res.body)) {
    const d = deltaOf(data);
    if (d) yield d;
  }
}

/**
 * Check the API is reachable and accepts the key: list models (free), and
 * fall back to a 1-token completion for endpoints without `/models`.
 */
export async function ping(c: AiConfig, timeoutMs = 10_000): Promise<PingResult> {
  const t0 = Date.now();
  const ms = () => Date.now() - t0;
  try {
    const res = await fetch(url(c, "models"), { headers: headers(c), signal: AbortSignal.timeout(timeoutMs) });
    const j = (await res.json().catch(() => ({}))) as { data?: { id?: string }[]; error?: { message?: string } | string };
    if (res.ok && Array.isArray(j.data)) {
      const ids = j.data.map((m) => (m.id ?? "").replace(/^models\//, ""));
      return { ok: true, method: "models", latencyMs: ms(), status: res.status, models: ids.length, modelListed: ids.includes(c.model.replace(/^models\//, "")) };
    }
    if (res.status === 401 || res.status === 403) return { ok: false, method: "models", latencyMs: ms(), status: res.status, error: errorText(j, "The API key was rejected") };
  } catch (e) {
    if ((e as Error).name === "TimeoutError") return { ok: false, method: "models", latencyMs: ms(), error: "Timed out" };
  }
  try {
    await chatCompletion(c, { system: "Reply with OK.", user: "ping", maxTokens: 1 }, AbortSignal.timeout(timeoutMs));
    return { ok: true, method: "chat", latencyMs: ms() };
  } catch (e) {
    const err = e instanceof AiRequestError ? e : new AiRequestError(0, (e as Error).message);
    // A 1-token reply can come back empty; the request itself succeeded.
    if (err.status === 0 && err.message.startsWith("The model returned no text")) return { ok: true, method: "chat", latencyMs: ms() };
    return { ok: false, method: "chat", latencyMs: ms(), status: err.status || undefined, error: err.message };
  }
}
