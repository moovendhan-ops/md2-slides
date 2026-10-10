import { create } from "zustand";
import { CODE_TEMPLATES, COMMUNITY_TEMPLATES } from "@/data";

/** Registry of custom HTML + Tailwind layouts, keyed by `custom:<id>`. */
export interface LayoutDef {
  html: string;
  config?: Record<string, unknown>;
}

interface LayoutState {
  layouts: Record<string, LayoutDef>;
  register: (id: string, def: LayoutDef) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  layouts: Object.fromEntries([
    ...CODE_TEMPLATES.map((c) => [c.id, { html: c.html, config: c.config }]),
    // Community layouts (community/templates/<id>/template.html).
    ...COMMUNITY_TEMPLATES.flatMap((t) => (t.html && t.config?.id ? [[t.config.id, { html: t.html, config: { ...t.config } }]] : [])),
  ]),
  register: (id, def) => set((s) => ({ layouts: { ...s.layouts, [id]: def } })),
}));
