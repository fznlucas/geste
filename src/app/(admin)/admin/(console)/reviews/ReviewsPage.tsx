"use client";

/**
 * /admin/reviews (AdminReviews): To moderate / Published / Hidden. Approve publishes, Feature publishes
 * and features ("Real results" on the home and the work page, four at most), Hide hides; published and
 * hidden reviews keep their actions (Unfeature, Hide, Publish); each can be undone from the toast. Hiding a
 * work's real-result photo asks first. "Reply privately" opens the customer's conversation in the support inbox (Support only).
 * Owner, Support and Content. The store is built at deploy time: in the mock it keeps its reviews.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminTabs, Button, PillButton, ReviewCard, UnderLink, useToast } from "@/components";
import { getReviews, type Review, type ReviewStatus } from "@/lib/api";
import { hasRole, useAdminQuery } from "@/lib/client";
import { ResultPhotoError, setReviewStatus } from "@/lib/client/admin/reviews";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

type Tab = "To moderate" | "Published" | "Hidden";
const TABS: Tab[] = ["To moderate", "Published", "Hidden"];
const IN_TAB: Record<Tab, ReviewStatus[]> = { "To moderate": ["pending"], Published: ["published", "featured"], Hidden: ["hidden"] };
const VERDICT: Record<ReviewStatus, string> = { pending: "", published: "Published", featured: "Published · featured on home", hidden: "Hidden" };

export function ReviewsPage() {
  // ?tab=moderate|published|hidden (the sidebar opens To moderate); ?id= a review (Customers › Results).
  const params = useSearchParams();
  const PARAM: Record<string, Tab> = { moderate: "To moderate", published: "Published", hidden: "Hidden" };
  const [tabChoice, setTab] = useState<Tab | null>(null);
  const focusId = params.get("id");
  const reviews = useAdminQuery(() => getReviews(), []);
  const focused = focusId ? reviews.data?.find((r) => r.id === focusId) : undefined;
  const tab: Tab = tabChoice ?? (focused ? (TABS.find((t) => IN_TAB[t].includes(focused.status)) ?? "To moderate") : (PARAM[params.get("tab") ?? ""] ?? "To moderate"));
  const list = (reviews.data ?? []).filter((r) => IN_TAB[tab].includes(r.status));
  useEffect(() => {
    if (focused) document.getElementById(`review-${focused.id}`)?.scrollIntoView({ block: "center" });
  }, [focused]);

  const note = <span className="text-fg-muted">Approved results appear on product pages under “Real results”.</span>;
  const grid = (cols: string) =>
    reviews.status === "loading" ? (
      <div aria-busy="true" className={`grid gap-16 ${cols}`}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] bg-surface-muted" />)}
      </div>
    ) : list.length === 0 ? (
      <p className="text-fg-muted">{tab === "To moderate" ? "Nothing to moderate. New reviews land here first." : tab === "Published" ? "No published review yet." : "No hidden review."}</p>
    ) : (
      <ul className={`grid gap-16 ${cols}`}>
        {list.map((r) => <Card key={r.id} review={r} focused={r.id === focusId} />)}
      </ul>
    );

  return (
    <AdminPage
      title="Reviews & results"
      breadcrumbs={[{ label: "Customers", href: "/admin/customers" }]}
      roles={["support", "content"]}
      desktopHref="/admin/reviews"
      phone={
        <>
          <h1 className="text-admin-title font-medium tracking-heading">Reviews & results</h1>
          <AdminTabs label="Reviews" tabs={TABS} value={tab} onChange={setTab} className="self-start" />
          {note}
          {grid("grid-cols-1")}
        </>
      }
    >
      <div className="flex justify-between gap-16">
        <AdminTabs label="Reviews" tabs={TABS} value={tab} onChange={setTab} />
        {note}
      </div>
      {grid("grid-cols-4")}
    </AdminPage>
  );
}

function Card({ review: r, focused = false }: { review: Review; focused?: boolean }) {
  const { staff } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const decide = async (status: ReviewStatus, confirmed = false) => {
    setBusy(true);
    const before = r.status;
    try {
      const done = await setReviewStatus(r.id, status, { confirmed });
      const out = done.unfeatured;
      toast.show(`${VERDICT[status]} · ${r.customer.fullName}${out ? ` · ${out.customer.fullName}’s ${out.work.number} no longer featured` : ""}`, {
        action: { label: "Undo", onClick: () => void setReviewStatus(r.id, before).then(() => out && setReviewStatus(out.id, "featured")) },
      });
    } catch (e) {
      // Hiding a work's real result asks first (no browser dialog: the toast carries the choice).
      if (e instanceof ResultPhotoError) toast.show(e.message, { tone: "danger", action: { label: "Hide anyway", onClick: () => void decide(status, true) } });
      else toast.show(e instanceof Error ? e.message : "Could not change the review.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  // Every tab can act: publish, feature or hide what waits; unfeature or hide what is published; publish what is hidden.
  const actions =
    r.status === "pending" ? (
      <div className="flex flex-wrap gap-6">
        <Button size="sm" onClick={() => decide("published")} disabled={busy} className="grow justify-center!">Approve</Button>
        <PillButton onClick={() => decide("featured")} disabled={busy}>Feature</PillButton>
        <PillButton onClick={() => decide("hidden")} disabled={busy}>Hide</PillButton>
      </div>
    ) : r.status === "hidden" ? (
      <div className="flex flex-wrap gap-6">
        <PillButton onClick={() => decide("published")} disabled={busy}>Publish</PillButton>
      </div>
    ) : (
      <div className="flex flex-wrap gap-6">
        <PillButton onClick={() => decide(r.status === "featured" ? "published" : "featured")} disabled={busy}>{r.status === "featured" ? "Unfeature" : "Feature"}</PillButton>
        <PillButton onClick={() => decide("hidden")} disabled={busy}>Hide</PillButton>
      </div>
    );
  return (
    <ReviewCard
      id={`review-${r.id}`}
      focused={focused}
      who={r.customer.fullName}
      work={r.work.number}
      rating={r.rating}
      body={r.body}
      photoUrl={r.photoUrl}
      verdict={VERDICT[r.status]}
      actions={actions}
      reply={
        hasRole(staff.role, "support") ? (
          <UnderLink href={`/admin/support?customer=${r.customer.id}&about=${encodeURIComponent(r.work.number)}&review=${r.id}&new=1`} className="self-start">Reply privately</UnderLink>
        ) : undefined
      }
    />
  );
}
