"use client";

/** /kit: analytics, finance, marketing and settings pieces in their states (M6 "growth"). */
import { AdminBox, AdminTitle, HBar, PermissionMatrix, StatusChip } from "@/components";

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <span className="text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

const FUNNEL = [
  { label: "Visits", value: 6680 },
  { label: "Viewed a work", value: 3410 },
  { label: "Added to cart", value: 402 },
  { label: "Started checkout", value: 251 },
  { label: "Paid", value: 187 },
];

export function GrowthKit() {
  return (
    <div className="flex flex-col gap-24">
      <div className="grid grid-cols-2 gap-16">
        <State label="HBar · counts (bare numbers, as on AdminAnalytics)">
          <AdminBox>
            <AdminTitle>Funnel · last 30 days</AdminTitle>
            <HBar label="Funnel" rows={FUNNEL} />
          </AdminBox>
        </State>
        <State label="HBar · display text · highlight (Signal fill, the label says which)">
          <AdminBox>
            <AdminTitle>Where buyers come from</AdminTitle>
            <HBar
              label="Orders by source"
              highlight={["Newsletter"]}
              rows={[
                { label: "TikTok", value: 92, display: "92 orders" },
                { label: "Instagram", value: 41, display: "41 orders" },
                { label: "Newsletter", value: 11, display: "11 orders" },
              ]}
            />
          </AdminBox>
        </State>
        <State label="HBar · percentages · empty value">
          <AdminBox>
            <HBar label="Devices" rows={[{ label: "Phone", value: 71, display: "71%" }, { label: "Desktop", value: 24, display: "24%" }, { label: "Tablet", value: 0, display: "0%" }]} />
          </AdminBox>
        </State>
        <State label="Status chips of the growth pages (done · todo · off)">
          <AdminBox className="flex-row flex-wrap gap-20">
            <StatusChip state="done" label="Paid" />
            <StatusChip state="todo" label="Scheduled" />
            <StatusChip state="todo" label="Invite sent" />
            <StatusChip state="off" label="Off" />
          </AdminBox>
        </State>
      </div>
      <State label="PermissionMatrix (Settings › Team & roles)">
        <AdminBox>
          <PermissionMatrix />
        </AdminBox>
      </State>
    </div>
  );
}
