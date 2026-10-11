/**
 * Built-in catalog data (templates, block snippets, code layouts, AI prompt
 * suggestions). Plain JSON so it can move to a backend without code changes.
 */
import type { TemplateRecord } from "@/engine/types";
import aiPresets from "./ai-presets.json";
import codeTemplates from "./code-templates.json";
import community from "./community.generated.json";
import snippets from "./snippets.json";
import studioGuide from "./studio-guide.json";
import templates from "./templates.json";

export interface Snippet {
  label: string;
  md: string;
  icon: string;
  cat: string;
}

export interface AiPreset {
  label: string;
  icon: string;
  prompt: string;
}

export interface CodeTemplate {
  id: string;
  config: { name: string; category: string; author: string; slots: string[]; description: string };
  html: string;
  sample: string;
}

export interface Contributor {
  github: string;
  name?: string;
  role?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  sponsor?: string;
  color?: string;
  templates: number;
  categories?: string[];
}

export const SEED_TEMPLATES = templates as TemplateRecord[];
/**
 * Templates contributed via community/templates (validated by scripts/community.mjs).
 * Cast through unknown: each template's `look` has different keys, so the inferred JSON type is a union.
 */
export const COMMUNITY_TEMPLATES = community.templates as unknown as TemplateRecord[];
export const CONTRIBUTORS = community.contributors as Contributor[];
export const BLOCK_SNIPPETS = snippets as Snippet[];
export const AI_PRESETS = aiPresets as AiPreset[];
export const CODE_TEMPLATES = codeTemplates as CodeTemplate[];
export const STUDIO_GUIDE = studioGuide as { h: string; b: string }[];

/** Code (HTML + Tailwind) layouts exposed as single-slide community templates. */
export const codeTemplateRecords = (): TemplateRecord[] =>
  CODE_TEMPLATES.map((c) => ({
    id: "code-" + c.id,
    name: c.config.name,
    cat: c.config.category,
    author: c.config.author,
    md: c.sample,
    stars: 0,
    community: true,
    single: true,
    code: true,
    look: {},
    html: c.html,
    config: { id: c.id, ...c.config },
  }));
