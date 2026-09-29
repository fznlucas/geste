"use client";

/**
 * /admin/works (AdminCatalog): every work with its status, default format · level · guides sold and
 * whether the studio painted it. Tabs All / Live / Drafts / Needs test, Grid / List.
 * "New work" creates a draft in the admin overlay and opens its editor.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { AdminHeadRow, AdminRow, AdminTabs, Button, ButtonLink, PillButton, StatusChip, useToast } from "@/components";
import { getAdminWorks, type AdminWork } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { createWork } from "@/lib/client/admin/catalog";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { AdminPage } from "../../../_admin/AdminPage";
import { useAdmin } from "../../../_admin/AdminFrame";

const TABS = ["All", "Live", "Drafts", "Needs test"] as const;
type Tab = (typeof TABS)[number];

const LIST_COLS = "56px 70px 1fr 90px 110px 80px 120px";

export function workStatusLabel(w: Pick<AdminWork, "status" | "publishAt">): string {
  if (w.status === "scheduled") return w.publishAt ? `Scheduled · ${shortDate(w.publishAt)}` : "Scheduled";
  return { live: "Live", draft: "Draft", archived: "Archived" }[w.status];
}

export function WorkStatus({ work }: { work: Pick<AdminWork, "status" | "publishAt"> }) {
  return <StatusChip state={work.status === "live" ? "done" : work.status === "archived" ? "off" : "todo"} label={workStatusLabel(work)} />;
}

const testLabel = (w: AdminWork) => (w.studioTested ? "Tested ✓" : "Not painted");

function filter(works: AdminWork[], tab: Tab) {
  if (tab === "Live") return works.filter((w) => w.status === "live");
  if (tab === "Drafts") return works.filter((w) => w.status !== "live");
  if (tab === "Needs test") return works.filter((w) => !w.studioTested);
  return works;
}

export function CatalogPage() {
  const { desktop } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [creating, setCreating] = useState(false);
  const q = useAdminQuery(getAdminWorks, []);
  const works = q.data ? filter(q.data, tab) : [];

  const newWork = async () => {
    setCreating(true);
    try {
      const slug = await createWork();
      toast.show(`N°${slug.slice(1)} created as a draft`);
      router.push(`/admin/works/draft?slug=${slug}`);
    } catch (e) {
      toast.show((e as Error).message, { tone: "danger" });
      setCreating(false);
    }
  };

  const actions = (
    <>
      <Button size="sm" trailing="+" className="min-h-36 min-w-140" onClick={newWork} loading={creating}>New work</Button>
      <ButtonLink href="/admin/ai" variant="ghost" size="sm" className="min-h-36">Generate with AI</ButtonLink>
    </>
  );

  return (
    <AdminPage title="Works" breadcrumbs={[{ label: "Catalog", href: "/admin/works" }]} roles={["content"]} actions={actions} desktopHref="/admin/works">
      <div className={cn("flex justify-between gap-12", desktop ? "items-center" : "flex-col")}>
        <AdminTabs label="Filter works" tabs={TABS} value={tab} onChange={setTab} className="self-start" />
        <div role="group" aria-label="View" className="flex gap-8">
          <PillButton pressed={view === "grid"} onClick={() => setView("grid")}>Grid</PillButton>
          <PillButton pressed={view === "list"} onClick={() => setView("list")}>List</PillButton>
        </div>
      </div>
      {!desktop && (
        <Button fullWidth trailing="+" onClick={newWork} loading={creating}>New work</Button>
      )}

      {q.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading works" className={cn("grid gap-x-16 gap-y-24", desktop ? "grid-cols-5" : "grid-cols-2")}>
          {Array.from({ length: 10 }, (_, i) => <div key={i} className="aspect-[4/5] bg-surface-muted" />)}
        </div>
      ) : works.length === 0 ? (
        <p className="py-40 text-center text-fg-muted">{tab === "Needs test" ? "Every work has been painted by the studio." : "No works here yet."}</p>
      ) : view === "grid" ? (
        <ul className={cn("grid gap-x-16 gap-y-24", desktop ? "grid-cols-5" : "grid-cols-2")}>
          {works.map((w) => (
            <li key={w.id}>
              <Link href={w.editorHref} className="group flex flex-col gap-6 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-fg">
                {w.imageUrl ? (
                  <Image src={w.imageUrl} alt="" width={400} height={500} sizes="(min-width: 768px) 211px, 50vw" className={cn("block aspect-[4/5] w-full object-cover group-hover:opacity-90", w.status !== "live" && "opacity-60")} />
                ) : (
                  <span className="flex aspect-[4/5] w-full items-center justify-center border border-dashed border-border-dashed text-fg-muted">No preview yet</span>
                )}
                <span className="flex justify-between gap-8">
                  <span className="font-medium">{w.number}</span>
                  <WorkStatus work={w} />
                </span>
                <span className="text-fg-muted">{w.formatLabel} · {w.levelLabel} · {w.soldCount} sold</span>
                <span className={w.studioTested ? "text-fg-muted" : "text-danger"}>{testLabel(w)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto border border-border bg-surface px-20">
          <div role="table" aria-label="Works" className="flex min-w-640 flex-col gap-14">
            <AdminHeadRow cols={LIST_COLS}>
              <span role="columnheader"><span className="sr-only">Preview</span></span>
              <span role="columnheader">Work</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Format</span>
              <span role="columnheader">Level</span>
              <span role="columnheader">Sold</span>
              <span role="columnheader">Guide test</span>
            </AdminHeadRow>
            {works.map((w) => (
              // The whole row opens the editor: the work number's link is stretched over the row.
              <AdminRow key={w.id} cols={LIST_COLS} className="relative last:border-b-0 hover:bg-surface-hover">
                <span role="cell">{w.imageUrl ? <Image src={w.imageUrl} alt="" width={72} height={90} sizes="36px" className="block h-45 w-36 object-cover" /> : <span className="block h-45 w-36 border border-dashed border-border-dashed" />}</span>
                <span role="cell"><Link href={w.editorHref} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-1 focus-visible:after:-outline-offset-1 focus-visible:after:outline-fg">{w.number}</Link></span>
                <span role="cell">{workStatusLabel(w)}</span>
                <span role="cell">{w.formatLabel}</span>
                <span role="cell">{w.levelLabel}</span>
                <span role="cell">{w.soldCount}</span>
                <span role="cell" className={w.studioTested ? "text-fg-muted" : "text-danger"}>{testLabel(w)}</span>
              </AdminRow>
            ))}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
