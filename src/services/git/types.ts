/** Git hosting abstraction. The UI depends only on these interfaces. */
import type { CommunitySubmission } from "@/domain/community/submission";

export interface User {
  login: string;
  name: string;
  avatar: string;
  scope: string;
  since: number;
}

export interface Me {
  user: User | null;
  manageUrl?: string;
}

export interface Repo {
  id: string;
  private: boolean;
  branch: string;
  pushedAt: string;
  canPush: boolean;
}

export interface RepoTree {
  paths: string[];
  truncated: boolean;
}

export interface FileChange {
  path: string;
  content: string;
}

export interface CommitRequest {
  repo: string;
  branch: string;
  message: string;
  changes: FileChange[];
  /** Commit to a new branch and open a pull request instead of pushing. */
  asPullRequest?: boolean;
}

export interface CommitResult {
  sha: string;
  url: string;
  pullRequest?: number;
}

/** Result of submitting a community template: the pull request it opened. */
export interface ContributeResult {
  url: string;
  pullRequest: number;
  /** True when the PR came from the user's fork (they can't push to the repo). */
  forked: boolean;
}

export interface AuthProvider {
  me(): Promise<Me>;
  signIn(): void;
  signOut(): Promise<void>;
}

export interface GitProvider {
  listRepos(): Promise<Repo[]>;
  listBranches(repo: string): Promise<string[]>;
  listPaths(repo: string, branch: string): Promise<RepoTree>;
  readFile(repo: string, path: string, ref: string): Promise<string>;
  commit(req: CommitRequest): Promise<CommitResult>;
  /** Open a pull request adding a community template to the md2slides repo. */
  submitCommunity(s: CommunitySubmission): Promise<ContributeResult>;
}
