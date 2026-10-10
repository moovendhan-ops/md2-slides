import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultRoot, rootFromClient } from "../workspace";

describe("MCP workspace root", () => {
  it("uses the folder the client started the server in", () => {
    expect(defaultRoot("/work/my-repo", "/home/me")).toBe("/work/my-repo");
  });

  it("falls back to ~/md2slides when started in / or the home folder (Claude Desktop)", () => {
    expect(defaultRoot("/", "/home/me")).toBe(join("/home/me", "md2slides"));
    expect(defaultRoot("/home/me", "/home/me")).toBe(join("/home/me", "md2slides"));
  });

  it("takes the first local folder from the client's MCP roots", () => {
    expect(rootFromClient([{ uri: "https://example.com/x" }, { uri: "file:///work/my-repo" }, { uri: "file:///other" }])).toBe("/work/my-repo");
    expect(rootFromClient([])).toBeUndefined();
  });
});
