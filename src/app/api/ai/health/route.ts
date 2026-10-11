import { NextResponse } from "next/server";
import { resolveAi } from "@/server/ai";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

/**
 * GET → is the AI endpoint configured and answering? Reports provider, model
 * and latency; never the key.
 */
export async function GET(req: Request) {
  const ai = resolveAi();
  if (!ai) return NextResponse.json({ configured: false, ok: false, error: "Add the Workers AI binding, or set AI_BASE_URL, AI_API_KEY and AI_MODEL on the server" }, { headers: noStore });
  const wait = rateLimit(`ai-health:${clientIp(req)}`, 12, 60_000);
  if (wait) return NextResponse.json({ error: `Checked too often — try again in ${wait}s` }, { status: 429, headers: noStore });
  const result = await ai.ping();
  return NextResponse.json({ configured: true, provider: ai.label, model: ai.model, ...result }, { headers: noStore });
}
