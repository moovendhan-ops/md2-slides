import { markdownExporter } from "./basic-exporters";
import { pdfExporter } from "./pdf-exporter";
import { htmlExporter } from "./html-exporter";
import type { Exporter } from "./types";

/** Export formats in dialog order. Adding a format means adding one entry here. */
export const EXPORTERS: Exporter[] = [htmlExporter, pdfExporter, markdownExporter];
