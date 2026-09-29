"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, EditionCounter, PrintCard, PrintPaper, PrintScale, ProportionalGrid, SHEET_RATIO, Segmented } from "@/components";
import type { PrintSize } from "@/lib/api";
import { addToCart } from "@/lib/client";
import { formatPrice, fromPrice } from "@/lib/format";
import { duration } from "@/lib/motion";
import { PRINT_SIZES, PRINT_SIZE_ORDER } from "@/lib/pricing";
import type { PrintPageData } from "./data";

const sizeKey = (s: PrintSize) => s.toLowerCase(); // ?size=m

export function PrintPage(props: PrintPageData & { static?: boolean }) {
  return props.static ? <View {...props} requested={null} onSize={() => {}} /> : <UrlPrintPage {...props} />;
}

function UrlPrintPage(props: PrintPageData) {
  const q = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return <View {...props} requested={q.get("size")} onSize={(s) => router.replace(`${pathname}?size=${sizeKey(s)}`, { scroll: false })} />;
}

function View({ work, editions, others, requested, onSize }: PrintPageData & { requested: string | null; onSize: (s: PrintSize) => void }) {
  const sizes = PRINT_SIZE_ORDER.map((s) => editions.find((e) => e.size === s)).filter((e) => e !== undefined);
  const firstOpen = sizes.find((e) => !e.soldOut) ?? sizes[0]!;
  const picked = sizes.find((e) => sizeKey(e.size) === requested && !e.soldOut) ?? firstOpen;
  const [view, setView] = useState<"print" | "scale">("print");
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const add = () => {
    addToCart({ kind: "print", editionId: picked.id, quantity: 1 });
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), duration.addedLabel);
  };
  // The counter below the sizes says how many are left; this row is the number the buyer gets.
  const edition = picked.nextNumber === null ? "Sold out" : `${picked.nextNumber} of ${picked.editionSize}`;
  // "30 × 42 cm · A3"; L has no paper name of its own ("50×70").
  const paper = PRINT_SIZES[picked.size].paper;
  const dims = paper.includes("×") ? picked.dimensions : `${picked.dimensions} · ${paper}`;
  const rows: Array<[string, string, string | null]> = [
    ["Edition", edition, edition],
    ["Paper", "Cotton rag, 308 g, matte", "Cotton rag, 308 g"],
    ["Inks", "Archival pigment inks", null],
    ["With it", "Signed, numbered, certificate of authenticity", "Signed, numbered, certificate"],
    ["Delivery", "Rolled in a rigid tube, 3–5 working days", "Rolled in a tube, 3–5 days"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-20 px-16 pt-8 lg:gap-96 lg:px-32 lg:pt-24">
      <div className="flex flex-col gap-20 lg:gap-24">
        <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted">
          <Link href="/" className="hidden hover:text-fg lg:inline">Home</Link>
          <span aria-hidden="true" className="hidden lg:inline">/</span>
          <Link href="/prints" className="hover:text-fg">Prints</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-fg">{work.number}</span>
        </nav>
        <div className="flex flex-col gap-20 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-40">
          <div className="flex flex-col gap-22 lg:col-span-7 lg:gap-14">
            {view === "print" ? (
              // The print as a Sand sheet straight on the page, centred in the board's 760 px area.
              <div className="flex items-center justify-center lg:h-760">
                <PrintPaper
                  imageUrl={picked.imageUrl}
                  alt={`${work.number}, limited print`}
                  orientation={picked.orientation}
                  caption={`${work.number} · ${picked.nextNumber ?? picked.editionSize}/${picked.editionSize}`}
                  captionAlways
                  className={picked.orientation === "landscape" ? "w-full" : "w-256 lg:w-486"}
                  sizes="(min-width: 1200px) 640px, 100vw"
                  priority
                />
              </div>
            ) : (
              <div className="flex items-end pt-24 lg:h-760 lg:pt-0">
                <PrintScale imageUrl={picked.imageUrl} alt={`${work.number} in ${picked.size}, ${picked.dimensions}, above a 160 cm sideboard`} orientation={picked.orientation} size={picked.size} caption={`${work.number} · ${picked.nextNumber ?? picked.editionSize}/${picked.editionSize}`} />
              </div>
            )}
            {/* As on the work page: the views left, a caption right (desktop). */}
            <div className="flex items-start justify-between text-fg-muted">
              <Segmented<"print" | "scale">
                label="Picture"
                gap="gap-x-16 lg:gap-x-20"
                value={view}
                onChange={setView}
                options={[{ value: "print", label: "Print" }, { value: "scale", label: "To scale" }]}
              />
              <span className="hidden leading-[normal] lg:inline">{view === "print" ? dims : `${picked.size} · ${picked.dimensions}, above a 160 cm sideboard`}</span>
            </div>
          </div>
          <div className="flex flex-col gap-20 lg:col-span-5 lg:gap-24">
            <div className="flex flex-col gap-6">
              <div className="flex justify-between">
                <h1 className="text-xs tracking-normal">{work.number} — Limited print</h1>
                <span className="tabular-nums">{formatPrice(picked.priceCents)}</span>
              </div>
              <span className="hidden text-fg-muted lg:inline">A photograph of the studio painting, printed as a fine art edition. For the wall, not the easel.</span>
            </div>
            <div className="flex flex-col gap-2 lg:gap-8">
              <span className="flex justify-between text-fg-muted">
                <span>Size<span className="lg:hidden"> · {dims}</span></span>
                <span className="hidden lg:inline">{dims}</span>
              </span>
              <Segmented<PrintSize>
                label="Size"
                gap="gap-x-16 lg:gap-x-20"
                value={picked.size}
                onChange={onSize}
                options={sizes.map((e) => ({ value: e.size, label: e.size, disabled: e.soldOut }))}
              />
            </div>
            <EditionCounter left={picked.left} total={picked.editionSize} size={picked.size} />
            <dl className="grid grid-cols-[90px_1fr] gap-y-6 border-y border-border py-14 lg:grid-cols-[120px_1fr] lg:gap-y-8">
              {rows.map(([k, long, short]) => (
                <div key={k} className={short === null ? "hidden lg:contents" : "contents"}>
                  <dt className="text-fg-muted">{k}</dt>
                  <dd>
                    {short === long ? (
                      long
                    ) : (
                      <>
                        <span className="lg:hidden">{short}</span>
                        <span className="hidden lg:inline">{long}</span>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <Button trailing={added ? "✓" : formatPrice(picked.priceCents)} onClick={add} disabled={picked.soldOut} fullWidth>
              {picked.soldOut ? "Sold out" : added ? "Added" : "Add to cart"}
            </Button>
            <span className="hidden text-fg-muted lg:inline">Frame not included. Free returns within 14 days.</span>
            <Link href={`/works/${work.slug}`} className="flex justify-between bg-surface-muted px-16 py-14 hover:text-fg-muted">
              <span>
                <span className="lg:hidden">Paint it yourself instead</span>
                <span className="hidden lg:inline">Paint {work.number} yourself instead</span>
              </span>
              <span className="underline underline-offset-3">
                <span className="lg:hidden">{fromPrice(work.minPriceCents)}</span>
                <span className="hidden lg:inline">Guide {fromPrice(work.minPriceCents)}</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
      {others.length > 0 && (
        <section className="hidden flex-col gap-24 lg:flex">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs tracking-normal">Other editions</h2>
            <Link href="/prints" className="underline underline-offset-3 hover:text-fg-muted">All prints</Link>
          </div>
          <ProportionalGrid
            rowSpace="mb-0"
            perRow={{ base: 4, md: 4, lg: 4 }}
            maxHeight={{ lg: 340 }}
            items={others.map((o) => ({
              key: o.slug,
              ratio: SHEET_RATIO[o.orientation],
              node: <PrintCard href={`/prints/${o.slug}`} imageUrl={o.imageUrl} orientation={o.orientation} title={`${o.number} print`} price={fromPrice(o.fromCents)} note={o.note} sheetCaption={`${o.number} · Edition of ${o.editionSize}`} />,
            }))}
          />
        </section>
      )}
    </div>
  );
}
