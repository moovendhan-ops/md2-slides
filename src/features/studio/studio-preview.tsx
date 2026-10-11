"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { slideData, validateLayout } from "@/domain/deck/custom-layout";
import { highlightJson } from "@/domain/deck/highlight";
import { buildLook, deckOptions, thumbLook } from "@/domain/deck/look";
import { Seg, Swatch } from "@/components/common/controls";
import { Icon } from "@/components/common/icon";
import { SlideView } from "@/components/slide/slide-view";
import { useEngine } from "@/engine/provider";
import { useStudio } from "@/stores/studio";

const ACCENTS = ["#60a5fa", "#a78bfa", "#f472b6", "#4ade80", "#fb923c"];

/** Live render of the layout being edited, plus validation and slot data. */
export function StudioPreview() {
  const engine = useEngine();
  const { html, config, sample, id: fallbackId, mode, accent, set } = useStudio();
  const { config: cfg, errors } = useMemo(() => validateLayout(html, config), [html, config]);
  const id = cfg?.id || fallbackId;
  const look = useMemo(() => thumbLook(buildLook({ ...deckOptions({}), mode, accent })), [mode, accent]);
  const slide = useMemo(() => engine.parse(sample.replace(/layout:\s*custom:[\w-]+/, `layout: custom:${id}`)).slides[0], [engine, sample, id]);
  const opts = useMemo(() => ({ layouts: { [id]: { html } } }), [id, html]);
  const usage = `<!-- layout: custom:${id} -->`;
  const slotDataText = useMemo(() => (slide ? JSON.stringify(slideData(slide), null, 2).slice(0, 900) : "{}"), [slide]);
  const slotDataLines = useMemo(() => slotDataText.split("\n").map(highlightJson), [slotDataText]);

  return (
    <div className="flex w-full flex-col gap-3 overflow-y-auto p-4 lg:w-[46%]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">Live preview</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            {ACCENTS.map((a) => (
              <Swatch key={a} color={a} active={accent === a} onClick={() => set({ accent: a })} />
            ))}
            <label className="relative flex items-center cursor-pointer" title="Custom color picker">
              <input
                type="color"
                value={accent.startsWith("#") && accent.length === 7 ? accent : "#60a5fa"}
                onChange={(e) => set({ accent: e.target.value })}
                className="absolute inset-0 size-5 opacity-0 cursor-pointer"
              />
              <span className="flex size-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-[11px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500">
                <Icon name="palette" />
              </span>
            </label>
            <div className="flex items-center rounded border border-zinc-800 bg-zinc-900/90 px-1.5 py-0.5 font-mono text-[11px]" title="Color code">
              <span className="size-2 rounded-full mr-1 shrink-0" style={{ backgroundColor: accent }} />
              <input
                type="text"
                value={accent}
                onChange={(e) => set({ accent: e.target.value })}
                placeholder="#60a5fa"
                className="w-16 bg-transparent text-zinc-200 uppercase outline-none font-mono"
              />
            </div>
          </div>
          <Seg size="sm" value={mode} onChange={(v) => set({ mode: v })} options={[{ id: "dark", label: "Dark" }, { id: "light", label: "Light" }]} />
        </div>
      </div>
      {slide && <SlideView slide={slide} index={0} total={1} look={look} opts={opts} />}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(usage).catch(() => undefined);
          toast("Copied layout tag to clipboard");
        }}
        className="flex items-center justify-between rounded-lg bg-zinc-900/70 px-3 py-2 text-left font-mono text-xs hover:bg-zinc-900 transition-colors"
        title="Click to copy layout code"
      >
        <div className="flex items-center gap-2">
          <Icon name="copy" className="text-zinc-500 text-xs" />
          <span>
            <span className="text-zinc-500">&lt;!--</span>{" "}
            <span className="text-zinc-400">layout:</span>{" "}
            <span className="text-violet-300 font-medium">custom:{id}</span>{" "}
            <span className="text-zinc-500">--&gt;</span>
          </span>
        </div>
        <span className="text-[10px] text-zinc-500">copy</span>
      </button>
      {errors.map((e) => (
        <p key={e.msg} className={`flex items-center gap-1.5 text-xs ${e.tip ? "text-amber-400" : "text-red-400"}`}>
          <Icon name={e.tip ? "lightbulb" : "x-circle"} /> {e.msg}
        </p>
      ))}
      <details className="text-xs text-zinc-400">
        <summary className="cursor-pointer select-none hover:text-zinc-300">Slot data from sample.md</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md bg-zinc-900/70 p-2.5 font-mono text-[11px] leading-5">
          {slotDataLines.map((segs, i) => (
            <div key={i} className="whitespace-pre">
              {segs.map((s, j) => (
                <span key={j} style={{ color: s.c }}>
                  {s.t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
