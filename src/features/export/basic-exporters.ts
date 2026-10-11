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
