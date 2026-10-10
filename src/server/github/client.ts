import "server-only";

/** Error carrying GitHub's HTTP status so routes can map it (401 → sign out, 403/429 → rate limit). */
export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface GhRepo {
  full_name: string;
  private: boolean;
  default_branch: string;
  pushed_at: string;
  permissions?: { push?: boolean };
}

export interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface FileChange {
  path: string;
  content: string;
}

const API = "https://api.github.com";

/** Minimal GitHub REST client bound to one user's OAuth token. */
export class GitHubClient {
  constructor(private token: string) {}

  private async req<T>(path: string, init: RequestInit & { raw?: boolean } = {}): Promise<T> {
    const res = await fetch(API + path, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: init.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "md2slides",
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const msg = await res.json().then((j: { message?: string }) => j.message, () => res.statusText);
      throw new GitHubError(res.status, msg || `GitHub ${res.status}`);
    }
    return (init.raw ? res.text() : res.json()) as Promise<T>;
  }

  user() {
    return this.req<GhUser>("/user");
  }

  /** Repos the user owns, collaborates on or can see through orgs — most recently pushed first. */
  repos() {
    return this.req<GhRepo[]>("/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member");
  }

  /** List branches for a repository. */
  async branches(repo: string): Promise<string[]> {
    const list = await this.req<{ name: string }[]>(`/repos/${repo}/branches?per_page=100`);
    return list.map((b) => b.name);
  }

  /** All file paths on a branch (recursive tree). */
  async paths(repo: string, branch: string) {
    const t = await this.req<{ tree: { path: string; type: string }[]; truncated: boolean }>(`/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    return { paths: t.tree.filter((n) => n.type === "blob").map((n) => n.path), truncated: t.truncated };
  }

  file(repo: string, path: string, ref: string) {
    const p = path.split("/").map(encodeURIComponent).join("/");
    return this.req<string>(`/repos/${repo}/contents/${p}?ref=${encodeURIComponent(ref)}`, { raw: true });
  }

  /** Fetch file metadata and content (handles base64 binary files). */
  async fileContent(repo: string, path: string, ref: string): Promise<{ content: string; encoding?: string }> {
    const p = path.split("/").map(encodeURIComponent).join("/");
    const res = await this.req<{ content?: string; encoding?: string }>(`/repos/${repo}/contents/${p}?ref=${encodeURIComponent(ref)}`);
    return { content: res.content ?? "", encoding: res.encoding };
  }

  /** One commit containing every change, via the Git Data API. */
  async commit(repo: string, branch: string, message: string, changes: FileChange[]) {
    const ref = await this.req<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    const parent = ref.object.sha;
    const base = await this.req<{ tree: { sha: string } }>(`/repos/${repo}/git/commits/${parent}`);
    const blobs = await Promise.all(
      changes.map((c) => {
        const m = c.content.match(/^data:[^;]+;base64,([\s\S]*)$/);
        if (m) {
          return this.req<{ sha: string }>(`/repos/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: m[1].replace(/\s+/g, ""), encoding: "base64" }) });
        }
        return this.req<{ sha: string }>(`/repos/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: c.content, encoding: "utf-8" }) });
      }),
    );
    const tree = await this.req<{ sha: string }>(`/repos/${repo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: base.tree.sha, tree: changes.map((c, i) => ({ path: c.path, mode: "100644", type: "blob", sha: blobs[i].sha })) }),
    });
    const commit = await this.req<{ sha: string; html_url: string }>(`/repos/${repo}/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }) });
    await this.req(`/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
    return commit;
  }

  repo(repo: string) {
    return this.req<GhRepo & { owner: { login: string } }>(`/repos/${repo}`);
  }

  /** True when `path` exists on `ref` (default branch when omitted). */
  async exists(repo: string, path: string, ref?: string) {
    try {
      await this.req(`/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`);
      return true;
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return false;
      throw e;
    }
  }

  /**
   * Where a user can push a branch for `upstream`: the repo itself when they
   * have write access, otherwise their fork (created, or reused, on demand).
   */
  async pushTarget(upstream: string): Promise<{ repo: string; owner: string; base: string; baseSha: string }> {
    const up = await this.repo(upstream);
    const base = up.default_branch;
    const ref = await this.req<{ object: { sha: string } }>(`/repos/${upstream}/git/ref/heads/${encodeURIComponent(base)}`);
    if (up.permissions?.push) return { repo: upstream, owner: up.owner.login, base, baseSha: ref.object.sha };
    const fork = await this.req<{ full_name: string; owner: { login: string } }>(`/repos/${upstream}/forks`, { method: "POST", body: JSON.stringify({ default_branch_only: true }) });
    // Forking is asynchronous: wait until the fork answers (usually a few seconds).
    for (let i = 0; i < 10; i++) {
      try {
        await this.req(`/repos/${fork.full_name}/git/ref/heads/${encodeURIComponent(base)}`);
        break;
      } catch (e) {
        if (!(e instanceof GitHubError && (e.status === 404 || e.status === 409)) || i === 9) throw e;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    return { repo: fork.full_name, owner: fork.owner.login, base, baseSha: ref.object.sha };
  }

  /**
   * Commit `changes` on a new branch (in the repo or the user's fork) and open
   * a pull request against `upstream`'s default branch.
   */
  async contribute(upstream: string, branch: string, pr: { title: string; body: string }, changes: FileChange[]) {
    const target = await this.pushTarget(upstream);
    // A fork shares objects with its parent, so the branch can start at upstream's tip even when the fork is behind.
    await this.req(`/repos/${target.repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: target.baseSha }) });
    await this.commit(target.repo, branch, pr.title, changes);
    const head = target.repo === upstream ? branch : `${target.owner}:${branch}`;
    const res = await this.req<{ number: number; html_url: string }>(`/repos/${upstream}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title: pr.title, body: pr.body, head, base: target.base, maintainer_can_modify: true }),
    });
    return { url: res.html_url, pullRequest: res.number, forked: target.repo !== upstream };
  }

  /** Commit onto a new branch and open a pull request against `base`. */
  async pullRequest(repo: string, base: string, message: string, changes: FileChange[]) {
    const head = `md2slides/${Date.now().toString(36)}`;
    const ref = await this.req<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
    await this.req(`/repos/${repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${head}`, sha: ref.object.sha }) });
    const commit = await this.commit(repo, head, message, changes);
    const pr = await this.req<{ number: number; html_url: string }>(`/repos/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title: message, head, base, body: "Opened from md2slides." }),
    });
    return { sha: commit.sha, url: pr.html_url, pullRequest: pr.number };
  }
}
