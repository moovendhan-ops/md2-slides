"use client";

import { useMemo, useState } from "react";
import type { TemplateRecord } from "@/engine/types";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COMMUNITY_TEMPLATES, CONTRIBUTORS, type Contributor } from "@/data";
import { githubProfile } from "@/lib/github";
import { cn } from "@/lib/utils";

const slideCount = (md: string) => (md.match(/^---$/gm)?.length ?? 0) + 1;

export function ContributorProfileDialog({
  contributor: directContributor,
  github,
  onClose,
  onPreviewTemplate,
  onUseTemplate,
}: {
  contributor?: Contributor | null;
  github?: string | null;
  onClose: () => void;
  onPreviewTemplate?: (t: TemplateRecord) => void;
  onUseTemplate?: (t: TemplateRecord) => void;
}) {
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  const contributor = useMemo(() => {
    if (directContributor) return directContributor;
    if (!github) return null;
    const found = CONTRIBUTORS.find((c) => c.github.toLowerCase() === github.toLowerCase());
    if (found) return found;
    return {
      github,
      name: github,
      role: "Template Contributor",
      templates: COMMUNITY_TEMPLATES.filter((t) => t.authorGithub?.toLowerCase() === github.toLowerCase()).length,
    } as Contributor;
  }, [directContributor, github]);

  const authorTemplates = useMemo(() => {
    if (!contributor) return [];
    return COMMUNITY_TEMPLATES.filter(
      (t) => t.authorGithub?.toLowerCase() === contributor.github.toLowerCase()
    );
  }, [contributor]);

  const totalSlides = useMemo(() => {
    return authorTemplates.reduce((acc, t) => acc + slideCount(t.md), 0);
  }, [authorTemplates]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    authorTemplates.forEach((t) => {
      if (t.cat) set.add(t.cat);
    });
    return ["All", ...Array.from(set).sort()];
  }, [authorTemplates]);

  const filteredTemplates = useMemo(() => {
    return authorTemplates.filter((t) => {
      const matchCat = selectedCat === "All" || t.cat === selectedCat;
      const matchQ =
        !q ||
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(q.toLowerCase())) ||
        t.cat.toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [authorTemplates, selectedCat, q]);

  if (!contributor) return null;

  const profile = githubProfile(contributor.github, 160);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col border-zinc-800 bg-zinc-950 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-zinc-900 p-6 pb-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <img
                src={profile?.avatar || `https://avatars.githubusercontent.com/${contributor.github}?v=4&s=160`}
                alt={contributor.name || contributor.github}
                width={80}
                height={80}
                className="size-20 rounded-2xl border-2 border-zinc-700/60 bg-zinc-900 object-cover shadow-xl"
              />
              <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-blue-500 text-xs text-white shadow">
                <Icon name="check" />
              </span>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-zinc-50">
                  {contributor.name || contributor.github}
                </DialogTitle>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                  {contributor.role || "Contributor"}
                </span>
              </div>

              <DialogDescription className="mt-0.5 text-xs text-zinc-400">
                @{contributor.github}
              </DialogDescription>

              {contributor.bio && (
                <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-[13px]">
                  {contributor.bio}
                </p>
              )}

              {/* Action buttons / links */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <a
                  href={`https://github.com/${contributor.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                >
                  <Icon name="github-logo" className="text-sm" /> GitHub Profile
                  <Icon name="arrow-up-right" className="text-[10px] text-zinc-500" />
                </a>

                {contributor.website && (
                  <a
                    href={contributor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                  >
                    <Icon name="globe" className="text-sm text-blue-400" /> Website
                    <Icon name="arrow-up-right" className="text-[10px] text-zinc-500" />
                  </a>
                )}

                {contributor.twitter && (
                  <a
                    href={`https://x.com/${contributor.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
                  >
                    <Icon name="x-logo" className="text-sm text-zinc-300" /> @{contributor.twitter}
                  </a>
                )}

                {contributor.sponsor && (
                  <a
                    href={contributor.sponsor}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 text-xs font-medium text-pink-300 transition-colors hover:border-pink-400 hover:bg-pink-500/20"
                  >
                    <Icon name="heart" className="text-sm text-pink-400" /> Sponsor
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Templates</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-zinc-100">{authorTemplates.length}</span>
                <span className="text-xs text-zinc-500">created</span>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Slides</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-zinc-100">{totalSlides}</span>
                <span className="text-xs text-zinc-500">total deck slides</span>
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 sm:col-span-1">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Categories</div>
              <div className="mt-1 text-sm font-semibold text-zinc-300">
                {categories.length > 1 ? categories.length - 1 : 1} domains
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Templates list area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-200">
                Templates by {contributor.name || contributor.github}
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {filteredTemplates.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Icon name="magnifying-glass" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter templates…"
                  className="h-8 border-zinc-800 pl-8 text-xs bg-zinc-900/60"
                />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 2 && (
            <div className="flex flex-wrap gap-1.5 pb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedCat === cat
                      ? "bg-zinc-100 text-zinc-950 font-semibold"
                      : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable grid of templates */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-zinc-500">
                <Icon name="squares-four" className="text-2xl text-zinc-600 mb-2" />
                No templates matched the filter.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredTemplates.map((t) => {
                  const slides = slideCount(t.md);
                  return (
                    <div
                      key={t.id}
                      className="group flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                          <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
                            {t.cat}
                          </span>
                          <span>
                            {slides} {slides === 1 ? "slide" : "slides"}
                          </span>
                        </div>
                        <h4 className="mt-2 text-[14px] font-semibold text-zinc-100 group-hover:text-white">
                          {t.name}
                        </h4>
                        {t.description && (
                          <p className="mt-1 text-xs leading-relaxed text-zinc-400 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-900 pt-3">
                        {onPreviewTemplate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => {
                              onPreviewTemplate(t);
                            }}
                          >
                            <Icon name="eye" className="mr-1" /> Preview
                          </Button>
                        )}
                        {onUseTemplate && (
                          <Button
                            size="sm"
                            className="h-7 bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
                            onClick={() => {
                              onUseTemplate(t);
                            }}
                          >
                            Use <Icon name="arrow-right" className="ml-1 text-[10px]" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
