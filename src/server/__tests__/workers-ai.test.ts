import { describe, expect, it, vi } from "vitest";
import { pingWorkersAi, runWorkersAi } from "@/server/ai/workers-ai";
import { AiRequestError } from "@/server/ai/types";

const prompt = { system: "s", user: "u", maxTokens: 5 };

describe("runWorkersAi", () => {
  it("runs the model with chat messages and returns the response text", async () => {
    const run = vi.fn().mockResolvedValue({ response: "# Deck" });
    expect(await runWorkersAi({ run }, "@cf/m", prompt, AbortSignal.timeout(1000))).toBe("# Deck");
    expect(run).toHaveBeenCalledWith("@cf/m", expect.objectContaining({ max_tokens: 5, messages: [{ role: "system", content: "s" }, { role: "user", content: "u" }] }));
  });

  it("accepts OpenAI-style output", async () => {
    const run = vi.fn().mockResolvedValue({ choices: [{ message: { content: "# Deck" } }] });
    expect(await runWorkersAi({ run }, "@cf/m", prompt, AbortSignal.timeout(1000))).toBe("# Deck");
  });

  it("maps capacity errors to a rate limit", async () => {
    const run = vi.fn().mockRejectedValue(new Error("3040: Capacity temporarily exceeded"));
    const err = await runWorkersAi({ run }, "@cf/m", prompt, AbortSignal.timeout(1000)).catch((e) => e);
    expect(err).toBeInstanceOf(AiRequestError);
    expect(err.rateLimited).toBe(true);
  });

  it("times out", async () => {
    const run = vi.fn(() => new Promise(() => {}));
    const err = await runWorkersAi({ run }, "@cf/m", prompt, AbortSignal.timeout(20)).catch((e) => e);
    expect(err.message).toBe("Timed out");
  });
});

describe("pingWorkersAi", () => {
  it("treats an empty 1-token reply as reachable", async () => {
    expect(await pingWorkersAi({ run: vi.fn().mockResolvedValue({ response: "" }) }, "@cf/m")).toMatchObject({ ok: true, method: "chat" });
  });

  it("reports errors", async () => {
    expect(await pingWorkersAi({ run: vi.fn().mockRejectedValue(new Error("5007: No such model")) }, "@cf/m")).toMatchObject({ ok: false, error: "5007: No such model" });
  });
});
