"use client";

import { useMemo } from "react";
import { BLOCK_SNIPPETS } from "@/data";
import { useDeck } from "@/app-shell/deck-context";
import { Icon } from "@/components/common/icon";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { useDeckActions } from "@/hooks/use-deck-actions";
import { useFileActions } from "@/hooks/use-file-actions";
import { useSelectedRepos } from "@/hooks/use-selected-repos";
import { useAi } from "@/stores/ai";
import { useEditor } from "@/stores/editor";
import { useUi } from "@/stores/ui";
import { splitKey, useWorkspace } from "@/stores/workspace";

interface Cmd {
  label: string;
  icon: string;
  run: () => void;
  hint?: string;
}

/** ⌘K: open any Markdown file or run any command. */
import { useSync } from "@/hooks/use-sync";

export function CommandPalette() {
  const open = useUi((s) => s.modal === "palette");
  const { closeModal, openModal, setView, set } = useUi();
  const selectedIds = useSelectedRepos().ids.join("|");
  const fileKeys = useWorkspace((s) => {
    const known = new Set(Object.keys(s.files).filter((k) => k.endsWith(".md")));
    Object.entries(s.paths).forEach(([repo, ps]) => ps.forEach((p) => p.endsWith(".md") && known.add(`${repo}::${p}`)));
    return [...known].filter((k) => selectedIds.split("|").includes(k.split("::")[0])).join("\n");
  });
  const { options } = useDeck();
  const deck = useDeckActions();
  const file = useFileActions();
  const { sync } = useSync();

  const commands = useMemo<Cmd[]>(() => {
    const inEditor = (fn: () => void) => () => {
      setView("editor");
      fn();
    };
    return [
      { label: "Sync latest from GitHub", icon: "arrows-clockwise", run: () => { sync(); closeModal(); } },
      { label: "Generate slides with AI", icon: "sparkle", run: () => { useAi.getState().set({ phase: "idle" }); openModal("ai"); } },
      { label: "New slide", icon: "plus", run: inEditor(() => openModal("newSlide")) },
      ...BLOCK_SNIPPETS.map((s) => ({ label: `Insert ${s.label.toLowerCase()}`, icon: "plus-square", run: inEditor(() => deck.insertAtCursor(s.md)) })),
      { label: "Toggle glassmorphism", icon: "drop-half", run: () => { deck.setOption("glass", !options.glass); closeModal(); } },
      { label: "Toggle slide light / dark", icon: "circle-half", run: () => { deck.setOption("mode", options.mode === "light" ? "dark" : "light"); closeModal(); } },
      { label: "Present", icon: "play", run: () => deck.present(), hint: "⌘↵" },
      { label: "Share view-only link", icon: "share-network", run: inEditor(() => openModal("share")) },
      { label: "Commit & push", icon: "git-commit", run: () => openModal("commit"), hint: "⌘S" },
      { label: "Format document", icon: "magic-wand", run: () => { deck.format(); closeModal(); } },
      { label: "Export… (HTML presentation, PDF, PowerPoint, Markdown)", icon: "export", run: inEditor(() => openModal("export")) },
      { label: "Download .md", icon: "download-simple", run: file.download },
      { label: "Export PDF", icon: "file-pdf", run: file.exportPdf },
      { label: "Slide overview", icon: "grid-nine", run: () => deck.present(undefined, true) },
      { label: "Open template studio (HTML + Tailwind)", icon: "code-block", run: () => { closeModal(); setView("studio"); } },
      { label: "Browse templates", icon: "squares-four", run: () => { closeModal(); setView("templates"); } },
      { label: "Save deck as template", icon: "bookmark-simple", run: () => file.saveAsTemplate() },
      { label: "Submit deck to community", icon: "git-pull-request", run: () => file.submitToCommunity() },
      { label: "Show problems", icon: "warning", run: inEditor(() => { useEditor.getState().set({ problemsOpen: true }); closeModal(); }) },
      { label: "Syntax reference", icon: "book-open", run: inEditor(() => { useEditor.getState().set({ syntaxOpen: true }); closeModal(); }) },
      { label: "Customize theme", icon: "sliders-horizontal", run: inEditor(() => { set({ customOpen: true }); closeModal(); }) },
    ];
  }, [deck, file, options, openModal, closeModal, setView, set, sync]);

  return (
    <CommandDialog open={open} onOpenChange={(o) => (o ? openModal("palette") : closeModal())} className="border-zinc-800 bg-zinc-950 sm:max-w-xl">
      <Command className="bg-transparent">
      <CommandInput placeholder="Open a file or run a command…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Files">
          {fileKeys.split("\n").filter(Boolean).map((k) => {
            const { repo, path } = splitKey(k);
            return (
              <CommandItem key={k} value={`${path} ${repo}`} onSelect={() => void file.openFile(k)}>
                <Icon name="file-md" className="text-blue-400" />
                {path}
                <CommandShortcut className="tracking-normal">{repo.split("/")[1]}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Commands">
          {commands.map((c) => (
            <CommandItem key={c.label} value={c.label} onSelect={c.run}>
              <Icon name={c.icon} />
              {c.label}
              {c.hint && <CommandShortcut>{c.hint}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
