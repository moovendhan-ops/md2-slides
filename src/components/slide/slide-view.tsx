"use client";

import { memo, useMemo } from "react";
import type { Slide } from "@/engine/types";
import type { Look } from "@/domain/deck/look";
import { animCss, slideFrame } from "@/domain/deck/slide-frame";
import { slideNumber } from "@/domain/deck/paginate";
import { RichText } from "./rich-text";
import { BlockEnvProvider, type SlideRenderOptions } from "./render-context";
import { BlockGroups } from "./block-groups";
import { MediaLayer } from "./media-layer";
import { CustomLayout } from "./custom-layout";
import { SlideChrome } from "./slide-chrome";
import { useFitToSlide } from "./use-fit";

interface Props {
  slide: Slide;
  index: number;
  total: number;
  look: Look;
  opts?: SlideRenderOptions;
}

const NO_OPTS: SlideRenderOptions = {};

/** Renders one slide at any size: every measure is in container query units. */
export const SlideView = memo(function SlideView({ slide, index, total, look, opts = NO_OPTS }: Props) {
  const f = useMemo(() => slideFrame(slide, index, look, !!opts.animate), [slide, index, look, opts.animate]);
  const env = useMemo(() => ({ look: slide.dir.accent ? { ...look, accent: slide.dir.accent } : look, opts }), [look, opts, slide.dir.accent]);
  const hasBlocks = slide.groups.some((g) => g.length);
  const clicksOn = slide.dir.clicks ? slide.dir.clicks !== "false" : look.clicks;
  const { ref, fit } = useFitToSlide([slide, look, f], f.zoom);
  return (
    <div style={{ containerType: "inline-size", width: "100%" }}>
      <div
        key={opts.seed}
        data-slide-frame
        style={{
          position: "relative", width: "100%", aspectRatio: look.aspect, background: f.bg, color: f.fg, fontFamily: slide.dir.font || look.font,
          overflow: "hidden", borderRadius: look.radius, boxShadow: `inset 0 0 0 1px ${look.rule}`,
        }}
      >
        {look.bar && <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: ".45cqw", minHeight: 2, background: look.accent }} />}
        {f.media && <MediaLayer m={f.media} look={look} onPick={opts.edit && opts.onMedia ? () => opts.onMedia?.(index) : undefined} />}
        {f.customId && <CustomLayout id={f.customId} slide={slide} look={look} overrides={opts.layouts} />}
        <BlockEnvProvider value={env}>
          <div
            ref={ref}
            style={{
              position: "absolute", inset: 0, pointerEvents: "none", zoom: f.zoom * fit, padding: f.pad, display: f.customId ? "none" : "flex", flexDirection: "column",
              justifyContent: f.justify, alignItems: f.align, textAlign: f.textAlign, gap: look.gap,
            }}
          >
            {slide.kicker && (
              <div
                style={{
                  flexShrink: 0, pointerEvents: "auto", animation: animCss(f.anim, 0, f.stagger), fontSize: "1.25cqw", letterSpacing: ".14em", textTransform: "uppercase",
                  color: env.look.accent, background: env.look.chip, padding: ".5cqw 1.1cqw", borderRadius: "99cqw", fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                {slide.kicker}
              </div>
            )}
            {slide.title && (
              <div style={{ flexShrink: 0, pointerEvents: "auto", position: "relative", maxWidth: f.titleMax, animation: animCss(f.anim, 1, f.stagger) }}>
                {opts.edit && (
                  <div
                    onClick={() => opts.onJump?.(slide.titleLine)}
                    title="Jump to source line"
                    className="hover:shadow-[0_0_0_2px_rgba(96,165,250,.8)]"
                    style={{ position: "absolute", inset: "-.6cqw -1cqw", borderRadius: "1cqw", cursor: "text", zIndex: 3 }}
                  />
                )}
                <div style={{ fontFamily: look.headFont, fontSize: f.titleSize, lineHeight: 1.05, letterSpacing: look.headLs, fontWeight: look.headW, textWrap: "balance", color: f.titleColor }}>
                  <RichText text={slide.title} look={env.look} />
                </div>
              </div>
            )}
            {slide.body && (
              <div style={{ flexShrink: 0, pointerEvents: "auto", animation: animCss(f.anim, 2, f.stagger), fontSize: look.bodySize, color: look.muted, maxWidth: "74%", lineHeight: 1.4, textWrap: "pretty" }}>
                <RichText text={slide.body} look={env.look} />
              </div>
            )}
            {hasBlocks && <BlockGroups slide={slide} anim={f.anim} stagger={f.stagger} clicksOn={clicksOn} />}
          </div>
        </BlockEnvProvider>
        <SlideChrome look={look} label={slideNumber(slide, index)} total={slide.sourceTotal ?? total} />
      </div>
    </div>
  );
});
