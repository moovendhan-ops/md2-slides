"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTRIBUTORS, COMMUNITY_TEMPLATES, type Contributor } from "@/data";
import { BRAND } from "@/lib/brand";
import { LandingNav } from "@/features/landing/nav";
import { LandingFooter } from "@/features/landing/footer";
import { useSignedIn } from "@/features/landing/use-signed-in";
import { ContributorCard } from "@/features/community/contributor-card";
import { ContributorProfileDialog } from "@/features/community/contributor-profile-dialog";

export function ContributorsPage() {
  const signedIn = useSignedIn();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    COMMUNITY_TEMPLATES.forEach((t) => {
      if (t.cat) set.add(t.cat);
    });
    return ["All", ...Array.from(set).sort()];
  }, []);

  const filteredContributors = useMemo(() => {
    return CONTRIBUTORS.filter((c) => {
      const matchQ =
        !q ||
        c.github.toLowerCase().includes(q.toLowerCase()) ||
        (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
        (c.role && c.role.toLowerCase().includes(q.toLowerCase())) ||
        (c.bio && c.bio.toLowerCase().includes(q.toLowerCase())) ||
        (c.categories && c.categories.some((cat) => cat.toLowerCase().includes(q.toLowerCase())));

      const matchCat =
        selectedCat === "All" ||
        (c.categories && c.categories.includes(selectedCat)) ||
        COMMUNITY_TEMPLATES.some(
          (t) => t.authorGithub?.toLowerCase() === c.github.toLowerCase() && t.cat === selectedCat
        );

      return matchQ && matchCat;
    });
  }, [q, selectedCat]);

  return (
    <div className="min-h-dvh bg-[#060608] text-zinc-50 flex flex-col">
      <LandingNav signedIn={signedIn} />

      <main className="flex-1 pt-24 pb-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b border-zinc-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] pb-16 pt-12">
          <div className="mx-auto max-w-6xl px-5 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-400">
              <Icon name="users" /> Open source contributors
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              Meet the creators behind <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">md2slides</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Every template in the catalog is crafted by developers around the world.
              Browse profiles, discover slide systems, and use them directly in your presentations.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-50 px-5 text-sm font-semibold text-zinc-950 shadow transition-all hover:bg-zinc-200"
              >
                <Icon name="git-pull-request" className="text-base" /> Contribute a template
              </a>
              <Link
                href="/app"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-700 hover:bg-zinc-800"
              >
                <Icon name="presentation" className="text-base text-blue-400" /> Open Template Library
              </Link>
            </div>

            {/* Metrics Strip */}
            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-4">
                <div className="text-2xl font-bold text-white sm:text-3xl">{CONTRIBUTORS.length}</div>
                <div className="mt-1 text-xs text-zinc-400">Contributors</div>
              </div>
              <div className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-4">
                <div className="text-2xl font-bold text-white sm:text-3xl">{COMMUNITY_TEMPLATES.length}+</div>
                <div className="mt-1 text-xs text-zinc-400">Community templates</div>
              </div>
              <div className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-4">
                <div className="text-2xl font-bold text-white sm:text-3xl">{categories.length - 1}</div>
                <div className="mt-1 text-xs text-zinc-400">Layout categories</div>
              </div>
              <div className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-4">
                <div className="text-2xl font-bold text-white sm:text-3xl">100%</div>
                <div className="mt-1 text-xs text-zinc-400">Open source</div>
              </div>
            </div>
          </div>
        </div>

        {/* Directory Section */}
        <div className="mx-auto max-w-6xl px-5 pt-12">
          {/* Controls: Search & Category Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search contributors…"
                className="h-10 border-zinc-800 bg-zinc-900/60 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.slice(0, 7).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCat === cat
                      ? "bg-zinc-100 text-zinc-950 font-semibold"
                      : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Contributors Grid */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContributors.map((c) => (
              <ContributorCard
                key={c.github}
                contributor={c}
                onOpenProfile={(c) => setSelectedContributor(c)}
              />
            ))}
            {filteredContributors.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
                <Icon name="magnifying-glass" className="mx-auto text-3xl text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-400">No contributors matched your search.</p>
                <button
                  type="button"
                  onClick={() => { setQ(""); setSelectedCat("All"); }}
                  className="mt-3 text-xs text-blue-400 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Become a Contributor Section */}
          <div className="mt-16 rounded-3xl border border-zinc-800 bg-[radial-gradient(ellipse_60%_80%_at_100%_0%,rgba(59,130,246,0.1),transparent_70%)] p-8 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Get featured</span>
                <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Want your templates featured here?</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Contributing a template is as simple as adding a <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 font-mono">deck.md</code> and <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200 font-mono">meta.json</code>. Your GitHub profile, avatar, and social links are automatically added to this page.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <a
                  href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  <Icon name="git-pull-request" /> View Contributing Guide
                </a>
              </div>
            </div>

            {/* 3 Steps */}
            <div className="mt-8 grid gap-4 border-t border-zinc-850 pt-8 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <span className="grid size-6 place-items-center rounded-full bg-blue-500/20 text-xs text-blue-400">1</span>
                  Create layout
                </div>
                <p className="text-xs text-zinc-400">Write your deck Markdown or design a layout in the template studio.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <span className="grid size-6 place-items-center rounded-full bg-blue-500/20 text-xs text-blue-400">2</span>
                  Validate
                </div>
                <p className="text-xs text-zinc-400">Test locally with <code className="font-mono text-[11px] text-zinc-300">npm run community</code>.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <span className="grid size-6 place-items-center rounded-full bg-blue-500/20 text-xs text-blue-400">3</span>
                  Open a PR
                </div>
                <p className="text-xs text-zinc-400">Submit a pull request. Once merged, you are instantly listed on the contributors wall!</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />

      <ContributorProfileDialog
        contributor={selectedContributor}
        onClose={() => setSelectedContributor(null)}
        onUseTemplate={() => router.push("/app")}
        onPreviewTemplate={() => router.push("/app")}
      />
    </div>
  );
}
