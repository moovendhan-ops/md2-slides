"use client";

import { useEffect } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BootScreen } from "@/components/shell/boot-screen";
import { AiDialog } from "@/features/ai/ai-dialog";
import { CommandPalette } from "@/features/palette/command-palette";
import { CommitDialog } from "@/features/commit/commit-dialog";
import { ContributeDialog } from "@/features/community/contribute-dialog";
import { EditorView } from "@/features/editor/editor-view";
import { NewSlideDialog } from "@/features/editor/new-slide-dialog";
import { PrintRoot } from "@/features/present/print-root";
import { Presenter } from "@/features/present/presenter";
import { ProfileView } from "@/features/profile/profile-view";
import { RepoView } from "@/features/repo/repo-view";
import { RepoPickerDialog } from "@/features/repos/repo-picker-dialog";
import { ShareDialog } from "@/features/share/share-dialog";
import { ExportDialog } from "@/features/export/export-dialog";
import { useSelectedRepos } from "@/hooks/use-selected-repos";
import { StudioView } from "@/features/studio/studio-view";
import { TemplatesView } from "@/features/templates/templates-view";
import { useGlobalKeys } from "@/hooks/use-global-keys";
import { useReposQuery } from "@/hooks/use-queries";
import { usePresent } from "@/stores/present";
import { useUi, type View } from "@/stores/ui";
import { DeckProvider } from "./deck-context";

/** View registry: adding a screen means adding one entry here. */
const VIEWS: Record<View, () => React.ReactNode> = {
  editor: () => <EditorView />,
  studio: () => <StudioView />,
  templates: () => <TemplatesView />,
  repo: () => <RepoView />,
  profile: () => <ProfileView />,
};

function Shell() {
  useGlobalKeys();
  const view = useUi((s) => s.view);
  const presenting = usePresent((s) => s.active);
  const printing = useUi((s) => s.printing);
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950">
      <AppHeader />
      <div className="relative flex min-h-0 flex-1">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">{VIEWS[view]()}</main>
      </div>
      <CommandPalette />
      <CommitDialog />
      <ContributeDialog />
      <AiDialog />
      <NewSlideDialog />
      <RepoPickerDialog />
      <ShareDialog />
      <ExportDialog />
      {presenting && <Presenter />}
      {printing && <PrintRoot />}
    </div>
  );
}

export function Workspace() {
  const repos = useReposQuery(true);
  const selected = useSelectedRepos();
  useEffect(() => {
    if (!repos.data) return;
    const ui = useUi.getState();
    // First visit: ask which repositories to use instead of loading everything.
    if (!selected.hasChosen && repos.data.length) ui.openModal("repos");
    else if (!ui.repoView || !selected.ids.includes(ui.repoView)) ui.set({ repoView: selected.ids[0] ?? null });
  }, [repos.data, selected.hasChosen, selected.ids]);
  if (repos.isPending) return <BootScreen label="Loading your GitHub repositories…" />;
  if (repos.isError) return <BootScreen label={`Could not load repositories: ${repos.error.message}`} />;
  return (
    <DeckProvider>
      <Shell />
    </DeckProvider>
  );
}
