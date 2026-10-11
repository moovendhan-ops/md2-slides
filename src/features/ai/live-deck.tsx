"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Deck } from "@/engine/types";
import { buildLook, deckOptions, thumbLook } from "@/domain/deck/look";
import { Icon } from "@/components/common/icon";
import { SlideView } from "@/components/slide/slide-view";
import { useEngine } from "@/engine/provider";
import { extractDeck } from "@/services/ai/extract-deck";
import { useAi } from "@/stores/ai";

/** `value`, updated at most every `ms` (always ending on the latest value). */
function useThrottled<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  const last = useRef(0);
  useEffect(() => {
    const wait = Math.max(0, last.current + ms - Date.now());
    const t = setTimeout(() => {
      last.current = Date.now();
      setV(value);
    }, wait);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function useElapsed() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, []);
  return s;
}

const WAITING = ["Reading your request", "Sketching the outline", "Picking layouts", "Warming up the model"];

/**
 * The deck as the model writes it: the stream is parsed a few times a second and every slide
 * renders as soon as it appears, with the one being written glowing and a placeholder for the next.
 */
export function LiveDeck() {
  const engine = useEngine();
  const { typed, revising, count, task, history } = useAi();
  const text = useThrottled(typed, 180);
  const elapsed = useElapsed();
  const good = useRef<Deck | null>(null);

  const deck = useMemo(() => {
    const md = extractDeck(text);
    // Until the first slide title arrives the text is only chatter or front matter.
    if (!/^#{1,2}\s+\S/m.test(md)) return null;
    try {
      return (good.current = engine.parse(md));
    } catch {
      return good.current; // Half-written syntax: keep the last frame that parsed.
    }
  }, [engine, text]);
  const look = useMemo(() => thumbLook(buildLook(deckOptions(deck?.meta ?? {}))), [deck?.meta]);
  const slides = deck?.slides ?? [];
  const expected = revising ? 0 : task === "deck" ? count : 1;
  const placeholders = slides.length === 0 ? 2 : slides.length < expected ? 1 : 0;

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [slides.length]);

  const status = !typed
    ? `${WAITING[Math.floor(elapsed / 3) % WAITING.length]}…`
    : slides.length === 0
    ? "Setting up the theme…"
    : `${revising ? "Rewriting" : "Writing"} slide ${slides.length}${expected > slides.length ? ` of ~${expected}` : ""}…`;
  const tail = typed.split("\n").slice(-4).join("\n");
  const pct = expected ? Math.min(95, (slides.length / expected) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 font-medium text-zinc-100">
          <span className="relative grid size-5 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/40" />
            <Icon name={revising ? "magic-wand" : "sparkle"} className="relative text-violet-300" />
          </span>
          {status}
        </span>
        <span className="font-mono text-zinc-500">
          {revising && <span className="mr-2 text-violet-300">v{history.length + 2}</span>}
          {typed.length.toLocaleString()} chars · {elapsed}s
        </span>
      </div>

      <div className="relative h-1 overflow-hidden rounded-full bg-zinc-800">
        {pct > 0 ? (
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        ) : (
          <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-violet-400 to-transparent" style={{ animation: "ai-indeterminate 1.3s ease-in-out infinite" }} />
        )}
      </div>

      <div ref={scroller} className="grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto p-1">
        {slides.map((s, i) => {
          const writing = i === slides.length - 1;
          return (
            <div
              key={i}
              className={`relative rounded-[6px] ${writing ? "ai-glow" : ""}`}
              style={{ animation: "tr-zoom .45s cubic-bezier(.2,.7,.2,1) both" }}
            >
              <SlideView slide={s} index={i} total={slides.length} look={look} />
              {writing && (
                <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-violet-600/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                  <Icon name="pencil-simple" /> writing<span className="ai-caret">▍</span>
                </span>
              )}
            </div>
          );
        })}
        {Array.from({ length: placeholders }, (_, i) => (
          <div key={`p${i}`} className="ai-shimmer grid aspect-video place-items-center rounded-[6px] border border-zinc-800 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Icon name="cooking-pot" /> slide {slides.length + i + 1}
            </span>
          </div>
        ))}
      </div>

      <pre className="relative h-[4.5rem] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-[11px] leading-4 whitespace-pre-wrap text-zinc-400">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-zinc-900 to-transparent" />
        {tail}
        <span className="ai-caret text-violet-400">▍</span>
      </pre>
    </div>
  );
}
