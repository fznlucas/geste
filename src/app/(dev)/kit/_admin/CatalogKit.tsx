"use client";

/** /kit: the catalog's work states (AdminCatalog cards and list, AdminWorkEditor checklist). No new shared component. */
import { StatusChip } from "@/components";
import { WorkStatus } from "@/app/(admin)/admin/(console)/works/_parts/CatalogPage";

export function CatalogKit() {
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap gap-24">
        <WorkStatus work={{ status: "live", publishAt: null }} />
        <WorkStatus work={{ status: "draft", publishAt: null }} />
        <WorkStatus work={{ status: "scheduled", publishAt: "2026-10-06T08:00:00Z" }} />
        <WorkStatus work={{ status: "archived", publishAt: null }} />
      </div>
      <div className="flex flex-wrap gap-24">
        <span className="text-fg-muted">Tested ✓</span>
        <span className="text-danger">Not painted</span>
      </div>
      <ul className="flex w-240 flex-col gap-14">
        <li><StatusChip state="done" label="Preview image" /></li>
        <li><StatusChip state="done" label="Guide: 15 steps" /></li>
        <li><StatusChip state="issue" label="Real result photo missing" /></li>
      </ul>
    </div>
  );
}
