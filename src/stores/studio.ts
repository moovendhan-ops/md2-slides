import { create } from "zustand";
import { CODE_TEMPLATES, CONTRIBUTORS } from "@/data";

export type StudioTab = "html" | "config" | "sample" | "contributor" | "guide";

interface StudioState {
  id: string;
  html: string;
  config: string;
  sample: string;
  contributor: string;
  tab: StudioTab;
  mode: "dark" | "light";
  accent: string;
  set: (patch: Partial<Omit<StudioState, "set" | "loadExample" | "blank">>) => void;
  loadExample: (id: string) => void;
  blank: () => void;
}

const defaultContributor = (author?: string) => {
  const clean = (author || "").replace(/^@/, "").toLowerCase();
  const match = CONTRIBUTORS.find(
    (c) => c.github.toLowerCase() === clean || c.name?.toLowerCase() === clean
  );
  if (match) {
    return JSON.stringify(
      {
        github: match.github,
        name: match.name,
        role: match.role,
        bio: match.bio,
        color: match.color || "#3b82f6",
        website: match.website,
        sponsor: match.sponsor,
      },
      null,
      2
    );
  }
  return JSON.stringify(
    {
      github: "your-username",
      name: "Your Name",
      role: "Template author",
      bio: "Creating slides with md2slides.",
      color: "#3b82f6",
      website: "https://github.com/your-username",
    },
    null,
    2
  );
};

const example = (id: string) => {
  const c = CODE_TEMPLATES.find((x) => x.id === id) ?? CODE_TEMPLATES[0];
  return {
    id: c.id,
    html: c.html,
    config: JSON.stringify({ id: c.id, ...c.config }, null, 2),
    sample: c.sample,
    tab: "html" as StudioTab,
  };
};

const BLANK_HTML = `<div class="h-full flex flex-col justify-center gap-4 p-16">
  <span class="text-accent text-sm uppercase tracking-widest">{{kicker}}</span>
  <h1 class="font-head text-6xl font-bold">{{title}}</h1>
  <p class="text-muted text-xl">{{body}}</p>
</div>`;

/** Template studio working copy (HTML + config + sample Markdown + contributor). */
export const useStudio = create<StudioState>((set) => ({
  ...example(CODE_TEMPLATES[0]?.id ?? ""),
  contributor: JSON.stringify(
    {
      github: "your-username",
      name: "Your Name",
      role: "Template author",
      bio: "Creating custom layouts for md2slides.",
      color: "#3b82f6",
      website: "https://github.com/your-username",
    },
    null,
    2
  ),
  mode: "dark",
  accent: "#60a5fa",
  set: (patch) => set(patch),
  loadExample: (id) => set((prev) => ({ ...example(id), contributor: prev.contributor })),
  blank: () =>
    set((prev) => ({
      id: "my-layout",
      html: BLANK_HTML,
      config: JSON.stringify({ id: "my-layout", name: "My layout", category: "Custom", author: "@you", slots: ["kicker", "title", "body"], description: "" }, null, 2),
      sample: "<!-- layout: custom:my-layout -->\n^ Hello\n# My first layout\nEdit template.html on the left.",
      contributor: prev.contributor,
      tab: "html",
    })),
}));
