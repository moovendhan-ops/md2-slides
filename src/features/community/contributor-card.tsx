"use client";

import { useMemo } from "react";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { COMMUNITY_TEMPLATES, type Contributor } from "@/data";
import { githubProfile } from "@/lib/github";

export function ContributorCard({
  contributor: c,
  onOpenProfile,
}: {
  contributor: Contributor;
  onOpenProfile: (c: Contributor) => void;
}) {
  const profile = githubProfile(c.github, 96);

  const authorTemplates = useMemo(() => {
    return COMMUNITY_TEMPLATES.filter(
      (t) => t.authorGithub?.toLowerCase() === c.github.toLowerCase()
    );
  }, [c.github]);

  const previewTemplates = authorTemplates.slice(0, 3);

  const color = c.color || "#3b82f6";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenProfile(c)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpenProfile(c))}
      className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/40"
      style={{
        boxShadow: "0 0 0 1px transparent",
      }}
    >
      <div>
        {/* Header with avatar & info */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile?.avatar || `https://avatars.githubusercontent.com/${c.github}?v=4&s=96`}
              alt={c.name || c.github}
              width={48}
              height={48}
              className="size-12 rounded-xl border bg-zinc-900 object-cover"
              style={{ borderColor: `${color}60` }}
            />
            <span
              className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-zinc-950"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-zinc-100 group-hover:text-white">
                {c.name || c.github}
              </h3>
            </div>
            <p className="text-xs text-zinc-400">@{c.github}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  borderColor: `${color}40`,
                  backgroundColor: `${color}15`,
                  color: color,
                }}
              >
                {c.role || "Template Contributor"}
              </span>
              <span className="text-xs text-zinc-500">
                · {c.templates} {c.templates === 1 ? "template" : "templates"}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {c.bio && (
          <p className="mt-3.5 text-xs leading-relaxed text-zinc-400 line-clamp-2">
            {c.bio}
          </p>
        )}

        {/* Templates mini preview */}
        {previewTemplates.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5 border-t border-zinc-900 pt-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Contributed templates
            </span>
            <div className="flex flex-wrap gap-1.5">
              {previewTemplates.map((t) => (
                <span
                  key={t.id}
                  className="rounded-md border border-zinc-800/80 bg-zinc-900/80 px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  {t.name}
                </span>
              ))}
              {authorTemplates.length > 3 && (
                <span className="rounded-md border border-zinc-800/60 bg-zinc-900/40 px-2 py-0.5 text-[11px] text-zinc-500">
                  +{authorTemplates.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-900 pt-3 text-xs">
        <span className="text-zinc-500 group-hover:text-zinc-400">
          View templates & profile
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 border-zinc-800 text-xs text-zinc-300 group-hover:border-zinc-700 group-hover:bg-zinc-800"
        >
          View profile <Icon name="arrow-right" className="text-[10px]" />
        </Button>
      </div>
    </div>
  );
}
