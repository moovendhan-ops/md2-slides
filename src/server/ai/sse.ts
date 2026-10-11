import "server-only";

/** Yield each `data:` payload of a server-sent-events stream, stopping at `[DONE]`. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        if (data) yield data;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** Text delta of one streamed chunk: Workers AI `{ response }` or OpenAI-style `choices[0].delta.content`. */
export function deltaOf(data: string): string {
  try {
    const j = JSON.parse(data) as { response?: unknown; choices?: { delta?: { content?: string } }[] };
    if (typeof j.response === "string") return j.response;
    return j.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}
