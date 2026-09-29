"use client";

/**
 * /account (boards Account, MAccount): the customer's guides with the reader's progress. Mock:
 * `getLibrary` merges the guides bought at checkout in this browser; "Continue" and "Print" wait for
 * the reader (M5); Upload opens the photo picker and keeps nothing (docs/decisions.md "Account (M4)").
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, LibraryRow, useToast } from "@/components";
import { getLibrary, libraryProgress, type LibraryItem } from "@/lib/api";
import { useLibraryProgress } from "@/lib/client";
import { dayMonth } from "@/lib/dates";
import { FORMATS, LEVELS } from "@/lib/pricing";
import { AccountFrame } from "./_parts/AccountFrame";

const ORDER: Record<LibraryItem["state"], number> = { in_progress: 0, not_started: 1, finished: 2 };
const READER_SOON = "The guide reader opens here in the next version of the demo.";

export function LibraryPage() {
  return (
    <AccountFrame current="library" phoneGap="gap-14">
      {({ phone, session }) => <Library phone={phone} customerId={session.userId} />}
    </AccountFrame>
  );
}

function Library({ phone, customerId }: { phone: boolean; customerId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<LibraryItem[] | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    void getLibrary(customerId).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, [customerId]);

  // What to do next first: in progress, not started, finished; newest first in each.
  const items = [...useLibraryProgress(rows ?? [])].sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.createdAt.localeCompare(a.createdAt));

  if (rows === null) {
    return (
      <div aria-busy="true" className="flex flex-col gap-8 lg:col-span-9 lg:col-start-4">
        <span className="sr-only">Loading your library</span>
        <div className="h-200 bg-surface-muted" />
        <div className="h-200 bg-surface-muted" />
      </div>
    );
  }

  const open = () => toast.show(READER_SOON);
  const print = (id: string) => {
    setPreparing(id);
    setTimeout(() => {
      setPreparing(null);
      toast.show("Printable pages come with the reader, in the next version of the demo.");
    }, 1200);
  };
  const finished = items.find((i) => i.state === "finished");
  const next = items.find((i) => i.state !== "finished");
  const listHref = (i: LibraryItem) => `/works/${i.work.slug}/list?format=${i.format}&level=${i.level}&palette=${i.paletteKey}`;
  const action = (i: LibraryItem) => (i.state === "finished" ? "Open" : i.state === "in_progress" ? "Continue" : "Start");
  const status = (i: LibraryItem) => {
    if (i.state === "finished") return phone ? "Finished · signed" : `Finished · signed ${dayMonth(i.completedAt!)}`;
    if (i.state === "not_started") return "Not started";
    return `Layer ${i.currentLayer} of ${i.layerCount}${phone ? " · offline ready" : ""}`;
  };

  const uploadInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        if (e.target.files?.length) setUploaded(true);
        e.target.value = "";
      }}
    />
  );
  const pickPhoto = () => fileRef.current?.click();

  const empty = (
    <p>
      No guides yet. <Link href="/shop" className="underline underline-offset-3 hover:text-fg-muted">Browse the shop</Link>.
    </p>
  );

  const rowsView = items.map((i) => (
    <LibraryRow
      key={i.entitlementId}
      variant={phone ? "phone" : "desktop"}
      imageUrl={i.work.imageUrl}
      number={i.work.number}
      detail={phone ? `${FORMATS[i.format].label} · ${LEVELS[i.level].label}` : i.detail}
      progress={libraryProgress(i)}
      status={status(i)}
      action={action(i)}
      onOpen={open}
      listHref={listHref(i)}
      printsLeft={i.printsLeft}
      onPrint={() => print(i.entitlementId)}
      preparing={preparing === i.entitlementId}
    />
  ));

  if (phone) {
    return (
      <>
        {next && (
          <Button fullWidth trailing="→" onClick={open}>
            {next.state === "in_progress" ? `Continue ${next.work.number} · layer ${next.currentLayer}` : `Start ${next.work.number}`}
          </Button>
        )}
        {items.length === 0 ? empty : rowsView}
        {finished && (
          <div className="flex flex-col gap-8 bg-surface-muted p-14">
            <span role="status">{uploaded ? "Photo received. Thank you." : `Finished ${finished.work.number}? Send a photo, the studio answers within 48h.`}</span>
            <Button variant="ghost" onClick={pickPhoto}>Upload a photo</Button>
            {uploadInput}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="col-span-9 col-start-4 flex flex-col gap-8">
      <div className="mb-12 flex justify-between">
        <h2 className="text-xs font-medium tracking-normal">Library</h2>
        <span className="text-fg-muted">{items.length} {items.length === 1 ? "guide" : "guides"}</span>
      </div>
      {items.length === 0 ? empty : rowsView}
      {finished && (
        <div className="mt-16 flex items-center justify-between bg-surface-muted px-20 py-16">
          <span role="status">{uploaded ? "Photo received. The studio replies within 48 hours." : `Finished ${finished.work.number}? Show us. Upload a photo and get feedback from the studio.`}</span>
          <button type="button" onClick={pickPhoto} className="inline-flex min-h-32 items-center underline underline-offset-3 hover:text-fg-muted">
            Upload
          </button>
          {uploadInput}
        </div>
      )}
    </div>
  );
}
