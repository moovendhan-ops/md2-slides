import { homedir } from "node:os";
import { join, parse } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where decks are written when no --root is given. Clients that start the
 * server inside a project (Claude Code, Cursor, VS Code) pass it as the cwd
 * or as an MCP root; Claude Desktop starts it in `/` or the home folder, where
 * writing decks would be wrong, so those fall back to ~/md2slides.
 */
export function defaultRoot(cwd = process.cwd(), home = homedir()): string {
  const isFsRoot = parse(cwd).root === cwd;
  return isFsRoot || cwd === home ? join(home, "md2slides") : cwd;
}

/** The first local folder among the client's MCP roots (file:// URIs), if any. */
export function rootFromClient(roots: { uri: string }[]): string | undefined {
  for (const r of roots) {
    if (!r.uri.startsWith("file://")) continue;
    try {
      return fileURLToPath(r.uri);
    } catch {
      // Not a local path on this platform: try the next root.
    }
  }
  return undefined;
}
