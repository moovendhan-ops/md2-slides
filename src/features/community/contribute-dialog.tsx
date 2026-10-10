"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { COMMUNITY_TEMPLATES, SEED_TEMPLATES } from "@/data";
import { slugify, validateSubmission, type CommunitySubmission } from "@/domain/community/submission";
import { useServices } from "@/app-shell/services";
import { useMeQuery } from "@/hooks/use-queries";
import { BRAND } from "@/lib/brand";
import type { ContributeResult } from "@/services/git/types";
import { useContribute } from "@/stores/contribute";

const CATEGORIES = [...new Set([...SEED_TEMPLATES, ...COMMUNITY_TEMPLATES].map((t) => t.cat))].sort();

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-xs font-medium text-zinc-300">
        {label}
        {hint && <span className="font-normal text-zinc-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * Submit the open deck (or a Template studio layout) as a community template:
 * the server forks the repo when needed, commits community/templates/<id>/ and
 * opens a pull request credited to the signed-in GitHub user.
 */
export function ContributeDialog() {
  const draft = useContribute((s) => s.draft);
  const close = useContribute((s) => s.close);
  const { auth, git } = useServices();
  const me = useMeQuery().data?.user;
  const [form, setForm] = useState({ name: "", id: "", description: "", category: "" });
  const [idEdited, setIdEdited] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<ContributeResult | null>(null);

  useEffect(() => {
    if (!draft) return;
    setForm({ name: draft.name, id: draft.id || slugify(draft.name), description: draft.description ?? "", category: draft.category ?? "" });
    setIdEdited(!!draft.id);
    setDone(null);
  }, [draft]);

  if (!draft) return null;
  const submission: CommunitySubmission = { ...draft, ...form };
  const errors = validateSubmission(submission);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v, ...(k === "name" && !idEdited ? { id: slugify(v) } : {}) }));
    if (k === "id") setIdEdited(true);
  };

  const submit = async () => {
    setPending(true);
    try {
      setDone(await git.submitCommunity(submission));
    } catch (e) {
      toast.error(`Could not open the pull request: ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  const kind = draft.layout ? "layout" : "template";
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit to community</DialogTitle>
          <DialogDescription>
            Opens a pull request on {new URL(BRAND.repo).pathname.slice(1)} adding this {kind}. Once it’s merged, everyone sees it under Templates → Community, credited to you.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Icon name="git-pull-request" className="text-3xl text-emerald-400" />
            <p className="text-sm text-zinc-200">
              Pull request #{done.pullRequest} is open{done.forked ? " from your fork" : ""}.
            </p>
            <p className="text-xs text-zinc-500">CI checks the deck. A maintainer reviews and merges it.</p>
            <Button asChild size="sm" className="gap-1.5">
              <a href={done.url} target="_blank" rel="noreferrer">
                <Icon name="arrow-square-out" /> View pull request
              </a>
            </Button>
          </div>
        ) : !me ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-zinc-300">Sign in with GitHub so the pull request is opened from, and credited to, your account.</p>
            <Button size="sm" className="gap-1.5" onClick={() => auth.signIn()}>
              <Icon name="github-logo" /> Sign in with GitHub
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Name">
              <Input value={form.name} onChange={set("name")} maxLength={60} placeholder="Quarterly review" className="h-8 border-zinc-800 text-sm" />
            </Field>
            <Field label="Id" hint={draft.layout ? `<!-- layout: custom:${form.id || "id"} -->` : `community/templates/${form.id || "id"}/`}>
              <Input value={form.id} onChange={set("id")} maxLength={41} className="h-8 border-zinc-800 font-mono text-xs" />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={set("category")} maxLength={30} list="community-categories" placeholder="Engineering" className="h-8 border-zinc-800 text-sm" />
              <datalist id="community-categories">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Description" hint={`${form.description.length}/200`}>
              <textarea
                value={form.description}
                onChange={set("description")}
                maxLength={200}
                rows={2}
                placeholder="One line about when to use it."
                className="rounded-md border border-zinc-800 bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-600 focus-visible:border-zinc-600"
              />
            </Field>
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={me.avatar} alt="" className="size-4 rounded-full" /> Credited to @{me.login}
            </p>
            {errors.length > 0 && form.name && <p className="text-xs text-amber-400">{errors[0]}</p>}
          </div>
        )}

        {!done && me && (
          <DialogFooter>
            <Button variant="outline" size="sm" className="border-zinc-800" onClick={close}>
              Cancel
            </Button>
            <Button size="sm" className="gap-1.5" disabled={pending || errors.length > 0} onClick={submit}>
              <Icon name={pending ? "spinner" : "git-pull-request"} className={pending ? "animate-spin" : undefined} />
              {pending ? "Opening pull request…" : "Open pull request"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
