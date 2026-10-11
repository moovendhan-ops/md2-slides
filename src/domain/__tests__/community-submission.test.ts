import { describe, expect, it } from "vitest";
import { slugify, submissionFiles, submissionPullRequest, updateContributorsJson, validateSubmission, type CommunitySubmission } from "@/domain/community/submission";

const deck: CommunitySubmission = { id: "design-review", name: "Design review", description: "Get feedback on a design.", category: "Design", md: "# Hello" };
const author = { github: "octocat", name: "The Octocat" };

describe("community submissions", () => {
  it("slugifies names into folder ids", () => {
    expect(slugify("  Quarterly Review! 2027 ")).toBe("quarterly-review-2027");
    expect(slugify("Café débrief")).toBe("cafe-debrief");
  });

  it("accepts a valid deck and rejects bad fields", () => {
    expect(validateSubmission(deck)).toEqual([]);
    expect(validateSubmission({ ...deck, id: "Bad Id" })).toHaveLength(1);
    expect(validateSubmission({ ...deck, name: " ", md: "" })).toEqual(["Name is required", "Deck is required"]);
    expect(validateSubmission({ ...deck, description: "x".repeat(201) })[0]).toMatch(/at most 200/);
  });

  it("rejects unsafe or reserved layouts", () => {
    expect(validateSubmission({ ...deck, layout: { html: "<h1>{{title}}</h1>" } })).toEqual([]);
    expect(validateSubmission({ ...deck, layout: { html: "<img onerror=alert(1)>" } })[0]).toMatch(/not allowed/);
    expect(validateSubmission({ ...deck, id: "bento", layout: { html: "<h1>{{title}}</h1>" } })[0]).toMatch(/built-in/);
  });

  it("builds deck.md and meta.json credited to the signed-in user", () => {
    const files = submissionFiles({ ...deck, look: { theme: "zinc" } }, author);
    expect(files.map((f) => f.path)).toEqual(["community/templates/design-review/deck.md", "community/templates/design-review/meta.json"]);
    expect(files[0].content).toBe("# Hello\n");
    expect(JSON.parse(files[1].content)).toEqual({ name: "Design review", description: "Get feedback on a design.", category: "Design", author, look: { theme: "zinc" } });
  });

  it("adds template.html and slots for layouts", () => {
    const files = submissionFiles({ ...deck, layout: { html: "<h1>{{title}}</h1>", slots: ["title"] } }, author);
    expect(files.map((f) => f.path.split("/").pop())).toEqual(["deck.md", "meta.json", "template.html"]);
    expect(JSON.parse(files[1].content).slots).toEqual(["title"]);
    const renamed = submissionFiles({ ...deck, md: "<!-- layout: custom:hero-split; image: x -->\n# Hi", layout: { html: "<h1>{{title}}</h1>" } }, author);
    expect(renamed[0].content).toBe("<!-- layout: custom:design-review; image: x -->\n# Hi\n");
  });

  it("describes the pull request", () => {
    const pr = submissionPullRequest(deck, author);
    expect(pr.title).toBe("Community template: Design review");
    expect(pr.body).toContain("@octocat");
    expect(pr.body).not.toMatch(/\n\n\n/);
  });

  it("updates CONTRIBUTORS.json only when author is not already present", () => {
    const existing = JSON.stringify([{ github: "existing-user", name: "Existing", color: "#3b82f6" }]);
    const alreadyListed = updateContributorsJson(existing, { github: "existing-user", name: "Existing" });
    expect(alreadyListed).toBeNull();

    const newAuthorChange = updateContributorsJson(existing, { github: "new-user", name: "New User", color: "#ec4899" });
    expect(newAuthorChange).not.toBeNull();
    expect(newAuthorChange?.path).toBe("community/CONTRIBUTORS.json");
    const parsed = JSON.parse(newAuthorChange!.content);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toMatchObject({ github: "new-user", name: "New User", color: "#ec4899" });
  });
});
