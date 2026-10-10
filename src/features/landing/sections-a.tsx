import { Icon } from "@/components/common/icon";
import { PAINS, WORKFLOW, WORKS_WITH } from "./content";
import { SectionHead } from "./section-head";
import { WorkflowSlide } from "./workflow-slide";

export function WorksWith() {
  return (
    <section className="border-y border-zinc-900 py-8" aria-label="Works with">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 text-zinc-500">
        <span className="text-xs tracking-widest uppercase">Works with</span>
        {WORKS_WITH.map(([icon, name]) => (
          <span key={name} className="flex items-center gap-2 text-sm">
            <Icon name={icon} className="text-lg" /> {name}
          </span>
        ))}
      </div>
    </section>
  );
}

export function PainGrid() {
  return (
    <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <SectionHead kicker="The problem" title="Slide tools weren't built for people who ship code." sub="You already write everything in Markdown and Git. Your slides should live there too, and look good enough to put in front of a client." />
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {PAINS.map((p) => (
          <div key={p.pain} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-start gap-3 text-[15px] text-zinc-500 line-through decoration-red-400/60">
              <Icon name="x-circle" className="mt-0.5 shrink-0 text-red-400 no-underline" /> {p.pain}
            </div>
            <div className="mt-4 flex items-start gap-3 text-[17px] font-semibold text-zinc-50">
              <Icon name="check-circle" className="mt-0.5 shrink-0 text-green-400" /> {p.fix}
            </div>
            <p className="mt-2 pl-8 text-[13.5px] leading-relaxed text-zinc-400">{p.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Workflow() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-zinc-900 bg-zinc-950 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead kicker="Workflow" title="Update the file. The deck follows." sub="No exporting, no re-uploading, no “final_v7.pptx”. The Markdown in your repo is the presentation." />
        <div className="mt-12 flex flex-col gap-5">
          {WORKFLOW.map((s) => (
            <div key={s.n} className="grid items-center gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 md:grid-cols-[1fr_1.15fr] md:p-7">
              <div>
                <div className="font-mono text-xs text-blue-400">{s.n}</div>
                <h3 className="mt-1 text-lg font-semibold text-zinc-50">{s.title}</h3>
                <p className="mt-1 text-[13.5px] text-zinc-400">{s.text}</p>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-300">{s.code}</pre>
              </div>
              <WorkflowSlide md={s.slide} title={s.title} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
