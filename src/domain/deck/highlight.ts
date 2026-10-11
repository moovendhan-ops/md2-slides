import type { Look } from "./look";

export interface ColorSeg {
  t: string;
  c: string;
}

const KW =
  /^(const|let|var|function|return|if|else|for|while|import|from|export|default|class|new|await|async|type|interface|fn|pub|use|struct|impl|def|in|of|true|false|null|undefined|match|mod)$/;
const TOKENS = /(\/\/.*|#.*$)|("[^"]*"|'[^']*'|`[^`]*`)|(\b\d+(\.\d+)?\b)|(\b[A-Za-z_]\w*(?=\())|(\b[A-Za-z_]\w*\b)|(\s+)|(.)/g;

function push(out: ColorSeg[], t: string, c: string) {
  const last = out[out.length - 1];
  if (last && last.c === c) last.t += t;
  else out.push({ t, c });
}

/** Syntax colours for code blocks inside slides. */
export function highlightCode(line: string, look: Look): ColorSeg[] {
  const C =
    look.mode === "dark"
      ? { kw: "#c084fc", str: "#86efac", num: "#fbbf24", com: "#71717a", fn: "#60a5fa" }
      : { kw: "#7c3aed", str: "#15803d", num: "#b45309", com: "#71717a", fn: "#2563eb" };
  const out: ColorSeg[] = [];
  for (const m of line.matchAll(TOKENS)) {
    const t = m[0];
    const c = m[1] ? C.com : m[2] ? C.str : m[3] ? C.num : m[5] ? C.fn : m[6] && KW.test(t) ? C.kw : look.fg;
    push(out, t, c);
  }
  return out.length ? out : [{ t: " ", c: look.fg }];
}

const MD = {
  h: "#fafafa", k: "#fbbf24", f: "#c084fc", c: "#4ade80", q: "#2dd4bf", b: "#60a5fa",
  t: "#67e8f9", m: "#52525b", n: "#f472b6", tx: "#d4d4d8", v: "#fb923c",
};

function markdownSegs(t: string, inFrontMatter: boolean): ColorSeg[] {
  const l = t.trimStart();
  if (l === "---" || l === "|||") return [{ t, c: MD.m }];
  if (/^#{1,2}\s/.test(l)) return [{ t, c: MD.h }];
  if (/^#{3,6}\s/.test(l)) return [{ t, c: "#e4e4e7" }];
  if (/^\^\s/.test(l)) return [{ t, c: MD.k }];
  if (l.startsWith(":::")) {
    const sp = t.indexOf(" ");
    return [{ t: sp < 0 ? t : t.slice(0, sp), c: MD.f }, { t: sp < 0 ? "" : t.slice(sp), c: "#a78bfa" }];
  }
  if (l.startsWith("```")) return [{ t, c: MD.c }];
  if (l.startsWith("> [!")) return [{ t, c: "#fbbf24" }];
  if (l.startsWith(">") || /^[—–]\s/.test(l)) return [{ t, c: MD.q }];
  if (l.startsWith("|")) return [{ t, c: MD.t }];
  if (l.startsWith("<!--")) return [{ t, c: MD.m }];
  if (/^note:/i.test(l)) return [{ t, c: MD.n }];
  if (l.startsWith("![")) return [{ t, c: "#f9a8d4" }];
  const li = t.match(/^(\s*(?:[-*]|\d+\.)\s(?:\[[ x]\]\s)?)(.*)$/i);
  if (li && /^([-*]|\d+\.)\s/.test(l)) {
    return [{ t: li[1], c: MD.b }, ...li[2].split(/(\|)/).map((p) => ({ t: p, c: p === "|" ? MD.m : MD.tx }))];
  }
  return [{ t, c: /^\w[\w-]*:\s/.test(l) && inFrontMatter ? "#93c5fd" : "#a1a1aa" }];
}

/** Colour one line of deck Markdown for the editor overlay. */
export function highlightMarkdown(t: string, inFrontMatter: boolean): ColorSeg[] {
  const out: ColorSeg[] = [];
  for (const s of markdownSegs(t, inFrontMatter)) {
    for (const p of s.t.split(/(\$\{\w+\})/)) if (p) out.push({ t: p, c: /^\$\{/.test(p) ? MD.v : s.c });
  }
  return out.length ? out : [{ t: " ", c: MD.tx }];
}

/** Colour HTML + Mustache template code. */
export function highlightTemplateHtml(line: string): ColorSeg[] {
  const out: ColorSeg[] = [];
  const REGEX = /(\{\{[#^/]?\w+\}\})|(<!--[\s\S]*?-->)|(<\/?[A-Za-z0-9-]+)|([\w:-]+(?==))|("[^"]*"|'[^']*')|([<>/=])|(\s+)|([^<>{}"'\s=]+)/g;
  for (const m of line.matchAll(REGEX)) {
    const t = m[0];
    let c = "#e4e4e7";
    if (m[1]) c = "#f472b6";
    else if (t.startsWith("<!--")) c = "#71717a";
    else if (m[3]) c = "#60a5fa";
    else if (m[4]) c = "#c084fc";
    else if (m[5]) c = "#4ade80";
    else if (m[6]) c = "#94a3b8";
    push(out, t, c);
  }
  return out.length ? out : [{ t: " ", c: "#e4e4e7" }];
}

/** Colour JSON config code. */
export function highlightJson(line: string): ColorSeg[] {
  const out: ColorSeg[] = [];
  const REGEX = /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|(\b(true|false|null|\d+(?:\.\d+)?)\b)|([{}[\],:])|(\s+)|([^"{}[\],:\s]+)/g;
  for (const m of line.matchAll(REGEX)) {
    const t = m[0];
    let c = "#e4e4e7";
    if (m[1]) c = "#60a5fa";
    else if (m[2]) c = "#4ade80";
    else if (m[3]) c = "#fbbf24";
    else if (m[5]) c = "#71717a";
    push(out, t, c);
  }
  return out.length ? out : [{ t: " ", c: "#e4e4e7" }];
}

