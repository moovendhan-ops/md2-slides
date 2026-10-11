"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/common/icon";
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

          {/* Become a Contributor & Contributing Guide Section */}
          <div id="guide" className="mt-16 scroll-mt-28 rounded-3xl border border-zinc-800 bg-[radial-gradient(ellipse_60%_80%_at_100%_0%,rgba(59,130,246,0.12),transparent_70%)] p-8 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
                  <Icon name="sparkle" /> Contributor Guide
                </div>
                <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">How to Contribute & Get Featured</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
                  When you submit a community template or layout, md2slides automatically credits your GitHub profile. If you are not already listed in <code className="rounded bg-zinc-850 px-1.5 py-0.5 font-mono text-xs text-blue-300">community/CONTRIBUTORS.json</code>, the app automatically adds your record (with your name, bio, and signature color) to the pull request!
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Link
                  href="/app"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-500"
                >
                  <Icon name="plus-circle" /> Submit from App
                </Link>
                <a
                  href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  <Icon name="github-logo" /> GitHub Repo
                </a>
              </div>
            </div>

            {/* 2 Methods Breakdown */}
            <div className="mt-8 grid gap-5 border-t border-zinc-850 pt-8 md:grid-cols-2">
              {/* Method A: In-App 1-Click Submission */}
              <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
                <div>
                  <div className="flex items-center gap-2.5 text-base font-semibold text-zinc-100">
                    <span className="grid size-7 place-items-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400">A</span>
                    In-App 1-Click Submission
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    The fastest way to publish a layout or slide template:
                  </p>
                  <ul className="mt-3.5 flex flex-col gap-2.5 text-xs text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>Open any deck or build a slide in the <strong>Template Studio</strong> (<code className="text-zinc-400 font-mono">/app</code>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>Click <strong>Submit to community</strong> in the top toolbar.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>Choose your <strong>signature color</strong>, enter a description, and click <strong>Open pull request</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span><strong>Automatic check</strong>: md2slides checks <code className="text-zinc-400 font-mono">CONTRIBUTORS.json</code>; if you are new, it appends your profile automatically!</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-5 border-t border-zinc-900 pt-3">
                  <Link href="/app" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                    Open Template Studio now →
                  </Link>
                </div>
              </div>

              {/* Method B: Manual Git PR */}
              <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
                <div>
                  <div className="flex items-center gap-2.5 text-base font-semibold text-zinc-100">
                    <span className="grid size-7 place-items-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-400">B</span>
                    Git & Pull Request Workflow
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    For developers working in their local code editor:
                  </p>
                  <ul className="mt-3.5 flex flex-col gap-2.5 text-xs text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>Fork and clone <code className="text-zinc-400 font-mono">moovendhan-v/md2-slides</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>Create <code className="text-zinc-400 font-mono">community/templates/&lt;id&gt;/deck.md</code> and <code className="text-zinc-400 font-mono">meta.json</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>If not in <code className="text-zinc-400 font-mono">community/CONTRIBUTORS.json</code>, add your entry with your <code className="text-zinc-400 font-mono">&quot;color&quot;</code> hex code.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Icon name="check-circle" className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>Run <code className="text-zinc-400 font-mono">npm run community</code> to validate with the Rust/Wasm engine.</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-5 border-t border-zinc-900 pt-3">
                  <a href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                    Read CONTRIBUTING.md on GitHub →
                  </a>
                </div>
              </div>
            </div>

            {/* CONTRIBUTORS.json schema reference */}
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span className="font-mono text-zinc-400">community/CONTRIBUTORS.json format</span>
                <span className="text-[11px] text-zinc-500">Includes custom signature color</span>
              </div>
              <pre className="mt-2.5 overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
{`[
  {
    "github": "your-handle",
    "name": "Your Display Name",
    "role": "Template author",
    "bio": "Frontend engineer creating modern presentation systems.",
    "website": "https://yourwebsite.com",
    "color": "#3b82f6"
  }
]`}
              </pre>
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
