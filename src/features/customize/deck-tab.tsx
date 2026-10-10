"use client";

import { useDeck } from "@/app-shell/deck-context";
import { Section, ToggleRow } from "@/components/common/controls";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeckActions } from "@/hooks/use-deck-actions";
import { useFileActions } from "@/hooks/use-file-actions";
import { useWorkspace } from "@/stores/workspace";

/** Insert text at the textarea caret (variables). */
function insertAtCaret(text: string) {
  const ta = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Deck Markdown"]');
  if (!ta) return;
  const a = ta.selectionStart;
  useWorkspace.getState().setSource(ta.value.slice(0, a) + text + ta.value.slice(ta.selectionEnd));
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(a + text.length, a + text.length);
  });
}

export function DeckTab() {
  const { options: o, deck } = useDeck();
  const { setOption } = useDeckActions();
  const { saveAsTemplate, submitToCommunity } = useFileActions();
  return (
    <>
      <Section title="Footer">
        <Input defaultValue={o.footer} placeholder="Acme · Confidential" onChange={(e) => setOption("footer", e.target.value)} className="h-8 border-zinc-800 text-xs" />
      </Section>
      <Section title="Logo">
        <Input defaultValue={o.logo} placeholder="ACME" onChange={(e) => setOption("logo", e.target.value)} className="h-8 border-zinc-800 text-xs" />
      </Section>
      <div className="flex flex-col gap-2">
        <ToggleRow label="Click-to-reveal" sub="Blocks appear one per click when presenting" checked={o.clicks} onChange={(v) => setOption("clicks", v)} />
        <ToggleRow label="Slide numbers" sub="Bottom-right counter" checked={o.nums} onChange={(v) => setOption("nums", v)} />
        <ToggleRow label="Accent bar" sub="Thin accent line on top edge" checked={o.bar} onChange={(v) => setOption("bar", v)} />
      </div>
      <Section title="Variables" hint="click to insert">
        <div className="flex flex-col gap-1">
          {Object.entries(deck.meta).map(([k, v]) => (
            <button key={k} type="button" onClick={() => insertAtCaret(`\${${k}}`)} className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-zinc-900">
              <code className="font-mono text-orange-400">{`\${${k}}`}</code>
              <span className="max-w-[55%] truncate text-zinc-500">{v}</span>
            </button>
          ))}
        </div>
      </Section>
      <Button variant="outline" className="gap-1.5 border-zinc-800" onClick={() => saveAsTemplate()}>
        <Icon name="bookmark-simple" /> Save deck as template
      </Button>
      <Button variant="outline" className="gap-1.5 border-zinc-800" onClick={submitToCommunity}>
        <Icon name="git-pull-request" /> Submit to community
      </Button>
    </>
  );
}
