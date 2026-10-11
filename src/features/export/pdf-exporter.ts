import { useUi } from "@/stores/ui";
import type { Exporter } from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Capture resolution: the print root is 1280px wide, so 1.5× gives 1920px pages. */
const SCALE = 1.5;
/** PDF page height in points (7.5in, PowerPoint's slide height); width follows the deck's aspect ratio. */
const PAGE_H = 540;

/** Resolves once fonts, images and custom-layout iframes in the print root have loaded (or after `timeout`). */
async function printRootReady(timeout = 5000) {
  await wait(100); // let React mount the print root
  const root = document.querySelector("[data-print-root]");
  const loaded = (el: HTMLImageElement | HTMLIFrameElement) =>
    new Promise<void>((resolve) => {
      if (el instanceof HTMLImageElement && el.complete) return resolve();
      el.addEventListener("load", () => resolve(), { once: true });
      el.addEventListener("error", () => resolve(), { once: true });
    });
  const media = root ? [...root.querySelectorAll<HTMLImageElement | HTMLIFrameElement>("img, iframe")] : [];
  await Promise.race([Promise.all([document.fonts.ready, ...media.map(loaded)]), wait(timeout)]);
  await wait(400); // custom layouts style themselves with Tailwind after their iframe loads
  return root;
}

/** Ask a custom layout's sandboxed iframe for its rendered HTML (see `customDocument`). */
function frameHtml(frame: HTMLIFrameElement, timeout = 10_000): Promise<string | null> {
  const win = frame.contentWindow;
  if (!win) return Promise.resolve(null);
  const id = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const done = (html: string | null) => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(html);
    };
    const onMessage = (e: MessageEvent) => {
      const m = e.data as { type?: string; id?: string; html?: string } | null;
      if (e.source === win && m?.type === "m2s-captured" && m.id === id) done(m.html ?? null);
    };
    const timer = setTimeout(() => done(null), timeout);
    window.addEventListener("message", onMessage);
    win.postMessage({ type: "m2s-capture", id }, "*");
  });
}

/** modern-screenshot's browser build, loaded into the capture iframe so it runs in that document's realm. */
const SCREENSHOT_JS = {
  src: "https://cdn.jsdelivr.net/npm/modern-screenshot@4.7.0/dist/index.js",
  integrity: "sha384-5Ua3TI0kiMYH8QdNy+vc5IWS3MTa2DzQEm/uKFDQ+/biJctek9hiSP6moIm2PVog",
};

/** Drop everything in layout HTML that could run code: scripts, embeds, event handlers, `javascript:` URLs. */
function inert(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, frame, object, embed, base, meta[http-equiv], noscript").forEach((n) => n.remove());
  for (const el of doc.querySelectorAll("*")) {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || /^\s*(javascript|data:text\/html)/i.test(a.value)) el.removeAttribute(a.name);
    }
  }
  return "<!doctype html>" + doc.documentElement.outerHTML;
}

type Shot = { domToCanvas: typeof import("modern-screenshot").domToCanvas };

/**
 * Render a custom layout to a canvas. Its HTML (Tailwind styles already generated) goes into a
 * temporary iframe with everything executable removed; the screenshot library then runs inside
 * that iframe, since capturing another document's nodes from the page renders them wrongly.
 */
async function frameCanvas(frame: HTMLIFrameElement, width: number, height: number): Promise<HTMLCanvasElement | null> {
  const html = await frameHtml(frame);
  if (!html) return null;
  const tmp = document.createElement("iframe");
  tmp.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;border:0`;
  tmp.srcdoc = inert(html);
  try {
    await new Promise((r) => {
      tmp.addEventListener("load", r, { once: true });
      document.body.appendChild(tmp);
    });
    const doc = tmp.contentDocument;
    const el = doc?.getElementById("slide");
    if (!doc || !el) return null;
    await new Promise((ok, no) => {
      const js = doc.createElement("script");
      Object.assign(js, SCREENSHOT_JS, { crossOrigin: "anonymous", onload: ok, onerror: no });
      doc.head.appendChild(js);
    });
    await Promise.race([doc.fonts.ready, wait(3000)]);
    const shot = (tmp.contentWindow as unknown as { modernScreenshot?: Shot }).modernScreenshot;
    if (!shot) return null;
    const shotCanvas = await shot.domToCanvas(el, { scale: SCALE });
    // Copy out before the iframe (and the canvas it owns) goes away.
    const copy = document.createElement("canvas");
    copy.width = shotCanvas.width;
    copy.height = shotCanvas.height;
    copy.getContext("2d")?.drawImage(shotCanvas, 0, 0);
    return copy;
  } catch {
    return null;
  } finally {
    tmp.remove();
  }
}

/** Render one slide (the element with the slide's background) to a canvas. */
async function slideCanvas(slide: HTMLElement): Promise<HTMLCanvasElement> {
  const { domToCanvas } = await import("modern-screenshot");
  const canvas = await domToCanvas(slide, {
    scale: SCALE,
    // The on-screen frame's rounded corners and hairline don't belong on a PDF page.
    style: { borderRadius: "0", boxShadow: "none" },
    filter: (n) => !(n instanceof HTMLIFrameElement),
  });
  const box = slide.getBoundingClientRect();
  const ctx = canvas.getContext("2d");
  for (const frame of slide.querySelectorAll("iframe")) {
    const r = frame.getBoundingClientRect();
    const img = await frameCanvas(frame, r.width, r.height);
    if (!img || !ctx) continue;
    ctx.drawImage(img, (r.left - box.left) * SCALE, (r.top - box.top) * SCALE, r.width * SCALE, r.height * SCALE);
  }
  return canvas;
}

/**
 * Build a PDF file in the browser: every slide rendered as it looks on screen, one per page,
 * pages sized to the deck's aspect ratio. No print dialog, the same in every browser.
 */
export async function buildPdf(onProgress?: (done: number, total: number) => void): Promise<Blob> {
  useUi.getState().set({ printing: true });
  try {
    const root = await printRootReady();
    const slides = [...(root?.querySelectorAll<HTMLElement>("[data-pg]") ?? [])]
      .map((pg) => pg.querySelector<HTMLElement>("[data-slide-frame]"))
      .filter((el): el is HTMLElement => !!el);
    if (!slides.length) throw new Error("This deck has no slides");
    const { jsPDF } = await import("jspdf");
    let pdf: InstanceType<typeof jsPDF> | null = null;
    for (const [i, el] of slides.entries()) {
      onProgress?.(i, slides.length);
      const canvas = await slideCanvas(el);
      const w = Math.round((PAGE_H * canvas.width) / canvas.height);
      const orientation = w >= PAGE_H ? "landscape" : "portrait";
      if (!pdf) pdf = new jsPDF({ unit: "pt", format: [w, PAGE_H], orientation, compress: true });
      else pdf.addPage([w, PAGE_H], orientation);
      pdf.addImage(canvas, "JPEG", 0, 0, w, PAGE_H, undefined, "FAST");
    }
    onProgress?.(slides.length, slides.length);
    return pdf!.output("blob");
  } finally {
    useUi.getState().set({ printing: false });
  }
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
