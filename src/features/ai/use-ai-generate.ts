"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { AiPreset } from "@/data";
import { stripFrontMatter } from "@/domain/source/frontmatter";
import { useServices } from "@/app-shell/services";
import { useEngine } from "@/engine/provider";
import { useDeckActions } from "@/hooks/use-deck-actions";
import { useFileActions } from "@/hooks/use-file-actions";
import { useAi } from "@/stores/ai";
import { useUi } from "@/stores/ui";
import { useWorkspace } from "@/stores/workspace";
import { useDeck } from "@/app-shell/deck-context";
import { getSlideContext, getDeckOutline } from "@/services/local-ai/prompts/context";
import { ENABLE_LOCAL_AI } from "@/services/local-ai";

export const AI_STEPS = [
  "Preparing context & syntax",
  "Generating with language model",
  "Streaming tokens",
  "Validating with WASM engine",
  "Ready to apply",
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GenerateRun {
  /** Change to make to the current draft instead of writing a new one. */
  revise?: string;
}

/** Drives the AI dialog: request → streaming reveal → Wasm validation → apply. */
export function useAiGenerate() {
  const { ai } = useServices();
  const engine = useEngine();
  const deckActions = useDeckActions();
  const files = useFileActions();
  const activeDeck = useDeck();
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (preset?: AiPreset, opts: GenerateRun = {}) => {
      const st = useAi.getState();
      const revise = opts.revise?.trim() ?? "";
      const revising = !!revise && !!st.markdown;
      const prompt = revising ? revise : preset ? preset.prompt : st.prompt.trim();
      const isImproveTask = st.task === "improve" || st.task === "notes" || st.task === "summarize";
      // Where a failed or cancelled run returns to.
      const back = revising ? "done" : "idle";

      if (!prompt && !isImproveTask) {
        return st.set({ error: "Describe what you want to create first, or pick a preset." });
      }

      const run = st.runId + 1;
      const alive = () => useAi.getState().runId === run;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      st.set({
        runId: run,
        phase: "busy",
        step: 0,
        error: "",
        revising,
        ...(revising ? {} : { prompt: prompt || (isImproveTask ? `Current Slide (${st.task})` : ""), history: [] }),
        typed: "",
      });

      await wait(150);
      if (!alive()) return;

      // Extract slide/deck context if relevant
      let currentSlideContent = "";
      let deckOutlineContext = "";
      if (activeDeck.deck.slides.length > 0) {
        const slide = activeDeck.deck.slides[activeDeck.current];
        if (slide) {
          currentSlideContent = getSlideContext(slide);
        }
        deckOutlineContext = getDeckOutline(activeDeck.deck);
      }

      useAi.getState().set({ step: 1 });

      let draft;
      try {
        draft = await ai.generate(prompt || "Process slide", {
          slides: st.count,
          provider: ENABLE_LOCAL_AI ? st.provider : "remote",
          modelId: st.localModelId,
          task: st.task,
          slideContent: currentSlideContent,
          context: deckOutlineContext,
          instruction: st.improveMode === "custom" ? st.customInstruction : st.improveMode,
          current: revising ? st.markdown : undefined,
          signal: controller.signal,
          onToken: (fullText) => {
            if (alive()) {
              useAi.getState().set({ typed: fullText, step: 2 });
            }
          },
        });
      } catch (e) {
        if (!alive() || controller.signal.aborted) return;
        return useAi.getState().set({ phase: back, revising: false, error: (e as Error).message });
      }

      if (!alive() || controller.signal.aborted) return;

      const md = draft.markdown.trim() + "\n";
      useAi.getState().set({ step: 3, typed: md });

      // Run WASM engine validation
      const parsed = engine.parse(md);
      const errs = parsed.problems.filter((p) => p.sev === "error").length;

      useAi.getState().set({ step: 4 });
      await wait(200);
      if (!alive()) return;

      const speedInfo = draft.stats?.tokensPerSecond ? ` · ${draft.stats.tokensPerSecond} tok/s` : "";
      const slideCount = parsed.slides.length || (st.task === "deck" ? 0 : 1);
      const summary = `${slideCount} slide${slideCount === 1 ? "" : "s"} · ${
        errs ? `${errs} syntax error(s)` : "valid syntax"
      } · ${draft.provider}${draft.model ? ` (${draft.model})` : ""}${speedInfo}`;

      const cur = useAi.getState();
      useAi.getState().set({
        phase: "done",
        revising: false,
        refine: revising ? "" : cur.refine,
        history: revising ? [...cur.history, st.markdown].slice(-10) : [],
        markdown: md,
        summary,
        seed: useAi.getState().seed + 1,
        tokensPerSecond: draft.stats?.tokensPerSecond,
        totalTokens: draft.stats?.totalTokens,
      });
    },
    [ai, engine, activeDeck],
  );

  const apply = useCallback(() => {
    const { markdown, target, task } = useAi.getState();
    const close = () => useUi.getState().closeModal();

    if (task === "notes") {
      // Append speaker notes to current slide
      const cleanedNotes = markdown.replace(/^(\?\?\?\n?|#.*?\n)/gm, "").trim();
      deckActions.setDirective("notes", cleanedNotes);
      close();
      return toast("Added AI speaker notes to current slide");
    }

    if (task === "slide") {
      deckActions.insertSlide(stripFrontMatter(markdown));
      close();
      return toast("Inserted new AI slide");
    }

    if (target === "insert") {
      deckActions.appendSlides(stripFrontMatter(markdown));
      close();
      return toast("Added AI slides to the end of this deck");
    }

    if (target === "replace") {
      useWorkspace.getState().setSource(markdown);
      close();
      return toast("Replaced deck with AI draft — the commit dialog shows the diff");
    }

    const meta = engine.parse(markdown).meta;
    const id =
      (meta.title || "ai-deck")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "ai-deck";
    const look: Record<string, string> = { ...meta };
    delete look.title;
    files.createFromTemplate({
      id,
      name: meta.title || "AI deck",
      look,
      md: stripFrontMatter(markdown).trim(),
    });
    close();
  }, [deckActions, files, engine]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const st = useAi.getState();
    st.set({ runId: st.runId + 1, phase: st.revising ? "done" : "idle", revising: false });
  }, []);

  /** Go back to the draft before the last change. */
  const undo = useCallback(() => {
    const st = useAi.getState();
    const prev = st.history.at(-1);
    if (prev === undefined) return;
    st.set({ markdown: prev, history: st.history.slice(0, -1), seed: st.seed + 1, summary: "Restored the previous version", error: "" });
  }, []);

  return { generate, apply, cancel, undo };
}
