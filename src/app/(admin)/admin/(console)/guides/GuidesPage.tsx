"use client";

/**
 * /admin/guides (docs/admin-v2/04 Shell "Guide editor"): every guide of every work, three canvases ×
 * three levels, filtered by work, canvas, level and status (in the URL); each row opens its editor.
 * Owner and Content.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminHeadRow, AdminRow, Select, StatusChip } from "@/components";
import { getGuideIndex, type GuideIndexRow } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { AdminPage } from "../../_admin/AdminPage";

const COLS = "80px 1fr 110px 80px 70px 1.2fr";
const STATUS: Record<GuideIndexRow["status"], { label: string; state: "done" | "todo" | "issue" }> = {
  published: { label: "Published", state: "done" },
  draft: { label: "Unpublished changes", state: "todo" },
  stand_in: { label: "Not written · N°03 stand-in", state: "issue" },
};
const CANVAS = { small: "Small", medium: "Medium", large: "Large" } as const;
const LEVELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

export function GuidesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const q = useAdminQuery(getGuideIndex, []);
  const f = { work: params.get("work") ?? "", canvas: params.get("canvas") ?? "", level: params.get("level") ?? "", status: params.get("status") ?? "" };
  const set = (k: keyof typeof f, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`/admin/guides/${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const all = q.data ?? [];
  const works = [...new Map(all.map((g) => [g.workSlug, g.workNumber])).entries()];
  const rows = all.filter((g) => (!f.work || g.workSlug === f.work) && (!f.canvas || g.canvas === f.canvas) && (!f.level || g.level === f.level) && (!f.status || g.status === f.status));

  return (
    <AdminPage title="Guides" breadcrumbs={[{ label: "Catalog", href: "/admin/works" }]} roles={["content"]} desktopHref="/admin/guides">
      <div role="group" aria-label="Filters" className="flex flex-wrap items-end gap-10">
        <label className="flex flex-col gap-6">
          <span className="text-fg-muted">Work</span>
          <Select value={f.work} onChange={(e) => set("work", e.target.value)} className="w-140">
            <option value="">All works</option>
            {works.map(([slug, n]) => <option key={slug} value={slug}>{n}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-6">
          <span className="text-fg-muted">Canvas</span>
          <Select value={f.canvas} onChange={(e) => set("canvas", e.target.value)} className="w-140">
            <option value="">All canvases</option>
            {Object.entries(CANVAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-6">
          <span className="text-fg-muted">Level</span>
          <Select value={f.level} onChange={(e) => set("level", e.target.value)} className="w-160">
            <option value="">All levels</option>
            {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-6">
          <span className="text-fg-muted">Status</span>
          <Select value={f.status} onChange={(e) => set("status", e.target.value)} className="w-220">
            <option value="">Every status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </label>
        <span role="status" className="ml-auto text-fg-muted">{q.status === "ready" ? `${rows.length} of ${all.length} guides` : ""}</span>
      </div>
      <div className="relative overflow-x-auto">
        <div role="table" aria-label="Guides" aria-busy={q.status === "loading"} className="flex min-w-760 flex-col gap-14 border border-border bg-surface px-20">
          <AdminHeadRow cols={COLS}>
            {["Work", "Canvas", "Level", "Version", "Steps", "Status"].map((h) => <span key={h} role="columnheader">{h}</span>)}
          </AdminHeadRow>
          {q.status === "loading" && Array.from({ length: 8 }, (_, i) => <div key={i} aria-hidden="true" className="min-h-44 bg-surface-muted" />)}
          {q.status === "ready" && rows.length === 0 && <p className="py-40 text-center text-fg-muted">No guide matches these filters.</p>}
          {rows.map((g) => (
            <AdminRow key={g.id} cols={COLS}>
              <span role="cell"><Link href={g.href} className="underline underline-offset-3 hover:text-fg-muted" aria-label={`Open the guide ${g.workNumber} · ${g.formatLabel} · ${g.levelLabel}`}>{g.workNumber}</Link></span>
              <span role="cell">{g.formatLabel} <span className="text-fg-muted">· {CANVAS[g.canvas].toLowerCase()}</span></span>
              <span role="cell">{g.levelLabel}</span>
              <span role="cell" className="tabular-nums">v{g.version}</span>
              <span role="cell" className="tabular-nums">{g.steps}</span>
              <span role="cell"><StatusChip state={STATUS[g.status].state} label={STATUS[g.status].label} /></span>
            </AdminRow>
          ))}
        </div>
      </div>
    </AdminPage>
  );
}
