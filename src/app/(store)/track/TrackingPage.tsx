"use client";

/**
 * /track?order=GS-2041 (boards Tracking, MTracking). The shipping email links here without login.
 * Mock: a query parameter instead of `/track/[orderId]?t=`, so orders paid in this browser have a
 * page too; no token check (docs/decisions.md "Account (M4)").
 */
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink, TrackingSteps } from "@/components";
import { copyNumbersLabel, getOrderTracking, trackingCarrierLine, type OrderTracking } from "@/lib/api";
import { useHydrated, usePurchases } from "@/lib/client";
import { dateTime, weekdayDate } from "@/lib/dates";
import { COUNTRIES } from "@/lib/delivery";
import { useMediaQuery } from "@/lib/useMediaQuery";

type Load = { status: "loading" } | { status: "missing" } | { status: "ready"; tracking: OrderTracking };

export function TrackingPage() {
  const hydrated = useHydrated();
  const desktop = useMediaQuery("(min-width: 1200px)");
  const number = (useSearchParams().get("order") ?? "").trim();
  const purchases = usePurchases();
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    void (number ? getOrderTracking(number) : Promise.resolve(null)).then((t) => live && setLoad(t ? { status: "ready", tracking: t } : { status: "missing" }));
    return () => {
      live = false;
    };
  }, [hydrated, number, purchases.orders]);

  const phone = !desktop;
  const label = number ? `#${number.replace(/^#/, "").toUpperCase()}` : "Tracking";
  const crumbs = (
    <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted lg:col-span-12 lg:mb-32">
      <Link href="/account/orders" className="hover:text-fg">Orders</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="text-fg">{phone ? label : `${label} · Tracking`}</span>
    </nav>
  );
  const frame = (children: React.ReactNode) =>
    phone ? (
      <div className="flex flex-col gap-20 px-16 pt-8">{crumbs}{children}</div>
    ) : (
      <div className="mx-auto grid w-full max-w-1440 grid-cols-12 content-start gap-x-40 px-120 pt-56">{crumbs}{children}</div>
    );

  if (!hydrated || load.status === "loading") {
    return frame(
      <div aria-busy="true" className="flex flex-col gap-20 lg:col-span-7">
        <span className="sr-only">Loading the tracking</span>
        <div className="h-80 bg-surface-muted" />
        <div className="h-320 bg-surface-muted" />
      </div>,
    );
  }

  if (load.status === "missing") {
    return frame(
      <section className="flex flex-col items-start gap-12 lg:col-span-7">
        <h1 className="text-xs font-medium tracking-normal">No parcel to track for this order.</h1>
        <p className="text-fg-muted">Check the link in your shipping email. Guides have no parcel: they are in your library.</p>
        <ButtonLink href="/account/orders" variant="ghost">See my orders</ButtonLink>
      </section>,
    );
  }

  const t = load.tracking;
  const steps = t.steps.map((s) => ({ label: s.label, time: s.at ? dateTime(s.at) : "", done: s.done, current: s.current }));
  const carrier = trackingCarrierLine(t, phone);
  const numberLine = t.trackingNo ? (phone ? `${carrier} · ${t.trackingNo}` : `${carrier} · tracking ${t.trackingNo}`) : `${carrier} · ${phone ? "number" : "tracking number"} by email once shipped`;
  const heading = t.delivered ? "Delivered" : "Estimated delivery";
  const actions = (
    <>
      {t.trackingNo && (
        <ButtonLink href={t.carrier.url} variant="ghost" target="_blank" rel="noopener noreferrer">
          Open on the carrier site<span className="sr-only"> (opens a new tab)</span>
        </ButtonLink>
      )}
      <ButtonLink href="/help" variant="ghost">Report a problem</ButtonLink>
    </>
  );

  if (phone) {
    return frame(
      <>
        <span className="text-fg-muted">{heading}</span>
        <h1 className="text-lg font-medium">{weekdayDate(t.deliveryDate)}</h1>
        <span className="text-fg-muted">{numberLine}</span>
        <TrackingSteps variant="phone" steps={steps} />
        {actions}
      </>,
    );
  }

  const a = t.shippingAddress;
  const country = a ? (COUNTRIES.find(([, c]) => c === a.country)?.[0] ?? a.country) : "";
  return frame(
    <>
      <div className="col-span-7 flex flex-col gap-28">
        <div className="flex flex-col gap-6">
          <span className="text-fg-muted">{heading}</span>
          <h1 className="text-lg font-medium">{weekdayDate(t.deliveryDate)}</h1>
          <span className="text-fg-muted">{numberLine}</span>
        </div>
        <TrackingSteps steps={steps} />
        <div className="flex gap-10">{actions}</div>
      </div>
      <aside aria-label="Parcel" className="col-span-4 col-start-9 flex flex-col gap-14 bg-surface-hover p-24">
        <span className="text-fg-muted">In this parcel</span>
        {t.prints.map((p) => (
          <div key={p.id} className="flex gap-14">
            <span className="relative block h-70 w-56 shrink-0 bg-surface-sunk">
              {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
            </span>
            <span>
              {p.workNumber} — Print {p.edition?.size}
              <br />
              <span className="text-fg-muted">Edition {copyNumbersLabel(p)} · rolled in a tube</span>
            </span>
          </div>
        ))}
        {a && (
          <>
            <span className="text-fg-muted">Delivery address</span>
            <span>
              {a.name}
              <br />
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              <br />
              {a.postalCode} {a.city}, {country}
            </span>
          </>
        )}
        <span className="text-fg-muted">
          {t.shippingMethod === "mondial_relay" ? "It waits at your pickup point for 14 days." : "Not home? The carrier leaves it at the nearest pickup point for 15 days."}
        </span>
        {t.guide && (
          <Link href="/account" className="self-start underline underline-offset-3 hover:text-fg-muted">
            Meanwhile, keep painting {t.guide.workNumber}
          </Link>
        )}
      </aside>
    </>,
  );
}
