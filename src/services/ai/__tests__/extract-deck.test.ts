import { describe, expect, it } from "vitest";
import { extractDeck } from "../extract-deck";

describe("extractDeck", () => {
  it("unwraps a markdown fence and keeps inner code blocks", () => {
    const md = "Sure! Here it is:\n```markdown\n---\ntheme: x\n---\n# A\n```ts\nlet a = 1\n```\n# B\n```";
    expect(extractDeck(md)).toBe("---\ntheme: x\n---\n# A\n```ts\nlet a = 1\n```\n# B\n");
  });

  it("handles a still-open fence while streaming", () => {
    expect(extractDeck("```md\n---\ntheme: x\n---\n# A")).toBe("---\ntheme: x\n---\n# A\n");
  });

  it("drops short chatter before the front matter", () => {
    expect(extractDeck("Here you go\n---\n# A")).toBe("---\n# A\n");
  });

  it("leaves a bare deck alone, including bare code fences", () => {
    const md = "# A\n```\ncode\n```\n# B";
    expect(extractDeck(md)).toBe(md + "\n");
  });
});
