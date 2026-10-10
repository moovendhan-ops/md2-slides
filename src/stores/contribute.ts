import { create } from "zustand";
import type { CommunitySubmission } from "@/domain/community/submission";

/** What the contribute dialog starts from; the user fills in or edits the rest. */
export type ContributeDraft = Omit<CommunitySubmission, "id" | "description" | "category"> & Partial<Pick<CommunitySubmission, "id" | "description" | "category">>;

interface ContributeState {
  draft: ContributeDraft | null;
  open: (draft: ContributeDraft) => void;
  close: () => void;
}

/** The "Submit to community" dialog: open with a deck or a studio layout. */
export const useContribute = create<ContributeState>((set) => ({
  draft: null,
  open: (draft) => set({ draft }),
  close: () => set({ draft: null }),
}));
