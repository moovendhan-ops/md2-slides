"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { CONTRIBUTORS, type Contributor } from "@/data";
import { githubProfile } from "@/lib/github";
import { ContributorProfileDialog } from "@/features/community/contributor-profile-dialog";

export function ContributorsSlides() {
  const router = useRouter();
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);

  // Duplicate items to ensure smooth infinite running marquee
  const marqueeItems = useMemo(() => {
    if (CONTRIBUTORS.length === 0) return [];
    let items = [...CONTRIBUTORS];
    while (items.length < 8) {
      items = [...items, ...CONTRIBUTORS];
    }
    return [...items, ...items];
  }, []);

  return (
    <section className="relative overflow-hidden border-t border-zinc-900 bg-[#050507] py-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-[700px] rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              <Icon name="sparkle" /> Open source community
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Templates crafted by developers
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Explore deck designs and slides authored by community contributors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/contributors"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              View contributor directory
              <Icon name="arrow-right" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Running Slides / Marquee Track */}
      <div className="relative mt-10 w-full overflow-hidden">
        {/* Left & Right gradient fades for smooth carousel look */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#050507] to-transparent sm:w-36" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#050507] to-transparent sm:w-36" />

        <div className="animate-marquee-track flex gap-5 py-3">
          {marqueeItems.map((c, idx) => {
            const profile = githubProfile(c.github, 112);
            return (
              <button
                key={`${c.github}-${idx}`}
                type="button"
                onClick={() => setSelectedContributor(c)}
                className="group relative flex w-[300px] shrink-0 cursor-pointer flex-col justify-between rounded-2xl border border-zinc-850 bg-zinc-950/80 p-5 text-left shadow-lg backdrop-blur transition-all hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <div className="relative">
                      <img
                        src={profile?.avatar || `https://avatars.githubusercontent.com/${c.github}?v=4&s=112`}
                        alt={c.name || c.github}
                        width={52}
                        height={52}
                        className="size-13 rounded-2xl border border-zinc-700/80 bg-zinc-900 object-cover shadow"
                      />
                      <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-blue-500 text-[9px] text-white">
                        <Icon name="check" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-zinc-100 group-hover:text-white">
                        {c.name || c.github}
                      </div>
                      <div className="text-xs text-zinc-500">@{c.github}</div>
                      <div className="mt-1 inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                        {c.role || "Template author"}
                      </div>
                    </div>
                  </div>

                  {c.bio && (
                    <p className="mt-3.5 text-xs leading-relaxed text-zinc-400 line-clamp-2">
                      {c.bio}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-3 text-xs">
                  <span className="font-medium text-zinc-400">
                    <span className="text-zinc-100 font-semibold">{c.templates}</span> templates
                  </span>
                  <span className="flex items-center gap-1 text-blue-400 group-hover:text-blue-300">
                    View profile <Icon name="arrow-up-right" className="text-[11px]" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <ContributorProfileDialog
        contributor={selectedContributor}
        onClose={() => setSelectedContributor(null)}
        onUseTemplate={() => router.push("/app")}
        onPreviewTemplate={() => router.push("/app")}
      />
    </section>
  );
}
