import type { CommunitySubmission } from "@/domain/community/submission";
import type { AuthProvider, CommitRequest, CommitResult, ContributeResult, GitProvider, Me, Repo, RepoTree } from "./types";

/** Error with the HTTP status from our API routes (401 = signed out, 429 = rate limited). */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(url: string, init?: RequestInit, as: "json" | "text" = "json"): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "same-origin" });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
  return (as === "json" ? res.json() : res.text()) as Promise<T>;
}

const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

/**
 * GitHub via the app's own API routes. The OAuth token lives in an
 * encrypted httpOnly cookie and is only ever used server-side.
 */
export class GitHubProvider implements GitProvider, AuthProvider {
  me() {
    return call<Me>("/api/auth/me");
  }

  signIn() {
    window.location.assign("/api/auth/github/login");
  }

  async signOut() {
    await call("/api/auth/logout", { method: "POST" }, "text");
  }

  listRepos() {
    return call<Repo[]>("/api/github/repos");
  }

  listBranches(repo: string) {
    return call<string[]>(`/api/github/branches?${q({ repo })}`);
  }

  listPaths(repo: string, branch: string) {
    return call<RepoTree>(`/api/github/tree?${q({ repo, branch })}`);
  }

  readFile(repo: string, path: string, ref: string) {
    return call<string>(`/api/github/file?${q({ repo, path, ref })}`, undefined, "text");
  }

  commit(req: CommitRequest) {
    return call<CommitResult>("/api/github/commit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) });
  }

  submitCommunity(s: CommunitySubmission) {
    return call<ContributeResult>("/api/community/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
  }
}
