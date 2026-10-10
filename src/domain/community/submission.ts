/**
 * A community template submitted from the app: validated here, then committed
 * by the server as community/templates/<id>/ and opened as a pull request.
 * The rules match scripts/community.mjs, which CI runs on the PR.
 */

export interface CommunitySubmission {
  id: string;
  name: string;
  description: string;
  category: string;
  /** The deck (or, for a layout, its sample slide) in md2slides Markdown. */
  md: string;
  /** Optional deck look (theme, accent, bg, font…), same keys as front matter. */
  look?: Record<string, string | number | boolean>;
  /** HTML + Tailwind layout from the Template studio; makes this a `custom:<id>` layout. */
  layout?: { html: string; slots?: string[] };
}

export interface Author {
  github: string;
  name: string;
}

/** Folder ids, as checked by scripts/community.mjs. */
export const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
/** Built-in layout ids a community layout must not shadow. */
export const RESERVED_LAYOUTS = ["hero-split", "bento", "metric-wall"];
export const LIMITS = { name: 60, description: 200, category: 30, md: 100_000, html: 50_000 };

/** "Quarterly review!" → "quarterly-review". */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 41);

/** Problems that block submitting; empty when the submission is valid. */
export function validateSubmission(s: CommunitySubmission): string[] {
  const errors: string[] = [];
  const text = (v: unknown, label: string, max: number) => {
    if (typeof v !== "string" || !v.trim()) errors.push(`${label} is required`);
    else if (v.length > max) errors.push(`${label} must be at most ${max} characters`);
  };
  if (!TEMPLATE_ID.test(s.id ?? "")) errors.push("Id must be 2–41 lowercase letters, digits and dashes");
  text(s.name, "Name", LIMITS.name);
  text(s.description, "Description", LIMITS.description);
  text(s.category, "Category", LIMITS.category);
  text(s.md, "Deck", LIMITS.md);
  if (s.look != null && (typeof s.look !== "object" || Array.isArray(s.look))) errors.push("Look must be an object");
  if (s.layout) {
    const { html } = s.layout;
    if (RESERVED_LAYOUTS.includes(s.id)) errors.push(`“${s.id}” is a built-in layout id`);
    if (typeof html !== "string" || !html.trim()) errors.push("Layout HTML is required");
    else if (html.length > LIMITS.html) errors.push(`Layout HTML must be at most ${LIMITS.html} characters`);
    else if (/<script|on\w+=|fetch\(/i.test(html)) errors.push("Scripts, inline handlers and fetch() are not allowed in layouts");
  }
  return errors;
}

/** The files a submission adds under community/templates/<id>/. */
export function submissionFiles(s: CommunitySubmission, author: Author): { path: string; content: string }[] {
  const dir = `community/templates/${s.id}`;
  const meta: Record<string, unknown> = {
    name: s.name.trim(),
    description: s.description.trim(),
    category: s.category.trim(),
    author: { github: author.github, name: author.name },
  };
  if (s.look && Object.keys(s.look).length) meta.look = s.look;
  if (s.layout?.slots?.length) meta.slots = s.layout.slots;
  // A layout's sample slide must use the layout's own (possibly renamed) id.
  const md = s.layout ? s.md.replace(/layout:\s*custom:[\w-]+/g, `layout: custom:${s.id}`) : s.md;
  const files = [
    { path: `${dir}/deck.md`, content: md.endsWith("\n") ? md : md + "\n" },
    { path: `${dir}/meta.json`, content: JSON.stringify(meta, null, 2) + "\n" },
  ];
  if (s.layout) files.push({ path: `${dir}/template.html`, content: s.layout.html.endsWith("\n") ? s.layout.html : s.layout.html + "\n" });
  return files;
}

/** Pull request title and body for a submission. */
export function submissionPullRequest(s: CommunitySubmission, author: Author) {
  const kind = s.layout ? "layout" : "template";
  return {
    title: `Community ${kind}: ${s.name.trim()}`,
    body: [
      `## Community ${kind}`,
      "",
      `- **Name:** ${s.name.trim()}`,
      `- **Folder:** \`community/templates/${s.id}/\``,
      `- **Author (GitHub):** @${author.github}`,
      `- **Category:** ${s.category.trim()}`,
      "",
      s.description.trim(),
      "",
      s.layout ? `Use it with \`<!-- layout: custom:${s.id} -->\`.` : "",
      "",
      "Submitted from the md2slides app. CI validates the deck; the community catalog is regenerated after merge.",
    ]
      .filter((l, i, a) => l !== "" || a[i - 1] !== "")
      .join("\n"),
  };
}
