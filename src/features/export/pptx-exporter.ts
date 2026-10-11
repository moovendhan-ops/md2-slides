import type { Exporter } from "./types";
import { captureSlides } from "./slide-capture";

/** Slide height in inches (PowerPoint's default); width follows the deck's aspect ratio. */
const SLIDE_H = 7.5;

/**
 * A PowerPoint file whose slides look exactly like the deck: each slide is a full-bleed,
 * lossless 2560px image (so themes, gradients, code and custom layouts survive untouched),
 * with the speaker notes in PowerPoint's notes pane. Opens in PowerPoint, Keynote and Google Slides.
 */
export const pptxExporter: Exporter = {
  id: "pptx",
  label: "PowerPoint",
  icon: "presentation-chart",
  description: "A .pptx file for PowerPoint, Keynote or Google Slides. Every slide looks exactly as it does here (sharp, lossless), with your speaker notes.",
  uses: ["notes"],
  async run({ deck, options, name }) {
    const { default: PptxGenJS } = await import("pptxgenjs");
    const pptx = new PptxGenJS();
    pptx.title = deck.deck.meta.title || name;
    let width = 0;
    await captureSlides((canvas, i) => {
      if (!width) {
        width = Math.round(((SLIDE_H * canvas.width) / canvas.height) * 1000) / 1000;
        pptx.defineLayout({ name: "deck", width, height: SLIDE_H });
        pptx.layout = "deck";
      }
      const slide = pptx.addSlide();
      slide.addImage({ data: canvas.toDataURL("image/png"), x: 0, y: 0, w: width, h: SLIDE_H });
      const notes = deck.deck.slides[i]?.notes?.trim();
      if (options.notes && notes) slide.addNotes(notes);
    });
    const blob = (await pptx.write({ outputType: "blob" })) as Blob;
    return { blob, filename: `${name}.pptx` };
  },
};
