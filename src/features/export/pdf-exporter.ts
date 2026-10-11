import { captureSlides } from "./slide-capture";
import type { Exporter } from "./types";

/** PDF page height in points (7.5in, PowerPoint's slide height); width follows the deck's aspect ratio. */
const PAGE_H = 540;

/**
 * Build a PDF file in the browser: every slide rendered as it looks on screen, one per page,
 * pages sized to the deck's aspect ratio. No print dialog, the same in every browser.
 */
export async function buildPdf(): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  let pdf: InstanceType<typeof jsPDF> | null = null;
  await captureSlides((canvas) => {
    const w = Math.round((PAGE_H * canvas.width) / canvas.height);
    const orientation = w >= PAGE_H ? "landscape" : "portrait";
    if (!pdf) pdf = new jsPDF({ unit: "pt", format: [w, PAGE_H], orientation, compress: true });
    else pdf.addPage([w, PAGE_H], orientation);
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, PAGE_H, undefined, "FAST");
  });
  return pdf!.output("blob");
}

export const pdfExporter: Exporter = {
  id: "pdf",
  label: "PDF",
  icon: "file-pdf",
  description: "A .pdf file of your slides exactly as they look: one slide per page, theme, backgrounds and layouts included.",
  uses: [],
  async run({ name }) {
    return { blob: await buildPdf(), filename: `${name}.pdf` };
  },
};
