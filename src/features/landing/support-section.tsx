import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthorCredit } from "@/components/common/author-credit";
import { Icon } from "@/components/common/icon";
import { CONTRIBUTORS, type Contributor } from "@/data";
import { BRAND } from "@/lib/brand";
import { SectionHead } from "./section-head";
import { ContributorProfileDialog } from "@/features/community/contributor-profile-dialog";

const WAYS: [string, string, string, string][] = [
  ["git-pull-request", "Add a template", "A deck.md and meta.json in community/templates. Your name and GitHub profile appear on it.", `${BRAND.repo}/blob/main/CONTRIBUTING.md`],
  ["bug", "Report or fix a bug", "Issues and pull requests are welcome, from typos to engine changes.", `${BRAND.repo}/issues`],
  ["star", "Star the repo", "Stars help other developers find md2slides.", BRAND.repo],
];

const DONATE: [string, string, string, string][] = [
  ["heart", "GitHub Sponsors", BRAND.support.sponsors, "bg-pink-500/10 text-pink-300 border-pink-500/30 hover:border-pink-400"],
  ["coffee", "Buy Me a Coffee", BRAND.support.buyMeACoffee, "bg-amber-500/10 text-amber-200 border-amber-500/30 hover:border-amber-400"],
  ["hand-heart", "Open Collective", BRAND.support.openCollective, "bg-blue-500/10 text-blue-200 border-blue-500/30 hover:border-blue-400"],
];

/** Contribute (code, templates, stars), donate, and the contributors wall. */
export function SupportSection() {
  const router = useRouter();
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);

  return (
    <section id="contribute" className="scroll-mt-20 border-y border-zinc-900 bg-zinc-950 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead kicker="Open source" title="Built in the open. Kept alive by developers." sub="md2slides is free. If it saves you an afternoon of slide wrangling, give something back: a template, a fix, a star or a coffee." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {WAYS.map(([icon, title, text, href]) => (
            <a key={title} href={href} className="group rounded-2xl border border-zinc-800 p-5 hover:border-zinc-600">
              <Icon name={icon} className="text-xl text-blue-400" />
              <div className="mt-3 flex items-center gap-1 text-[15px] font-semibold text-zinc-50">
                {title} <Icon name="arrow-up-right" className="text-xs text-zinc-500 group-hover:text-zinc-200" />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{text}</p>
            </a>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[radial-gradient(70%_120%_at_0%_0%,rgba(236,72,153,.08),transparent_60%)] p-6 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="text-[16px] font-semibold text-zinc-50">Support the developer</div>
            <p className="mt-1 text-[13px] text-zinc-400">Donations fund hosting, the VS Code extension and new templates.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DONATE.map(([icon, label, href, cls]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium ${cls}`}>
                <Icon name={icon} /> {label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <div className="text-sm font-semibold text-zinc-200">Contributors</div>
          <div className="mt-4 flex flex-wrap gap-3">
            {CONTRIBUTORS.map((c) => (
              <button
                key={c.github}
                type="button"
                onClick={() => setSelectedContributor(c)}
                className="group flex cursor-pointer items-center gap-3 rounded-full border border-zinc-800 py-1.5 pr-4 pl-1.5 text-[13px] text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
              >
                <AuthorCredit name={c.name || c.github} github={c.github} size={28} stopPropagation onClick={() => setSelectedContributor(c)} />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400">
                  {c.role}
                  {c.templates ? ` · ${c.templates} template${c.templates > 1 ? "s" : ""}` : ""}
                </span>
                <Icon name="arrow-up-right" className="text-xs text-zinc-600 group-hover:text-zinc-300" />
              </button>
            ))}
            <a href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`} className="flex items-center gap-2 rounded-full border border-dashed border-zinc-800 px-4 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-200">
              <Icon name="plus" /> You?
            </a>
          </div>
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
