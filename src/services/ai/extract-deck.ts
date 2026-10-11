/**
 * Strip chat chatter and a wrapping ```markdown fence so only the deck Markdown remains.
 * Works on partial (still streaming) text too: an unclosed wrapping fence is dropped.
 */
export function extractDeck(text: string): string {
  let md = text.trim();
  // A wrapping fence opens after at most a few lines of chatter (not slide content) and closes at the very end.
  const fence = md.match(/^(?:(?![ \t]*(?:#|---|```))[^\n]*\n){0,3}?```(?:markdown|md)?[ \t]*\n([\s\S]*?)(?:\n```[ \t]*$|$)/);
  if (fence) md = fence[1];
  const fm = md.indexOf("---");
  if (fm > 0 && md.slice(0, fm).trim().split("\n").length <= 3) md = md.slice(fm);
  return md.trim() + "\n";
}
