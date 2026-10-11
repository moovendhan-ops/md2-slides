"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { validateLayout } from "@/domain/deck/custom-layout";
import { highlightJson, highlightMarkdown, highlightTemplateHtml } from "@/domain/deck/highlight";
import { CODE_TEMPLATES, CONTRIBUTORS, STUDIO_GUIDE, type Contributor } from "@/data";
import { Seg } from "@/components/common/controls";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { useServices } from "@/app-shell/services";
import { ContributorProfileDialog } from "@/features/community/contributor-profile-dialog";
import { useMeQuery, useSaveTemplate } from "@/hooks/use-queries";
import { useContribute } from "@/stores/contribute";
import { useLayoutStore } from "@/stores/layouts";
import { useStudio, type StudioTab } from "@/stores/studio";
import { StudioPreview } from "./studio-preview";

const TABS: { id: StudioTab; label: string }[] = [
  { id: "html", label: "template.html" },
  { id: "config", label: "config.json" },
  { id: "sample", label: "sample.md" },
  { id: "contributor", label: "contributor.json" },
  { id: "guide", label: "Guide" },
];

const CONTRIB_SWATCHES = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f97316", "#06b6d4"];

/** Build reusable HTML + Tailwind slide layouts and publish them as templates. */
export function StudioView() {
  const st = useStudio();
  const save = useSaveTemplate();
  const register = useLayoutStore((s) => s.register);
  const contribute = useContribute((s) => s.open);
  const { auth } = useServices();
  const me = useMeQuery().data?.user;
  const [profileModal, setProfileModal] = useState<Contributor | null>(null);

  const code = st.tab === "guide" ? "" : st[st.tab];
  const [scroll, setScroll] = useState({ top: 0, left: 0 });

  const parsedContrib = useMemo(() => {
    try {
      return JSON.parse(st.contributor);
    } catch {
      return null;
    }
  }, [st.contributor]);

  // Authenticated user handle
  const myHandle = me?.login?.toLowerCase() ?? "";

  // Check whether the authenticated user is already in CONTRIBUTORS.json
  const existingContributor = useMemo(() => {
    if (!myHandle) return null;
    return CONTRIBUTORS.find((c) => c.github.toLowerCase() === myHandle);
  }, [myHandle]);

  // Automatically lock contributor.json strictly to the authenticated user's profile
  useEffect(() => {
    if (!me?.login) return;
    try {
      const parsed = JSON.parse(st.contributor);
      // If contributor.json handle doesn't match authenticated user, lock it to me.login
      if (parsed.github?.toLowerCase() !== me.login.toLowerCase()) {
        const found = CONTRIBUTORS.find((c) => c.github.toLowerCase() === me.login.toLowerCase());
        if (found) {
          st.set({
            contributor: JSON.stringify(
              {
                github: found.github,
                name: found.name || me.name || me.login,
                role: found.role || "Template author",
                bio: found.bio || "md2slides contributor",
                color: found.color || "#3b82f6",
                website: found.website || `https://github.com/${found.github}`,
                sponsor: found.sponsor,
              },
              null,
              2
            ),
          });
        } else {
          st.set({
            contributor: JSON.stringify(
              {
                github: me.login,
                name: me.name || me.login,
                role: "Template author",
                bio: "Slide creator and open-source enthusiast.",
                color: "#3b82f6",
                website: `https://github.com/${me.login}`,
              },
              null,
              2
            ),
          });
        }
      }
    } catch {
      st.set({
        contributor: JSON.stringify(
          {
            github: me.login,
            name: me.name || me.login,
            role: "Template author",
            bio: "Slide creator and open-source enthusiast.",
            color: "#3b82f6",
            website: `https://github.com/${me.login}`,
          },
          null,
          2
        ),
      });
    }
  }, [me?.login, me?.name, st.contributor, st]);

  const updateContribField = (key: string, val: string) => {
    try {
      const obj = parsedContrib ? { ...parsedContrib } : {};
      // Locked: github handle cannot be changed away from authenticated user
      if (key === "github" && me?.login) {
        obj.github = me.login;
      } else {
        obj[key] = val;
      }
      if (me?.login) obj.github = me.login;
      st.set({ contributor: JSON.stringify(obj, null, 2) });
    } catch {
      st.set({ contributor: JSON.stringify({ [key]: val, github: me?.login || "your-username" }, null, 2) });
    }
  };

  const lines = useMemo(() => {
    if (st.tab === "guide") return [];
    const textLines = code.split("\n");
    if (st.tab === "html") {
      return textLines.map(highlightTemplateHtml);
    } else if (st.tab === "config" || st.tab === "contributor") {
      return textLines.map(highlightJson);
    } else {
      return textLines.map((l) => highlightMarkdown(l, false));
    }
  }, [code, st.tab]);

  const persist = async (pr: boolean) => {
    const { config, ok } = validateLayout(st.html, st.config);
    if (!ok || !config?.id) {
      toast.error("Fix the errors shown under the preview first");
      return;
    }
    register(config.id, { html: st.html, config });
    const authorStr =
      typeof config.author === "string"
        ? config.author
        : typeof config.author === "object" && config.author !== null
        ? ((config.author as { name?: string; github?: string }).name ||
           (config.author as { name?: string; github?: string }).github ||
           "You")
        : "You";

    const authorGithub =
      typeof config.author === "object" && config.author !== null
        ? (config.author as { github?: string }).github
        : typeof config.author === "string" && config.author.startsWith("@")
        ? config.author.slice(1)
        : undefined;

    const meta = { id: config.id, name: config.name || config.id, category: config.category || "Custom", author: authorStr };
    await save.mutateAsync({
      id: `code-${meta.id}`,
      name: meta.name,
      cat: meta.category,
      author: meta.author,
      authorGithub,
      md: st.sample,
      stars: 0,
      community: true,
      single: true,
      code: true,
      look: {},
      html: st.html,
      config: meta,
    });
    if (!pr) return toast(`Saved “${meta.name}” — use <!-- layout: custom:${config.id} -->`);
    const { description, slots } = config as { description?: string; slots?: string[] };

    let contrib: { color?: string; bio?: string; name?: string; role?: string } = {};
    try {
      contrib = JSON.parse(st.contributor);
    } catch {}

    contribute({
      id: config.id,
      name: meta.name,
      category: meta.category,
      description,
      md: st.sample,
      color: contrib.color,
      bio: contrib.bio,
      authorName: contrib.name || (existingContributor ? existingContributor.name : me?.name),
      role: contrib.role || (existingContributor ? existingContributor.role : undefined),
      layout: { html: st.html, slots },
    });
  };

  const handleTextareaChange = (val: string) => {
    if (st.tab === "contributor") {
      try {
        const parsed = JSON.parse(val);
        // Security rule: lock github handle to the authenticated user
        if (me?.login) {
          parsed.github = me.login;
        }
        st.set({ contributor: JSON.stringify(parsed, null, 2) });
      } catch {
        st.set({ contributor: val });
      }
      return;
    }
    st.set({ [st.tab]: val } as Partial<typeof st>);
  };

  const handleTextareaBlur = () => {
    if (st.tab === "contributor") {
      try {
        const parsed = JSON.parse(st.contributor);
        if (me?.login && parsed.github?.toLowerCase() !== me.login.toLowerCase()) {
          parsed.github = me.login;
          st.set({ contributor: JSON.stringify(parsed, null, 2) });
          toast.info(`Contributor handle is locked to your authenticated account (@${me.login})`);
        }
      } catch {}
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const next = val.slice(0, start) + "  " + val.slice(end);
      handleTextareaChange(next);
      requestAnimationFrame(() => {
        el.setSelectionRange(start + 2, start + 2);
      });
    }
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
          <div className="flex shrink-0 gap-1 px-2 py-2 border-b border-zinc-900 bg-zinc-950/40">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => st.set({ tab: t.id })} className={`h-7 rounded-md px-2.5 font-mono text-xs transition-colors ${st.tab === t.id ? "bg-zinc-800 text-zinc-50 font-medium" : "text-zinc-400 hover:text-zinc-100"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Guide Tab */}
          {st.tab === "guide" ? (
            <div className="flex-1 overflow-y-auto p-4">
              {STUDIO_GUIDE.map((g) => (
                <div key={g.h} className="mb-5">
                  <h4 className="mb-1 text-[13px] font-semibold">{g.h}</h4>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-zinc-400">{g.b}</p>
                </div>
              ))}
            </div>
          ) : st.tab === "contributor" && !me ? (
            /* Authentication Gate: Contributor file is strictly authenticated */
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#09090b]">
              <div className="size-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
                <Icon name="lock-key" className="text-xl" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-1">GitHub Authentication Required</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
                Contributor profiles are authenticated via GitHub. Sign in to view and manage your personal contributor space. You cannot edit other contributors&apos; JSON.
              </p>
              <Button size="sm" className="gap-2 bg-zinc-50 text-zinc-950 hover:bg-zinc-200" onClick={() => auth.signIn()}>
                <Icon name="github-logo" /> Sign in with GitHub
              </Button>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col">
              {/* Authenticated Contributor Space */}
              {st.tab === "contributor" && me && (
                existingContributor ? (
                  <div className="border-b border-zinc-800 bg-zinc-950/80 p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://github.com/${me.login}.png`}
                            alt={me.name || me.login}
                            className="size-10 rounded-full border-2 object-cover"
                            style={{ borderColor: parsedContrib?.color || existingContributor.color || "#3b82f6" }}
                          />
                          <span
                            className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-zinc-950"
                            style={{ backgroundColor: parsedContrib?.color || existingContributor.color || "#3b82f6" }}
                            title={`Signature color`}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-zinc-100">{parsedContrib?.name || existingContributor.name || me.name || me.login}</span>
                            <span className="font-mono text-xs text-zinc-400">@{me.login}</span>
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                              ✓ Your Profile (In CONTRIBUTORS.json)
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-1">{parsedContrib?.bio || existingContributor.bio || "Registered contributor"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-zinc-800 gap-1 text-zinc-300 hover:text-zinc-100"
                          onClick={() => setProfileModal(existingContributor)}
                        >
                          <Icon name="user" className="text-[11px]" /> Profile
                        </Button>
                        <a
                          href="/contributors"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                        >
                          Wall →
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-zinc-800 bg-gradient-to-r from-blue-950/20 via-zinc-950 to-zinc-950 p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-300 border border-blue-500/30">
                          🌟 Your First-Time Profile
                        </span>
                        <span className="text-xs font-mono text-zinc-300">@{me.login}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">Auto-added to CONTRIBUTORS.json on PR</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 block mb-1">Your Full Name</label>
                        <input
                          type="text"
                          value={parsedContrib?.name ?? me.name ?? ""}
                          onChange={(e) => updateContribField("name", e.target.value)}
                          placeholder="e.g. Alex Rivera"
                          className="w-full h-7 rounded border border-zinc-800 bg-zinc-900/80 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 block mb-1">Role / Headline</label>
                        <input
                          type="text"
                          value={parsedContrib?.role ?? ""}
                          onChange={(e) => updateContribField("role", e.target.value)}
                          placeholder="e.g. Slide Designer & Developer"
                          className="w-full h-7 rounded border border-zinc-800 bg-zinc-900/80 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 block mb-1">Signature Color</label>
                        <div className="flex items-center gap-1.5 h-7">
                          {CONTRIB_SWATCHES.map((sw) => (
                            <button
                              key={sw}
                              type="button"
                              onClick={() => updateContribField("color", sw)}
                              style={{ backgroundColor: sw }}
                              className={`size-4 rounded-full transition-transform ${
                                (parsedContrib?.color || "#3b82f6") === sw ? "scale-125 ring-2 ring-white" : "opacity-80 hover:scale-110"
                              }`}
                            />
                          ))}
                          <input
                            type="color"
                            value={parsedContrib?.color || "#3b82f6"}
                            onChange={(e) => updateContribField("color", e.target.value)}
                            className="size-4 cursor-pointer bg-transparent border-0 opacity-80"
                          />
                          <span className="font-mono text-[10px] text-zinc-400 ml-1">{parsedContrib?.color || "#3b82f6"}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-zinc-400 block mb-1">Bio / Tagline</label>
                        <input
                          type="text"
                          value={parsedContrib?.bio ?? ""}
                          onChange={(e) => updateContribField("bio", e.target.value)}
                          placeholder="Short bio about you..."
                          className="w-full h-7 rounded border border-zinc-800 bg-zinc-900/80 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                        />
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Code Mirror & Textarea Editor */}
              <div className="relative flex min-h-0 flex-1 bg-[#09090b]">
                {/* Line Numbers Gutter */}
                <div className="w-10 shrink-0 select-none overflow-hidden bg-zinc-950/60 pr-2 pt-3 text-right font-mono text-[12px] leading-5 text-zinc-600 border-r border-zinc-900" aria-hidden>
                  <div style={{ transform: `translateY(${-scroll.top}px)` }}>
                    {lines.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                </div>

                {/* Editor & Color-Coded Mirror */}
                <div className="relative min-w-0 flex-1">
                  {/* Syntax-colored mirror overlay */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre font-mono text-[13px] leading-5" aria-hidden>
                    <div style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)`, padding: "12px 12px 120px 12px" }}>
                      {lines.map((segs, i) => (
                        <div key={i} style={{ minHeight: "20px" }}>
                          {segs.map((s, j) => (
                            <span key={j} style={{ color: s.c }}>
                              {s.t}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actual textarea (text transparent, caret visible) */}
                  <textarea
                    value={code}
                    spellCheck={false}
                    aria-label={TABS.find((t) => t.id === st.tab)?.label}
                    wrap="off"
                    onKeyDown={onKeyDown}
                    onChange={(e) => handleTextareaChange(e.target.value)}
                    onBlur={handleTextareaBlur}
                    onScroll={(e) => setScroll({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft })}
                    className="absolute inset-0 resize-none overflow-auto bg-transparent font-mono text-[13px] leading-5 text-transparent caret-zinc-100 outline-none"
                    style={{ padding: "12px 12px 120px 12px", whiteSpace: "pre" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <StudioPreview />
      </div>

      {profileModal && (
        <ContributorProfileDialog
          contributor={profileModal}
          onClose={() => setProfileModal(null)}
        />
      )}
    </div>
  );
}
