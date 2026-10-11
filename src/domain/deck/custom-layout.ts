import type { Slide } from "@/engine/types";
import type { Look } from "./look";

/** Slot data handed to HTML + Tailwind layouts (`<!-- layout: custom:id -->`). */
export interface SlotData {
  title: string;
  kicker: string;
  body: string;
  image: string;
  code: string;
  items: { icon: string; title: string; text: string }[];
  notes: string;
}

export function slideData(sl: Slide): SlotData {
  const items: SlotData["items"] = [];
  let code = "";
  const blocks = sl.groups.flat();
  blocks.forEach((b) => {
    if (b.rows && !items.length && b.type !== "terminal") {
      b.rows.forEach((r) => {
        const c = r.replace(/^\s*([-*]|\d+\.)\s+(\[[ x]\]\s*)?/i, "").split("|").map((x) => x.trim());
        if (c.length >= 3) items.push({ icon: "ph-" + c[0].replace(/^ph-/, ""), title: c[1], text: c[2] });
        else if (c.length === 2) items.push({ icon: "ph-circle", title: c[0], text: c[1] });
        else items.push({ icon: "ph-check", title: c[0], text: "" });
      });
    }
    if (b.type === "code" && !code) code = (b.code ?? []).join("\n");
  });
  const image = sl.dir.image || blocks.find((b) => b.type === "image")?.src || "";
  return { title: sl.title, kicker: sl.kicker, body: sl.body, image, code, items, notes: sl.notes };
}

export type SlotFiller = (html: string, data: SlotData) => string;

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono&family=Space+Grotesk:wght@500;700&family=Instrument+Serif&family=IBM+Plex+Sans:wght@400;600&family=JetBrains+Mono&display=swap";

/**
 * PDF export can't read this sandboxed iframe, so on a `m2s-capture` message it posts back its
 * own HTML, with the Tailwind styles already generated, for the exporter to render script-free.
 */
const CAPTURE =
  `addEventListener("message",function(e){var m=e.data;if(!m||m.type!=="m2s-capture")return;` +
  `document.fonts.ready.then(function(){parent.postMessage({type:"m2s-captured",id:m.id,html:"<!doctype html>"+document.documentElement.outerHTML},"*")})});`;

/** Full iframe document: Tailwind Play CDN themed with the deck's tokens. */
export function customDocument(html: string, data: SlotData, look: Look, fill: SlotFiller): string {
  const vars = [
    ["accent", look.accent], ["fg", look.fg], ["muted", look.muted], ["bg", look.bgSolid], ["panel", look.panel],
    ["rule", look.rule], ["chip", look.chip], ["head", look.headFont], ["body", look.font], ["mono", look.mono],
  ].map(([k, v]) => `--${k}:${v}`).join(";");
  const colors = ["accent", "fg", "muted", "bg", "panel", "rule", "chip"].map((c) => `${c}:"var(--${c})"`).join(",");
  const tw = `tailwind.config={darkMode:"class",theme:{extend:{colors:{${colors}},fontFamily:{head:"var(--head)",body:"var(--body)",mono:"var(--mono)"}}}}`;
  const close = "</scr" + "ipt>";
  return (
    `<!doctype html><html class="${look.mode}"><head><meta charset="utf-8">` +
    `<script src="https://cdn.tailwindcss.com">${close}<script>${tw}${close}` +
    `<link rel="stylesheet" crossorigin="anonymous" href="${FONT_CSS}">` +
    `<link rel="stylesheet" crossorigin="anonymous" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css">` +
    `<style>:root{${vars}}html{font-size:calc(100vw / 80)}html,body{margin:0;height:100%;overflow:hidden;background:var(--bg);color:var(--fg);font-family:var(--body)}#slide{width:100vw;height:100vh;position:relative;overflow:hidden}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>` +
    `</head><body><div id="slide">${fill(html, data)}</div><script>${CAPTURE}${close}</body></html>`
  );
}

/** Studio validation for user-authored layout HTML/config. */
export function validateLayout(html: string, configJson: string) {
  const errors: { msg: string; tip: boolean }[] = [];
  let config: { id?: string; name?: string; category?: string; author?: string } | null = null;
  try {
    config = JSON.parse(configJson);
  } catch (e) {
    errors.push({ msg: "Config is not valid JSON: " + (e as Error).message, tip: false });
  }
  if (config && !/^[a-z0-9-]+$/.test(config.id || "")) errors.push({ msg: "config.id must be lowercase letters, numbers and dashes", tip: false });
  if (/<script|on\w+=|fetch\(/i.test(html)) errors.push({ msg: "Scripts, inline handlers and fetch() are not allowed", tip: false });
  if (!/\{\{\s*title\s*\}\}/.test(html)) errors.push({ msg: "Tip: include {{title}} so the slide has a heading", tip: true });
  return { config, errors, ok: !errors.some((e) => !e.tip) };
}
