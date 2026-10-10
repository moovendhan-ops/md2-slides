#!/usr/bin/env node
/**
 * Validate community templates and write src/data/community.generated.json.
 *   community/templates/<id>/deck.md + meta.json  ({ name, description, category, author: { github, name? }, look?, slots? })
 *   community/templates/<id>/template.html          (optional: an HTML + Tailwind layout, used as `custom:<id>`)
 *   community/CONTRIBUTORS.json                    (people credited on the contributors wall)
 * Fails on invalid entries. `--check` also fails if the generated file is out of date.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./engine-node.mjs";
import { root } from "./ui-bundle.mjs";

const dir = join(root, "community/templates");
const out = join(root, "src/data/community.generated.json");
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
const BUILTIN_LAYOUTS = new Set(JSON.parse(readFileSync(join(root, "src/data/code-templates.json"), "utf8")).map((c) => c.id));
const errors = [];

const templates = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()
  .flatMap((id) => {
    const at = (f) => join(dir, id, f);
    const fail = (msg) => (errors.push(`community/templates/${id}: ${msg}`), []);
    if (!ID.test(id)) return fail("folder name must be lowercase letters, digits and dashes");
    if (!existsSync(at("deck.md")) || !existsSync(at("meta.json"))) return fail("needs deck.md and meta.json");
    let meta;
    try {
      meta = JSON.parse(readFileSync(at("meta.json"), "utf8"));
    } catch (e) {
      return fail(`meta.json is not valid JSON (${e.message})`);
    }
    const md = readFileSync(at("deck.md"), "utf8");
    if (!meta.name || !meta.category || !meta.description) return fail("meta.json needs name, description and category");
    if (!HANDLE.test(meta.author?.github ?? "")) return fail("meta.json author.github must be a GitHub username");
    const deck = parse(md);
    const bad = deck.problems.filter((p) => p.sev === "error");
    if (!deck.slides.length) return fail("deck.md has no slides");
    if (bad.length) return fail(`deck.md has errors: ${bad.map((p) => `line ${p.line + 1} ${p.msg}`).join("; ")}`);
    const html = existsSync(at("template.html")) ? readFileSync(at("template.html"), "utf8") : null;
    if (html != null) {
      if (BUILTIN_LAYOUTS.has(id)) return fail("a layout can't reuse a built-in layout id");
      if (/<script|on\w+=|fetch\(/i.test(html)) return fail("template.html can't contain scripts, inline handlers or fetch()");
    }
    const layout = html == null ? {} : { single: true, code: true, html, config: { id, name: meta.name, category: meta.category, author: meta.author.github, slots: meta.slots ?? [], description: meta.description } };
    return [
      {
        id: `community-${id}`,
        name: meta.name,
        description: meta.description,
        cat: meta.category,
        author: meta.author.name || meta.author.github,
        authorGithub: meta.author.github,
        md,
        stars: 0,
        community: true,
        look: meta.look ?? {},
        ...layout,
      },
    ];
  });

const listed = JSON.parse(readFileSync(join(root, "community/CONTRIBUTORS.json"), "utf8"));
for (const c of listed) if (!HANDLE.test(c.github ?? "")) errors.push(`community/CONTRIBUTORS.json: invalid github "${c.github}"`);
const byHandle = new Map(listed.map((c) => [c.github.toLowerCase(), { ...c, templates: 0 }]));
for (const t of templates) {
  const k = t.authorGithub.toLowerCase();
  const c = byHandle.get(k) ?? { github: t.authorGithub, name: t.author, role: "Template author", templates: 0 };
  c.templates++;
  byHandle.set(k, c);
}

if (errors.length) {
  console.error(`Community templates are invalid:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
const json = JSON.stringify({ templates, contributors: [...byHandle.values()] }, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (!existsSync(out) || readFileSync(out, "utf8") !== json) {
    console.error("src/data/community.generated.json is out of date: run `npm run community`.");
    process.exit(1);
  }
} else writeFileSync(out, json);
console.log(`Community: ${templates.length} templates, ${byHandle.size} contributors.`);
