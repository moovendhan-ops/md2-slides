"use client";

import { toast } from "sonner";
import { validateLayout } from "@/domain/deck/custom-layout";
import { CODE_TEMPLATES, STUDIO_GUIDE } from "@/data";
import { Seg } from "@/components/common/controls";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { useSaveTemplate } from "@/hooks/use-queries";
import { useContribute } from "@/stores/contribute";
import { useLayoutStore } from "@/stores/layouts";
import { useStudio, type StudioTab } from "@/stores/studio";
import { StudioPreview } from "./studio-preview";

const TABS: { id: StudioTab; label: string }[] = [
  { id: "html", label: "template.html" },
  { id: "config", label: "config.json" },
  { id: "sample", label: "sample.md" },
  { id: "guide", label: "Guide" },
];

/** Build reusable HTML + Tailwind slide layouts and publish them as templates. */
export function StudioView() {
  const st = useStudio();
  const save = useSaveTemplate();
  const register = useLayoutStore((s) => s.register);
  const contribute = useContribute((s) => s.open);
  const code = st.tab === "guide" ? "" : st[st.tab];

  const persist = async (pr: boolean) => {
    const { config, ok } = validateLayout(st.html, st.config);
    if (!ok || !config?.id) {
      toast.error("Fix the errors shown under the preview first");
      return;
    }
    register(config.id, { html: st.html, config });
    const md = st.sample.replace(/layout:\s*custom:[\w-]+/, `layout: custom:${config.id}`);
    const meta = { id: config.id, name: config.name || config.id, category: config.category || "Custom", author: config.author || "You" };
    await save.mutateAsync({ id: `code-${meta.id}`, name: meta.name, cat: meta.category, author: meta.author, md, stars: 0, community: true, single: true, code: true, look: {}, html: st.html, config: meta });
    if (!pr) return toast(`Saved “${meta.name}” — use <!-- layout: custom:${config.id} -->`);
    const { description, slots } = config as { description?: string; slots?: string[] };
    contribute({ id: config.id, name: meta.name, category: meta.category, description, md, layout: { html: st.html, slots } });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-800 px-4 py-2">
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold">Template studio</span>
          <span className="text-[11px] text-zinc-500">HTML + Tailwind → reusable slide layout</span>
        </div>
        <Seg size="sm" value={st.id} onChange={st.loadExample} options={CODE_TEMPLATES.map((c) => ({ id: c.id, label: c.config.name }))} />
        <Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed border-zinc-700" onClick={st.blank}>
          <Icon name="plus" /> Blank
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-8 gap-1.5 border-zinc-800" onClick={() => persist(false)}>
          <Icon name="floppy-disk" /> Save
        </Button>
        <Button size="sm" className="h-8 gap-1.5 bg-zinc-50 font-semibold text-zinc-950 hover:bg-zinc-200" onClick={() => persist(true)}>
          <Icon name="git-pull-request" /> Submit to community
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-[40vh] min-w-0 flex-1 flex-col border-zinc-800 lg:border-r">
          <div className="flex shrink-0 gap-1 px-2 py-2">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => st.set({ tab: t.id })} className={`h-7 rounded-md px-2.5 font-mono text-xs ${st.tab === t.id ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-100"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {st.tab === "guide" ? (
            <div className="flex-1 overflow-y-auto p-4">
              {STUDIO_GUIDE.map((g) => (
                <div key={g.h} className="mb-5">
                  <h4 className="mb-1 text-[13px] font-semibold">{g.h}</h4>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-zinc-400">{g.b}</p>
                </div>
              ))}
            </div>
          ) : (
            <textarea
              value={code}
              spellCheck={false}
              aria-label={TABS.find((t) => t.id === st.tab)?.label}
              onChange={(e) => st.set({ [st.tab]: e.target.value } as Partial<typeof st>)}
              className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-5 text-zinc-200 outline-none"
              style={{ whiteSpace: "pre", overflowWrap: "normal" }}
            />
          )}
        </div>
        <StudioPreview />
      </div>
    </div>
  );
}
