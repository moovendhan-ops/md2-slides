import { useUi } from "@/stores/ui";
import type { Exporter } from "./types";

export const markdownExporter: Exporter = {
  id: "md",
  label: "Markdown",
  icon: "file-md",
  description: "The deck source as a .md file.",
  uses: [],
  async run({ deck, name }) {
    return { blob: new Blob([deck.src], { type: "text/markdown" }), filename: `${name}.md` };
  },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves once fonts, images and custom-layout iframes in the print root have loaded (or after `timeout`). */
async function printRootReady(timeout = 5000) {
  await wait(100); // let React mount the print root
  const root = document.querySelector("[data-print-root]");
  const loaded = (el: HTMLImageElement | HTMLIFrameElement) =>
    new Promise<void>((resolve) => {
      if (el instanceof HTMLImageElement ? el.complete : el.contentDocument?.readyState === "complete") return resolve();
      el.addEventListener("load", () => resolve(), { once: true });
      el.addEventListener("error", () => resolve(), { once: true });
    });
  const media = root ? [...root.querySelectorAll<HTMLImageElement | HTMLIFrameElement>("img, iframe")] : [];
  await Promise.race([Promise.all([document.fonts.ready, ...media.map(loaded)]), wait(timeout)]);
  await wait(400); // custom layouts style themselves with Tailwind after their iframe loads
}

/** Browser print to PDF: one slide per page, sized to the deck's aspect ratio. */
export async function printSlides() {
  useUi.getState().set({ printing: true, modal: null });
  await printRootReady();
  window.print();
  setTimeout(() => useUi.getState().set({ printing: false }), 400);
}

export const pdfExporter: Exporter = {
  id: "pdf",
  label: "PDF",
  icon: "file-pdf",
  description: "A vector PDF that looks like your slides: one slide per page, theme and backgrounds included. Choose Save as PDF in the print dialog.",
  uses: [],
  run: printSlides,
};
