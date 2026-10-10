import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient } from "@/server/github/client";

/** Fake GitHub REST API: answers by "METHOD /path", records every call. */
function fakeGitHub(canPush: boolean) {
  const calls: { method: string; path: string; body?: Record<string, unknown> }[] = [];
  let forkReady = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      const path = url.replace("https://api.github.com", "");
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, path, body });
      const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
      const key = `${method} ${path}`;
      if (key === "GET /repos/up/repo") return json({ default_branch: "main", owner: { login: "up" }, permissions: { push: canPush } });
      if (key === "GET /repos/up/repo/git/ref/heads/main") return json({ object: { sha: "base" } });
      if (key === "POST /repos/up/repo/forks") return json({ full_name: "me/repo", owner: { login: "me" } }, 202);
      if (key === "GET /repos/me/repo/git/ref/heads/main") {
        if (!forkReady) return (forkReady = true), json({ message: "Not Found" }, 404);
        return json({ object: { sha: "old" } });
      }
      if (method === "POST" && path.endsWith("/git/refs")) return json({}, 201);
      if (method === "GET" && path.includes("/git/ref/heads/community")) return json({ object: { sha: "base" } });
      if (method === "GET" && path.includes("/git/commits/")) return json({ tree: { sha: "tree" } });
      if (method === "POST" && path.endsWith("/git/blobs")) return json({ sha: "blob" }, 201);
      if (method === "POST" && path.endsWith("/git/trees")) return json({ sha: "tree2" }, 201);
      if (method === "POST" && path.endsWith("/git/commits")) return json({ sha: "c1", html_url: "u" }, 201);
      if (method === "PATCH") return json({});
      if (key === "POST /repos/up/repo/pulls") return json({ number: 7, html_url: "https://github.com/up/repo/pull/7" }, 201);
      return json({ message: `unexpected ${key}` }, 500);
    }),
  );
  return calls;
}

const files = [{ path: "community/templates/x/deck.md", content: "# X\n" }];
const pr = { title: "Community template: X", body: "b" };

describe("GitHubClient.contribute", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("branches on the repo itself when the user can push", async () => {
    const calls = fakeGitHub(true);
    const res = await new GitHubClient("t").contribute("up/repo", "community/x-1", pr, files);
    expect(res).toEqual({ url: "https://github.com/up/repo/pull/7", pullRequest: 7, forked: false });
    expect(calls.some((c) => c.path.endsWith("/forks"))).toBe(false);
    expect(calls.find((c) => c.path === "/repos/up/repo/git/refs")?.body).toEqual({ ref: "refs/heads/community/x-1", sha: "base" });
    expect(calls.find((c) => c.path === "/repos/up/repo/pulls")?.body).toMatchObject({ head: "community/x-1", base: "main" });
  });

  it("forks, waits for the fork, and opens a cross-repo PR otherwise", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const calls = fakeGitHub(false);
    const run = new GitHubClient("t").contribute("up/repo", "community/x-1", pr, files);
    await vi.runAllTimersAsync();
    const res = await run;
    vi.useRealTimers();
    expect(res.forked).toBe(true);
    // The fork's branch starts at upstream's tip, even though the fork is behind.
    expect(calls.find((c) => c.path === "/repos/me/repo/git/refs")?.body).toEqual({ ref: "refs/heads/community/x-1", sha: "base" });
    expect(calls.some((c) => c.method === "POST" && c.path === "/repos/me/repo/git/commits")).toBe(true);
    expect(calls.find((c) => c.path === "/repos/up/repo/pulls")?.body).toMatchObject({ head: "me:community/x-1", base: "main", maintainer_can_modify: true });
  });
});
