"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, PrintCard, PrintMat, Segmented } from "@/components";
import type { PrintSize } from "@/lib/api";
import { addToCart } from "@/lib/client";
import { formatPrice, fromPrice } from "@/lib/format";
import { duration } from "@/lib/motion";
import type { PrintPageData } from "./data";

const SIZE_ORDER: PrintSize[] = ["A3", "A2", "50×70"];
const DIMENSIONS: Record<PrintSize, string> = { A3: "29.7 × 42 cm", A2: "42 × 59.4 cm", "50×70": "50 × 70 cm" };
const sizeKey = (s: PrintSize) => s.replace("×", "x").toLowerCase(); // ?size=50x70

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
  const sizes = SIZE_ORDER.map((s) => editions.find((e) => e.size === s)).filter((e) => e !== undefined);
  const firstOpen = sizes.find((e) => !e.soldOut) ?? sizes[0]!;
  const picked = sizes.find((e) => sizeKey(e.size) === requested && !e.soldOut) ?? firstOpen;
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const add = () => {
    addToCart({ kind: "print", editionId: picked.id, quantity: 1 });
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), duration.addedLabel);
  };
  const edition = picked.nextNumber === null ? "Sold out" : `${picked.nextNumber} of ${picked.editionSize} · ${picked.editionSize - picked.nextNumber} left`;
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
          <div className="lg:col-span-7">
            <PrintMat imageUrl={picked.imageUrl} alt={`${work.number}, limited print`} caption={`${work.number} · ${picked.nextNumber ?? picked.editionSize}/${picked.editionSize}`} priority />
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
                <span>Size<span className="lg:hidden"> · {DIMENSIONS[picked.size]}</span></span>
                <span className="hidden lg:inline">{DIMENSIONS[picked.size]}</span>
              </span>
              <Segmented<PrintSize>
                label="Size"
                gap="gap-x-16 lg:gap-x-20"
                value={picked.size}
                onChange={onSize}
                options={sizes.map((e) => ({
                  value: e.size,
                  label: e.size === "50×70" ? <><span className="lg:hidden">50×70</span><span className="hidden lg:inline">50 × 70</span></> : e.size,
                  disabled: e.soldOut,
                }))}
              />
            </div>
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
            <Link href="/shop" className="underline underline-offset-3 hover:text-fg-muted">All works</Link>
          </div>
          <div className="grid grid-cols-4 gap-x-40">
            {others.map((o) => (
              <PrintCard key={o.slug} href={`/prints/${o.slug}`} imageUrl={o.imageUrl} title={`${o.number} print`} price={fromPrice(o.fromCents)} note={o.note} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
