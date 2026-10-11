import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_LOCAL_MODEL_ID, ENABLE_LOCAL_AI } from "@/services/local-ai";
import type { LocalAIStatus } from "@/services/local-ai/types";
import type { AiTaskType } from "@/services/ai/types";

export type AiPhase = "idle" | "busy" | "done";
export type AiTarget = "new" | "insert" | "replace";
export type AIProviderType = "local" | "remote";
export type ImproveMode = "concise" | "impactful" | "professional" | "visual" | "custom";

export interface AiState {
  phase: AiPhase;
  step: number;
  prompt: string;
  count: number;
  target: AiTarget;
  provider: AIProviderType;
  localModelId: string;
  task: AiTaskType;
  improveMode: ImproveMode;
  customInstruction: string;
  typed: string;
  markdown: string;
  /** The change being asked for on the current draft ("Ask for changes" box). */
  refine: string;
  /** True while a change to an existing draft is being written. */
  revising: boolean;
  /** Earlier drafts, newest last, for undoing a change. */
  history: string[];
  summary: string;
  error: string;
  runId: number;
  seed: number;
  localStatus: LocalAIStatus;
  tokensPerSecond?: number;
  totalTokens?: number;
  set: (patch: Partial<Omit<AiState, "set">>) => void;
}

export const useAi = create<AiState>()(
  persist(
    (set) => ({
      phase: "idle",
      step: 0,
      prompt: "",
      count: 6,
      target: "new",
      provider: ENABLE_LOCAL_AI ? "local" : "remote",
      localModelId: DEFAULT_LOCAL_MODEL_ID,
      task: "deck",
      improveMode: "concise",
      customInstruction: "",
      typed: "",
      markdown: "",
      refine: "",
      revising: false,
      history: [],
      summary: "",
      error: "",
      runId: 0,
      seed: 0,
      localStatus: {
        state: "uninitialized",
      },
      tokensPerSecond: undefined,
      totalTokens: undefined,
      set: (patch) => set(patch),
    }),
    {
      name: "md2slides-ai-settings",
      partialize: (state) => ({
        provider: ENABLE_LOCAL_AI ? state.provider : "remote",
        localModelId: state.localModelId,
        count: state.count,
        target: state.target,
        task: state.task,
        improveMode: state.improveMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && (!ENABLE_LOCAL_AI || state.provider === "local")) {
          if (!ENABLE_LOCAL_AI) {
            state.provider = "remote";
          }
        }
      },
    },
  ),
);

