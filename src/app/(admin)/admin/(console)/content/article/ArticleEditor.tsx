"use client";

/**
 * /admin/content/article/?id= (docs/admin-v2/04 Content): title, category, cover, text and its French
 * version of a journal article; Save, and Publish for a draft. The store's journal is built ahead of
 * time: it shows the change after the next build. Owner and Content.
 */
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AdminBox, AdminTitle, Artwork, Button, ButtonLink, Field, Input, Select, StatusChip, Textarea, useToast } from "@/components";
import { getArticleEditor, type ArticleEditorData } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { publishArticle, saveArticle, type ArticleFields } from "@/lib/client/admin/content";
import { asset } from "@/lib/asset";
import { AdminPage } from "../../../_admin/AdminPage";

const CATEGORIES = ["Method", "Stories", "Studio"] as const;

export function ArticleEditor() {
  const id = useSearchParams().get("id") ?? "";
  const q = useAdminQuery(() => getArticleEditor(id), [id]);
  return (
    <AdminPage title={q.data?.title ?? "Article"} breadcrumbs={[{ label: "Content", href: "/admin/content" }]} roles={["content"]} desktopHref={`/admin/content/article/?id=${id}`}>
      {q.status === "loading" ? (
        <div aria-busy="true" className="h-480 bg-surface-muted" />
      ) : !q.data ? (
        <p className="text-fg-muted">There is no article “{id}”.</p>
      ) : (
        <Editor key={q.data.id} a={q.data} />
      )}
    </AdminPage>
  );
}

function Editor({ a }: { a: ArticleEditorData }) {
  const toast = useToast();
  const [f, setF] = useState<ArticleFields>({ title: a.title, category: a.category, coverPath: a.coverPath, bodyMd: a.bodyMd, frTitle: a.frTitle, frBodyMd: a.frBodyMd });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ArticleFields>) => {
    setF((x) => ({ ...x, ...patch }));
    setError(null);
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.show(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12">
      <AdminBox className="lg:col-span-8">
        <Field label="Title">
          <Input value={f.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Text" hint="“## ” starts a section, a blank line a paragraph.">
          <Textarea value={f.bodyMd} onChange={(e) => set({ bodyMd: e.target.value })} className="min-h-320 resize-y" />
        </Field>
        <AdminTitle as="h2">French</AdminTitle>
        <Field label="Titre">
          <Input value={f.frTitle} onChange={(e) => set({ frTitle: e.target.value })} lang="fr" />
        </Field>
        <Field label="Texte">
          <Textarea value={f.frBodyMd} onChange={(e) => set({ frBodyMd: e.target.value })} className="min-h-200 resize-y" lang="fr" />
        </Field>
      </AdminBox>
      <div className="flex flex-col gap-16 lg:col-span-4">
        <AdminBox>
          <AdminTitle>Publishing</AdminTitle>
          <StatusChip state={a.status === "published" ? "done" : "todo"} label={a.status === "published" ? `Published${a.publishedAt ? ` · ${a.publishedAt.slice(0, 10)}` : ""}` : "Draft"} />
          <Field label="Category">
            <Select value={f.category} onChange={(e) => set({ category: e.target.value as ArticleFields["category"] })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Cover">
            <Select value={f.coverPath} onChange={(e) => set({ coverPath: e.target.value })}>
              {a.covers.map((c) => <option key={c.path} value={c.path}>{c.label}</option>)}
            </Select>
          </Field>
          <Artwork src={asset(f.coverPath)} orientation="portrait" className="w-120" sizes="120px" />
          {error && <p role="alert" className="text-danger">{error}</p>}
          <Button trailing="→" loading={busy} onClick={() => run(() => saveArticle(a.id, f), "Article saved")}>Save</Button>
          {a.kind === "draft" && a.status === "draft" && (
            <Button variant="ghost" disabled={busy} onClick={() => run(async () => { await saveArticle(a.id, f); await publishArticle(a.id); }, "Published · on the store after the next build")}>Publish</Button>
          )}
          {a.kind === "published" && <ButtonLink href={`/journal/${a.id}/`} variant="ghost" target="_blank" rel="noreferrer">On the store ↗</ButtonLink>}
          <span className="text-fg-muted">The store is built ahead of time: it shows changes after the next build.</span>
        </AdminBox>
      </div>
    </div>
  );
}
