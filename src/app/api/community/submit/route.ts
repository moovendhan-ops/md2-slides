import { NextResponse } from "next/server";
import { submissionFiles, submissionPullRequest, updateContributorsJson, validateSubmission, type CommunitySubmission } from "@/domain/community/submission";
import { BRAND } from "@/lib/brand";
import { bad, withGitHub } from "@/server/github/route-helpers";
import { notify } from "@/server/notify";
import { rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

/** The repository community templates are contributed to. */
const UPSTREAM = new URL(BRAND.repo).pathname.slice(1);

/** POST a community template: fork if needed, commit it on a branch and open a pull request. */
export async function POST(req: Request) {
  const s = (await req.json().catch(() => null)) as CommunitySubmission | null;
  if (!s || typeof s !== "object") return bad("Invalid submission");
  const errors = validateSubmission(s);
  if (errors.length) return bad(errors.join("; "));
  return withGitHub(async (gh, session) => {
    const wait = rateLimit(`community:${session.login}`, 5, 60 * 60_000);
    if (wait) return bad(`Too many submissions — try again in ${Math.ceil(wait / 60)} min`, 429);
    if (await gh.exists(UPSTREAM, `community/templates/${s.id}`)) return bad(`A template with id “${s.id}” already exists — pick another id`, 409);
    const author = {
      github: session.login,
      name: s.authorName || session.name || session.login,
      color: s.color || "#3b82f6",
      bio: s.bio,
      role: s.role,
    };
    const branch = `community/${s.id}-${Date.now().toString(36)}`;

    // Prepare template changes
    const changes = submissionFiles(s, author);

    // If author is not yet in community/CONTRIBUTORS.json, add them in the same PR
    try {
      const repoInfo = await gh.repo(UPSTREAM);
      const defaultBranch = repoInfo.default_branch || "main";
      const existingJson = await gh.file(UPSTREAM, "community/CONTRIBUTORS.json", defaultBranch);
      const contributorChange = updateContributorsJson(existingJson, author);
      if (contributorChange) {
        changes.push(contributorChange);
      }
    } catch {
      // In case file read encounters an error, ensure new contributor entry is prepared
      const contributorChange = updateContributorsJson("[]", author);
      if (contributorChange) {
        changes.push(contributorChange);
      }
    }

    const res = await gh.contribute(UPSTREAM, branch, submissionPullRequest(s, author), changes);
    notify("info", "Community template submitted", { user: session.login, id: s.id, pr: res.url });
    return NextResponse.json(res);
  });
}
