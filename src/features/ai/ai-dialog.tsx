"use client";

import { useMemo } from "react";
import { AI_PRESETS } from "@/data";
import { buildLook, deckOptions, thumbLook } from "@/domain/deck/look";
import { Seg } from "@/components/common/controls";
import { Icon } from "@/components/common/icon";
import { SlideView } from "@/components/slide/slide-view";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEngine } from "@/engine/provider";
import { useAi, type AiTarget } from "@/stores/ai";
import { useUi } from "@/stores/ui";
import { ENABLE_LOCAL_AI } from "@/services/local-ai";
import { useAiGenerate } from "./use-ai-generate";
import { LiveDeck } from "./live-deck";
import { AiStatus } from "./ai-status";
import { AIProviderSelector } from "./AIProviderSelector";
import { ModelDownload } from "./ModelDownload";
import { LocalAIGeneration } from "./LocalAIGeneration";

const CHANGES = [
  "Make it shorter",
  "More visual — icons, cards and stats",
  "Add a code example slide",
  "Add a closing summary slide",
  "Punchier titles",
  "More formal tone",
];

/** Ask the model to change the draft it just wrote; each change is a new version that can be undone. */
function RefineBar({ onRefine, onUndo }: { onRefine: (change: string) => void; onUndo: () => void }) {
  const { refine, history, set } = useAi();
  const send = (change: string) => change.trim() && onRefine(change.trim());
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(refine);
        }}
      >
        <Input
          value={refine}
          onChange={(e) => set({ refine: e.target.value, error: "" })}
          placeholder="Ask for changes — e.g. “add a pricing slide”, “use a light theme”, “split slide 3”"
          className="h-9 border-zinc-800 text-[13px]"
        />
        <Button type="submit" disabled={!refine.trim()} className="h-9 gap-1.5 bg-violet-600 text-white hover:bg-violet-500">
          <Icon name="magic-wand" /> Update
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-1.5">
        {CHANGES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => send(c)}
            className="rounded-full border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-violet-500/60 hover:text-zinc-100"
          >
            {c}
          </button>
        ))}
        {history.length > 0 && (
          <button type="button" onClick={onUndo} className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100">
            <Icon name="arrow-counter-clockwise" /> Undo (back to v{history.length})
          </button>
        )}
      </div>
    </div>
  );
}

function Result() {
  const engine = useEngine();
  const { markdown, summary, seed, history } = useAi();
  const { deck, look } = useMemo(() => {
    const d = engine.parse(markdown);
    return { deck: d, look: thumbLook(buildLook(deckOptions(d.meta))) };
  }, [engine, markdown]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <p className="text-xs font-medium text-emerald-400">
        {history.length > 0 && <span className="mr-1.5 rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-300">v{history.length + 1}</span>}
        {summary}
      </p>
      <div className="grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
        {deck.slides.map((s, i) => (
          <div key={`${seed}-${i}`} style={{ animation: `tr-zoom .5s cubic-bezier(.2,.7,.2,1) ${i * 90}ms both` }}>
            <SlideView slide={s} index={i} total={deck.slides.length} look={look} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generate or edit slides using Local SLM (browser WebGPU) or Remote AI. */
export function AiDialog() {
  const open = useUi((s) => s.modal === "ai");
  const close = useUi((s) => s.closeModal);
  const st = useAi();
  const { generate, apply, cancel, undo } = useAiGenerate();

  const applyLabel = {
    new: "Create new deck",
    insert: "Append to deck",
    replace: "Replace deck",
  }[st.target];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        cancel();
        close();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="sparkle" className="text-violet-400" /> AI Slide Assistant
          </DialogTitle>
          <DialogDescription>
            {ENABLE_LOCAL_AI
              ? "Generate and refine slides with local browser SLMs or remote cloud endpoints."
              : "Generate and refine slides with AI."}
          </DialogDescription>
        </DialogHeader>

        {st.phase === "idle" && (
          <div className="flex flex-col gap-4">
            {ENABLE_LOCAL_AI && <AIProviderSelector />}

            {ENABLE_LOCAL_AI && st.provider === "local" ? (
              <>
                <ModelDownload />
                <LocalAIGeneration />
              </>
            ) : (
              <AiStatus enabled={open} />
            )}


            {st.task !== "notes" && st.task !== "summarize" && (
              <Textarea
                value={st.prompt}
                onChange={(e) => st.set({ prompt: e.target.value, error: "" })}
                placeholder={
                  st.task === "slide"
                    ? "e.g. A slide explaining zero-copy buffers in Rust"
                    : st.task === "improve"
                    ? "e.g. Focus on memory safety and concurrency benefits"
                    : "e.g. A 10-minute talk on our migration from REST to gRPC, for engineers"
                }
                className="min-h-24 border-zinc-800 text-[13px]"
              />
            )}

            {st.task === "deck" && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-2">
                  Slides{" "}
                  <Seg
                    size="sm"
                    value={st.count}
                    onChange={(count) => st.set({ count })}
                    options={[3, 4, 6, 8, 12].map((id) => ({ id, label: String(id) }))}
                  />
                </span>
                <span className="flex items-center gap-2">
                  Output
                  <Seg<AiTarget>
                    size="sm"
                    value={st.target}
                    onChange={(target) => st.set({ target })}
                    options={[
                      { id: "new", label: "New file" },
                      { id: "insert", label: "Append" },
                      { id: "replace", label: "Replace" },
                    ]}
                  />
                </span>
              </div>
            )}

            {st.task === "deck" && (
              <div className="flex flex-wrap gap-2">
                {AI_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => generate(p)}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 transition-colors"
                  >
                    <Icon name={p.icon} /> {p.label}
                  </button>
                ))}
              </div>
            )}

            {st.error && <p className="text-xs text-amber-400">{st.error}</p>}

            <Button
              className="gap-1.5 self-end bg-violet-600 font-semibold text-white hover:bg-violet-500 shadow-md"
              onClick={() => generate()}
            >
              <Icon name="sparkle" />{" "}
              {st.task === "deck"
                ? "Generate Deck"
                : st.task === "slide"
                ? "Generate Slide"
                : st.task === "improve"
                ? "Improve Slide"
                : st.task === "notes"
                ? "Generate Speaker Notes"
                : "Summarize Slide"}
            </Button>
          </div>
        )}

        {st.phase === "busy" && (
          <>
            <LiveDeck />
            <Button variant="outline" className="self-end border-zinc-800 text-xs" onClick={cancel}>
              {st.revising ? "Cancel change" : "Cancel Generation"}
            </Button>
          </>
        )}

        {st.phase === "done" && (
          <>
            {st.error && <p className="text-xs text-amber-400">{st.error}</p>}
            <Result />
            {!(ENABLE_LOCAL_AI && st.provider === "local") && <RefineBar onRefine={(revise) => generate(undefined, { revise })} onUndo={undo} />}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-zinc-800" onClick={() => st.set({ phase: "idle" })}>
                Back
              </Button>
              <Button
                className="bg-zinc-50 font-semibold text-zinc-950 hover:bg-zinc-200"
                onClick={apply}
              >
                {st.task === "notes"
                  ? "Attach Speaker Notes"
                  : st.task === "slide"
                  ? "Insert Slide"
                  : applyLabel}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
