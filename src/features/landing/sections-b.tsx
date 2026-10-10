import Link from "next/link";
import { AuthorCredit } from "@/components/common/author-credit";
import { Icon } from "@/components/common/icon";
import { COMMUNITY_TEMPLATES } from "@/data";
import { BRAND } from "@/lib/brand";
import { EXPORTS, FAQ } from "./content";
import { SectionHead } from "./section-head";

export function ExportStrip() {
  return (
    <section className="border-y border-zinc-900 bg-zinc-950 py-16">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4">
        {EXPORTS.map(([icon, title, text]) => (
          <div key={title} className="rounded-xl border border-zinc-800 p-5">
            <Icon name={icon} className="text-xl text-blue-400" />
            <div className="mt-3 text-[15px] font-semibold text-zinc-50">{title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const slideCount = (md: string) => (md.match(/^---$/gm)?.length ?? 0) + 1;

/** How many community templates the landing page shows; the rest are in the app. */
const SHOWN = 7;

/** Community templates, each credited to its author's GitHub profile. */
export function CommunitySection() {
  const more = COMMUNITY_TEMPLATES.length - SHOWN;
  return (
    <section id="templates" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead kicker="Community" title="Templates made by developers, credited to them." sub="Every community template shows who made it. Add yours with a pull request and your GitHub profile goes on it." />
        <a href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500">
          <Icon name="git-pull-request" /> Contribute a template
        </a>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COMMUNITY_TEMPLATES.slice(0, SHOWN).map((t) => (
          <div key={t.id} className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-full border border-zinc-800 px-2 py-0.5">{t.cat}</span>
              <span>{slideCount(t.md)} {slideCount(t.md) === 1 ? "slide" : "slides"}</span>
            </div>
            <h3 className="mt-3 text-[16px] font-semibold text-zinc-50">{t.name}</h3>
            <p className="mt-1 flex-1 text-[13px] leading-relaxed text-zinc-400">{t.description}</p>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-900 pt-4 text-[13px] text-zinc-300">
              <AuthorCredit name={t.author} github={t.authorGithub} size={22} />
              <Link href="/app" className="shrink-0 text-xs text-blue-400 hover:text-blue-300">
                Use template →
              </Link>
            </div>
          </div>
        ))}
        {more > 0 && (
          <Link href="/app" className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center text-sm text-zinc-300 hover:border-zinc-600">
            <Icon name="squares-four" className="text-2xl text-blue-400" />
            {more} more in the app
            <span className="text-xs text-zinc-500">Templates → Community</span>
          </Link>
        )}
        <a href={`${BRAND.repo}/blob/main/CONTRIBUTING.md`} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 p-5 text-center text-sm text-zinc-500 hover:border-zinc-600 hover:text-zinc-300">
          <Icon name="plus-circle" className="text-2xl" />
          Your template here
          <span className="text-xs">Submit to community from the app, or open a PR</span>
        </a>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24">
      <SectionHead kicker="FAQ" title="Questions developers ask" center />
      <div className="mt-10 divide-y divide-zinc-900 rounded-2xl border border-zinc-800">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-4 open:bg-zinc-900/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-zinc-100">
              {q}
              <Icon name="plus" className="shrink-0 text-zinc-500 transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden border-t border-zinc-900 py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_100%,rgba(59,130,246,.18),transparent_70%)]" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 text-center">
        <h2 className="text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-zinc-50">Write Markdown. Show the client.</h2>
        <p className="mt-4 text-[15px] text-zinc-400">Free and open source. Your decks stay in your repos.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/app" className="flex h-11 items-center gap-2 rounded-lg bg-zinc-50 px-5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">
            <Icon name="github-logo" /> {signedIn ? "Open your decks" : "Start with GitHub"}
          </Link>
          <a href={BRAND.repo} className="flex h-11 items-center gap-2 rounded-lg border border-zinc-800 px-5 text-sm text-zinc-200 hover:border-zinc-600">
            <Icon name="star" /> Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
