"use client";

import { useMemo } from "react";
import { SlideView } from "@/components/slide/slide-view";
import { buildLook, deckOptions } from "@/domain/deck/look";
import { EngineProvider, useEngine } from "@/engine/provider";

function Rendered({ md, title }: { md: string; title: string }) {
  const engine = useEngine();
  const { deck, look } = useMemo(() => {
    const deck = engine.parse(md);
    return { deck, look: buildLook(deckOptions(deck.meta)) };
  }, [engine, md]);
  const slide = deck.slides[0];
  return (
    <div role="img" aria-label={`${title}: rendered slide`} className="overflow-hidden rounded-xl border border-zinc-800">
      {slide && <SlideView slide={slide} index={0} total={deck.slides.length} look={look} />}
    </div>
  );
}

/** A workflow step's slide, rendered live by the md2slides engine (no static screenshots to go stale). */
export function WorkflowSlide({ md, title }: { md: string; title: string }) {
  return (
    <EngineProvider fallback={<div className="aspect-video animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />}>
      <Rendered md={md} title={title} />
    </EngineProvider>
  );
}
