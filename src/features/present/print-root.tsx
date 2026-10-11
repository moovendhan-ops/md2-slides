"use client";

import { createPortal } from "react-dom";
import { useDeck } from "@/app-shell/deck-context";
import { SlideView } from "@/components/slide/slide-view";

/** Page size per aspect ratio, in inches (16:9 matches PowerPoint's widescreen slide). */
const PAGE: Record<string, string> = { "16 / 9": "13.333in 7.5in", "4 / 3": "10in 7.5in", "1 / 1": "7.5in 7.5in" };

/**
 * Every slide, one per printed page, sized to the page so "Save as PDF"
 * gives a vector PDF that looks like the slides on screen. Rendered at the
 * top of <body> so the print stylesheet can hide the rest of the app.
 */
export function PrintRoot() {
  const { deck, look } = useDeck();
  return createPortal(
    <div data-print-root className="pointer-events-none fixed top-0 left-[-10000px] w-[1280px]">
      <style>{`@page { size: ${PAGE[look.aspect] ?? PAGE["16 / 9"]}; margin: 0 }`}</style>
      {deck.slides.map((s, i) => (
        <div key={i} data-pg>
          <SlideView slide={s} index={i} total={deck.slides.length} look={look} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
