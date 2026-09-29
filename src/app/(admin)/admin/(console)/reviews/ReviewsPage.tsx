"use client";

/**
 * /admin/reviews (AdminReviews): To moderate / Published / Hidden. Approve publishes, Feature publishes
 * and features ("Real results" on the home and the work page), Hide hides; each can be undone from the
 * toast. "Reply privately" opens the customer's conversation in the support inbox (Support only).
 * Owner, Support and Content. The store is built at deploy time: in the mock it keeps its reviews.
 */
import { useState } from "react";
import { AdminTabs, Button, PillButton, ReviewCard, UnderLink, useToast } from "@/components";
import { getReviews, type Review, type ReviewStatus } from "@/lib/api";
import { hasRole, useAdminQuery } from "@/lib/client";
import { setReviewStatus } from "@/lib/client/admin/reviews";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

type Tab = "To moderate" | "Published" | "Hidden";
const TABS: Tab[] = ["To moderate", "Published", "Hidden"];
const IN_TAB: Record<Tab, ReviewStatus[]> = { "To moderate": ["pending"], Published: ["published", "featured"], Hidden: ["hidden"] };
const VERDICT: Record<ReviewStatus, string> = { pending: "", published: "Published", featured: "Published · featured on home", hidden: "Hidden" };

export function ReviewsPage() {
  const [tab, setTab] = useState<Tab>("To moderate");
  const reviews = useAdminQuery(() => getReviews(), []);
  const list = (reviews.data ?? []).filter((r) => IN_TAB[tab].includes(r.status));

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
        {list.map((r) => <Card key={r.id} review={r} />)}
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

function Card({ review: r }: { review: Review }) {
  const { staff } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const decide = async (status: ReviewStatus) => {
    setBusy(true);
    try {
      const before = r.status;
      await setReviewStatus(r.id, status);
      toast.show(`${VERDICT[status]} · ${r.customer.fullName}`, { action: { label: "Undo", onClick: () => void setReviewStatus(r.id, before) } });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not change the review.", { tone: "danger" });
      setBusy(false);
    }
  };
  return (
    <ReviewCard
      who={r.customer.fullName}
      work={r.work.number}
      rating={r.rating}
      body={r.body}
      photoUrl={r.photoUrl}
      verdict={VERDICT[r.status]}
      actions={
        r.status === "pending" ? (
          <div className="flex flex-wrap gap-6">
            <Button size="sm" onClick={() => decide("published")} disabled={busy} className="grow justify-center!">Approve</Button>
            <PillButton onClick={() => decide("featured")} disabled={busy}>Feature</PillButton>
            <PillButton onClick={() => decide("hidden")} disabled={busy}>Hide</PillButton>
          </div>
        ) : undefined
      }
      reply={
        hasRole(staff.role, "support") ? (
          <UnderLink href={`/admin/support?customer=${r.customer.id}&about=${encodeURIComponent(r.work.number)}`} className="self-start">Reply privately</UnderLink>
        ) : undefined
      }
    />
  );
}
