"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useDeck } from "@/app-shell/deck-context";
import { ToggleRow } from "@/components/common/controls";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUi } from "@/stores/ui";
import { EXPORTERS } from "./registry";
import { saveBlob } from "./save-blob";
import type { ExportOptions } from "./types";

const TOGGLES: [keyof Omit<ExportOptions, "password">, string, string][] = [
  ["notes", "Include speaker notes", "Shown in the speaker view and under each slide"],
  ["download", "Allow .md download", "Viewers can download the Markdown source"],
  ["present", "Open in present mode", "Starts full-screen on slide 1"],
];

/** Pick a format and options, then generate the file in the browser. */
export function ExportDialog() {
  const open = useUi((s) => s.modal === "export");
  const close = useUi((s) => s.closeModal);
  const deck = useDeck();
  const [id, setId] = useState(EXPORTERS[0].id);
  const [options, setOptions] = useState<ExportOptions>({ notes: true, download: true, present: false, password: "" });
  const [busy, setBusy] = useState(false);
  const exporter = EXPORTERS.find((e) => e.id === id) ?? EXPORTERS[0];
  const name = (deck.path.split("/").pop() ?? "deck").replace(/\.md$/, "") || "deck";

  const run = async () => {
    setBusy(true);
    try {
      const file = await exporter.run({ deck, options, name });
      if (file) {
        saveBlob(file.blob, file.filename);
        toast(`Exported ${file.filename} · ${(file.blob.size / 1024).toFixed(0)} KB`);
        close();
      }
    } catch (e) {
      toast(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>Files are generated in your browser. Nothing is uploaded.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Format">
          {EXPORTERS.map((e) => (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={e.id === id}
              onClick={() => setId(e.id)}
              className={cn("flex flex-col gap-1.5 rounded-lg border p-3 text-left", e.id === id ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 hover:border-zinc-600")}
            >
              <Icon name={e.icon} className="text-xl text-zinc-200" />
              <span className="text-[13px] font-medium">{e.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-400">{exporter.description}</p>
        {exporter.uses.length > 0 && (
          <div className="flex flex-col gap-2">
            {TOGGLES.filter(([k]) => exporter.uses.includes(k)).map(([k, label, sub]) => (
              <ToggleRow key={k} label={label} sub={sub} checked={options[k]} onChange={(v) => setOptions({ ...options, [k]: v })} />
            ))}
            {exporter.uses.includes("password") && (
              <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
                Password <span className="text-zinc-600">(optional, the file asks for it and decrypts in the browser)</span>
                <Input type="password" autoComplete="new-password" value={options.password} onChange={(e) => setOptions({ ...options, password: e.target.value })} placeholder="No password" className="h-8 border-zinc-800 text-xs" />
              </label>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="border-zinc-800" onClick={close}>
            Cancel
          </Button>
          <Button className="gap-1.5 bg-zinc-50 font-semibold text-zinc-950 hover:bg-zinc-200" disabled={busy} onClick={run}>
            <Icon name={busy ? "circle-notch" : "download-simple"} className={busy ? "animate-spin" : ""} />
            {busy ? "Exporting…" : `Export ${exporter.label}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
