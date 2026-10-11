"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { buildPdf } from "@/features/export/pdf-exporter";
import { saveBlob } from "@/features/export/save-blob";
import type { TemplateRecord } from "@/engine/types";
import { buildFrontMatter, stripFrontMatter } from "@/domain/source/frontmatter";
import { useDeck } from "@/app-shell/deck-context";
import { useEditor } from "@/stores/editor";
import { useContribute } from "@/stores/contribute";
import { useUi } from "@/stores/ui";
import { selectChanged, splitKey, useWorkspace } from "@/stores/workspace";
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/app-shell/services";
import { ensureFile, useSaveTemplate } from "./use-queries";

const LOOK_KEYS = ["theme", "mode", "accent", "bg", "glass", "font", "radius", "density"];

/** File-level actions: open, create from template, save as template, export. */
export function useFileActions() {
  const active = useDeck();
  const saveTemplate = useSaveTemplate();
  const qc = useQueryClient();
  const { git } = useServices();
  return useMemo(() => {
    const ui = useUi.getState;
    /** Repo new decks go into: the open file's repo, else the repo being browsed. */
    const targetRepo = () => active.repo || ui().repoView || useWorkspace.getState().repos[0]?.id || "";
    const openFile = async (key: string) => {
      const { repo: repoId, path } = splitKey(key);
      const repo = useWorkspace.getState().repos.find((r) => r.id === repoId);
      if (repo && useWorkspace.getState().files[key] == null) {
        const t = toast.loading(`Opening ${path}…`);
        try {
          await ensureFile(qc, git, repo, path);
          toast.dismiss(t);
        } catch (e) {
          toast.error(`Could not open ${path}: ${(e as Error).message}`, { id: t });
          return;
        }
      }
      useWorkspace.getState().openFile(key);
      useEditor.getState().set({ curLine: 0, pick: null, jump: { line: 0, nonce: Date.now() } });
      ui().set({ view: "editor", pane: "editor", modal: null, sidebarOpen: ui().width > 760 ? ui().sidebarOpen : false });
    };

    const createFromTemplate = (t: Pick<TemplateRecord, "id" | "name" | "md" | "look">) => {
      const look = Object.fromEntries(Object.entries(t.look ?? {}).map(([k, v]) => [k === "palette" ? "theme" : k, v]));
      const content = `${buildFrontMatter({ title: t.name, ...look })}\n${t.md}\n`;
      const repo = targetRepo();
      if (!repo) return toast.error("Connect a repository first");
      const key = useWorkspace.getState().createFile(repo, `decks/${t.id}`, content);
      void openFile(key);
      toast(`Created ${key.split("::")[1]} from “${t.name}”`);
    };

    return {
      openFile,
      createFromTemplate,
      newDeck: () => createFromTemplate({ id: "untitled", name: "Untitled deck", look: {}, md: "^ Kicker\n# Untitled deck\nStart typing. Type / on an empty line to insert a block." }),
      saveAsTemplate: async () => {
        const m = active.deck.meta;
        const look: TemplateRecord["look"] = {};
        LOOK_KEYS.forEach((k) => m[k] != null && (look[k === "theme" ? "palette" : k] = k === "glass" ? m[k] === "true" : m[k]));
        const t: TemplateRecord = { id: `mine-${Date.now()}`, name: m.title || active.path.split("/").pop() || "My deck", cat: "Engineering", author: "You", md: stripFrontMatter(active.src), stars: 0, community: true, look };
        await saveTemplate.mutateAsync(t);
        ui().set({ view: "templates", modal: null });
        toast("Saved to your templates");
      },
      /** Open "Submit to community" for the open deck. */
      submitToCommunity: () => {
        if (!active.src.trim()) return toast.error("Open a deck first");
        useContribute.getState().open({ name: active.deck.meta.title || active.path.split("/").pop()?.replace(/\.md$/i, "") || "My deck", md: active.src });
      },
      download: () => {
        const blob = new Blob([active.src], { type: "text/markdown" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = active.path.split("/").pop() || "deck.md";
        a.click();
        URL.revokeObjectURL(a.href);
        ui().closeModal();
        toast(`Downloaded ${a.download}`);
      },
      exportPdf: () => {
        const name = (active.path.split("/").pop() ?? "deck").replace(/\.md$/, "") || "deck";
        toast.promise(buildPdf().then((blob) => saveBlob(blob, `${name}.pdf`)), {
          loading: "Building PDF…",
          success: `Downloaded ${name}.pdf`,
          error: (e: Error) => `PDF export failed: ${e.message}`,
        });
      },
      changedKeys: () => selectChanged(useWorkspace.getState()),
    };
  }, [active, saveTemplate, qc, git]);
}
