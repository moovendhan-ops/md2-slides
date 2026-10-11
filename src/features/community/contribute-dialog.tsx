"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { COMMUNITY_TEMPLATES, CONTRIBUTORS, SEED_TEMPLATES } from "@/data";
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
  const existingContributor = me
    ? CONTRIBUTORS.find((c) => c.github.toLowerCase() === me.login.toLowerCase())
    : null;

  const [form, setForm] = useState({
    name: "",
    id: "",
    description: "",
    category: "",
    color: "#3b82f6",
    bio: "",
    authorName: "",
    role: "Template author",
  });
  const [idEdited, setIdEdited] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<ContributeResult | null>(null);

  const SWATCHES = [
    { label: "Blue", hex: "#3b82f6" },
    { label: "Purple", hex: "#8b5cf6" },
    { label: "Pink", hex: "#ec4899" },
    { label: "Emerald", hex: "#10b981" },
    { label: "Orange", hex: "#f97316" },
    { label: "Cyan", hex: "#06b6d4" },
  ];

  useEffect(() => {
    if (!draft) return;
    const existing = me
      ? CONTRIBUTORS.find((c) => c.github.toLowerCase() === me.login.toLowerCase())
      : null;
    setForm({
      name: draft.name,
      id: draft.id || slugify(draft.name),
      description: draft.description ?? "",
      category: draft.category ?? "",
      color: draft.color || existing?.color || "#3b82f6",
      bio: draft.bio || existing?.bio || "",
      authorName: existing?.name || me?.name || me?.login || "",
      role: existing?.role || "Template author",
    });
    setIdEdited(!!draft.id);
    setDone(null);
  }, [draft, me]);

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
          <div className="flex items-center justify-between">
            <DialogTitle>Submit to community</DialogTitle>
            <a
              href="/contributors#guide"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              Contributing guide <Icon name="arrow-up-right" className="text-[10px]" />
            </a>
          </div>
          <DialogDescription>
            Opens a pull request adding this {kind}. First time contributing? md2slides automatically adds you to the <a href="/contributors" target="_blank" className="text-zinc-200 underline">contributors wall</a>!
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Icon name="git-pull-request" className="text-3xl text-emerald-400" />
            <p className="text-sm text-zinc-200">
              Pull request #{done.pullRequest} is open{done.forked ? " from your fork" : ""}.
            </p>
            <p className="text-xs text-zinc-500">CI checks the deck. Once merged, you and your template will be featured on the contributors page!</p>
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

            {/* Contributor Profile Section: Show if already available, ask details if first-time */}
            {existingContributor ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={me.avatar} alt="" className="size-9 rounded-full border border-emerald-600/40 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-100">{existingContributor.name || me.login}</span>
                    <span className="font-mono text-[11px] text-zinc-400">@{me.login}</span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                      ✓ In CONTRIBUTORS.json
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">{existingContributor.bio || existingContributor.role || "Registered contributor"}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0" title="Signature color">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: existingContributor.color || form.color }} />
                  <span className="font-mono text-[10px] text-zinc-400">{existingContributor.color || form.color}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-blue-900/40 bg-blue-950/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-blue-300 border border-blue-500/30">
                      🌟 First-time Contributor
                    </span>
                    <span className="text-xs font-mono text-zinc-300">@{me.login}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Will be added to CONTRIBUTORS.json</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Welcome to md2slides! As a first-time contributor, please enter your details so you can be featured on the contributors wall.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Your Full Name">
                    <Input
                      value={form.authorName}
                      onChange={set("authorName")}
                      maxLength={60}
                      placeholder="Jane Doe"
                      className="h-8 border-zinc-800 text-xs"
                    />
                  </Field>
                  <Field label="Role / Title">
                    <Input
                      value={form.role}
                      onChange={set("role")}
                      maxLength={40}
                      placeholder="Designer / Engineer"
                      className="h-8 border-zinc-800 text-xs"
                    />
                  </Field>
                </div>
                <Field label="Bio / Tagline" hint="Optional">
                  <Input
                    value={form.bio}
                    onChange={set("bio")}
                    maxLength={100}
                    placeholder="Developer, slide enthusiast, open-source contributor"
                    className="h-8 border-zinc-800 text-xs"
                  />
                </Field>
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-xs font-medium text-zinc-300">Signature Contributor Color</span>
                  <div className="flex items-center gap-2">
                    {SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.label}
                        onClick={() => setForm((f) => ({ ...f, color: sw.hex }))}
                        style={{ backgroundColor: sw.hex }}
                        className={`size-5 rounded-full transition-transform ${
                          form.color === sw.hex ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "opacity-80 hover:scale-110"
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-mono text-xs text-zinc-500">{form.color}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={me.avatar} alt="" className="size-4 rounded-full" /> Credited to @{me.login}
              </p>
              <span className="text-[11px] text-zinc-500">Auto-credited in CONTRIBUTORS.json</span>
            </div>
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
