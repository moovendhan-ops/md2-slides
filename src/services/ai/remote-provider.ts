import { extractDeck } from "./extract-deck";
import type { AiDeckService, AiHealth, DeckDraft, GenerateOptions } from "./types";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Calls `/api/ai` (generation) and `/api/ai/health` (ping), backed by the server's AI endpoint. */
export class RemoteAiProvider implements AiDeckService {
  /** Streams the deck (NDJSON) so `onToken` sees it as it is written. */
  async generate(prompt: string, opts?: GenerateOptions): Promise<DeckDraft> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, slides: opts?.slides ?? 6, current: opts?.current || undefined, stream: true }),
      signal: opts?.signal,
      cache: "no-store",
    });
    if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("ndjson")) {
      const j = (await res.json().catch(() => ({}))) as Partial<DeckDraft> & { error?: string };
      if (res.ok && j.markdown) return { markdown: j.markdown, provider: j.provider ?? "Remote AI", model: j.model ?? "" };
      throw new AiError(j.error || `AI request failed (${res.status})`, res.status);
    }

    let provider = "Remote AI";
    let model = "";
    let text = "";
    let done = false;
    const t0 = performance.now();
    let chunks = 0;
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    const handle = (line: string) => {
      if (!line.trim()) return;
      const m = JSON.parse(line) as { provider?: string; model?: string; d?: string; done?: boolean; error?: string };
      if (m.error) throw new AiError(m.error, 502);
      if (m.provider) provider = m.provider;
      if (m.model) model = m.model;
      if (m.done) done = true;
      if (m.d) {
        text += m.d;
        chunks++;
        opts?.onToken?.(text, m.d);
      }
    };
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += value;
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        handle(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
      }
    }
    handle(buf);
    if (!done) throw new AiError("The AI response was cut off — try again", 502);
    const secs = (performance.now() - t0) / 1000;
    return {
      markdown: extractDeck(text),
      provider,
      model,
      stats: { tokensPerSecond: secs > 0 ? Math.round(chunks / secs) : undefined, totalTokens: chunks },
    };
  }

  async health(): Promise<AiHealth> {
    const res = await fetch("/api/ai/health", { cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as Partial<AiHealth>;
    if (!res.ok) {
      return { configured: true, ok: false, error: j.error || `Health check failed (${res.status})` };
    }
    return { configured: false, ok: false, ...j };
  }
}
