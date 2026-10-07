"use client";

/**
 * /admin/orders/detail?number=GS-2041 (AdminOrderDetail; phone AdminMOrder). Lines with their
 * fulfilment, totals with the included VAT, Ship the print (label, certificate, mark as shipped and
 * notify), Timeline + internal notes, Customer, Actions (resend access / receipt, invoice, refund
 * modal), Risk. What a role cannot do is not offered (docs/admin.md).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NEXT_STEP_LABEL, advancePrints, nextPrintStep } from "@/lib/client/admin/fulfilment";
import { downloadCertificate, downloadInvoice, downloadLabel } from "@/lib/client/admin/documents";
import {
  AdminBox, AdminHeadRow, AdminRow, AdminTitle, Artwork, Button, Field, Input, OrderStatusChip, RefundModal, Select, StatusChip, UnderLink, canOpenAdmin,
  fulfilmentLabel, useToast,
} from "@/components";
import { REFUNDABLE_STATUSES, copyNumbersLabel, getOrder, getOrderNotes, getRefundOptions, type OrderDetail, type OrderItem } from "@/lib/api";
import { hasRole, useAdminCurrency, useAdminQuery } from "@/lib/client";
import { customerSpentEur, orderEur } from "@/lib/metrics";
import {
  CARRIER_OPTIONS, PARCELS, REFUND_REASONS, addOrderNote, refundBlocked, createLabel, generateCertificate, markShipped, refundLimitCents, refundOrder, resendAccess, resendReceipt,
  type Carrier,
} from "@/lib/client/admin/orders";
import { adminDateTime } from "@/lib/dates";
import { COUNTRIES, carrierOf, formatTrackingNo } from "@/lib/delivery";
import { formatMoney, formatPrice } from "@/lib/format";
import { BUNDLE_DISCOUNT_PCT, SHIPPING } from "@/lib/pricing";
import { AdminPage } from "../../../_admin/AdminPage";
import { useAdmin } from "../../../_admin/AdminFrame";

const ITEM_COLS = "56px 1fr 120px 70px";
/** The board's native selects are 45 px tall, 1 px more than its text fields (docs/decisions.md "Checkout (M3)"). */
const BOARD_SELECT = "min-h-45";

export function OrderDetailPage() {
  const number = (useSearchParams().get("number") ?? "").toUpperCase();
  const order = useAdminQuery(() => getOrder(number), [number]);
  const title = number ? `Order #${number.replace(/^#/, "")}` : "Order";
  const crumbs = [{ label: "Orders", href: "/admin/orders" }];

  if (order.status === "loading") {
    return (
      <AdminPage title={title} breadcrumbs={crumbs} roles={["support", "fulfilment"]} phoneTab="orders">
        <div aria-busy="true" aria-label="Loading the order" className="h-400 border border-border bg-surface" />
      </AdminPage>
    );
  }
  if (!order.data) {
    const missing = (
      <div className="flex max-w-480 flex-col gap-14 border border-border bg-surface p-20">
        <p>{number ? `There is no order #${number.replace(/^#/, "")}.` : "No order number in the link."}</p>
        <UnderLink href="/admin/orders" className="self-start">Back to orders</UnderLink>
      </div>
    );
    return (
      <AdminPage title={title} breadcrumbs={crumbs} roles={["support", "fulfilment"]} phoneTab="orders" phone={missing}>
        {missing}
      </AdminPage>
    );
  }
  const o = order.data;
  return (
    <AdminPage
      title={`Order #${o.number}`}
      currency
      breadcrumbs={crumbs}
      roles={["support", "fulfilment"]}
      phone={<PhoneOrder order={o} />}
      phoneTab="orders"
      desktopHref={`/admin/orders/detail?number=${o.number}`}
    >
      <DesktopOrder order={o} />
    </AdminPage>
  );
}

// ── Shared wording ───────────────────────────────────────────────────────────

/** "Print to ship" (the order's status as the detail and the dashboard say it). */
const statusLabel = (o: OrderDetail) => (o.displayStatus === "To ship" ? "Print to ship" : o.displayStatus);
/** "pi_3Px…9aQ" */
const shortIntent = (pi: string) => (pi.length > 10 ? `${pi.slice(0, 6)}…${pi.slice(-3)}` : pi);
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const countryName = (code: string) => COUNTRIES.find(([, c]) => c === code)?.[0] ?? code;
const hasPrintToShip = (o: OrderDetail) => o.items.some((i) => i.kind === "print" && ["to_print", "printed", "packed"].includes(i.fulfilment));
const isShipped = (o: OrderDetail) => o.items.some((i) => i.kind === "print") && !hasPrintToShip(o);
const canRefund = (o: OrderDetail) => o.status !== "refunded" && o.status !== "cancelled";

function riskLine(o: OrderDetail): { state: "done" | "todo" | "issue"; text: string } {
  const who = o.customerOrdersCount > 1 ? "known customer" : "first order";
  if (o.risk === "high") return { state: "issue", text: `High · check before shipping, ${who}` };
  if (o.risk === "medium") return { state: "todo", text: `Medium · 3DS passed, ${who}` };
  return { state: "done", text: `Low · 3DS passed, ${who}` };
}

/** Guide N°03 · 60×80 · Intermediate · Original / Print N°07 · S · edition 12/100 */
function ItemText({ item }: { item: OrderItem }) {
  if (item.kind === "print") {
    return (
      <span>
        {item.title} · {item.edition?.size} · edition <b className="font-medium">{copyNumbersLabel(item)}</b>
        <br />
        <span className="text-fg-muted">{item.certificateNo ? `Certificate #${item.certificateNo} · ` : ""}cotton rag 308 g</span>
      </span>
    );
  }
  if (item.kind === "guide") {
    const access = item.accessRevoked
      ? "Library access revoked"
      : `Library access · shopping list${item.printsLeft !== null ? ` · ${item.printsLeft} of 3 prints left` : ""}`;
    return (
      <span>
        {item.title} · {item.detail}
        <br />
        <span className="text-fg-muted">{access}</span>
      </span>
    );
  }
  return (
    <span>
      {item.title}
      <br />
      <span className="text-fg-muted">{item.detail}</span>
    </span>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────────

function DesktopOrder({ order: o }: { order: OrderDetail }) {
  const { staff } = useAdmin();
  const toast = useToast();
  const notes = useAdminQuery(() => getOrderNotes(o.number), [o.number]);
  const options = useAdminQuery(() => getRefundOptions(o.number), [o.number]);
  const [refundOpen, setRefundOpen] = useState(false);
  const [sent, setSent] = useState<{ access?: boolean; receipt?: boolean; cert?: string }>({});
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const refundedCents = o.refunds.reduce((s, r) => s + r.amountCents, 0);
  // Top-bar money display: EUR excl. VAT (the books, at the payment day's rate) or USD as charged.
  const [currency] = useAdminCurrency();
  const eur = useMemo(() => (currency === "eur" ? { order: orderEur(o), lifetime: customerSpentEur(o.createdAt).get(o.customer.id) ?? 0 } : null), [currency, o]);
  const euro = (cents: number) => formatMoney(cents, "EUR");
  const prints = o.items.filter((i) => i.kind === "print");
  const guides = o.items.filter((i) => i.kind === "guide");
  const support = hasRole(staff.role, "support");
  const limit = refundLimitCents(staff.role);
  const risk = riskLine(o);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.show(ok);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Something went wrong", { tone: "danger" });
    }
  };

  const timeline = [
    ...o.timeline.map((e) => ({ when: adminDateTime(e.at), what: e.label })),
    ...[...(notes.data ?? [])].reverse().map((n) => ({ when: "Note", what: `${n.body} · ${n.staffName}` })),
  ];

  return (
    <div className="grid grid-cols-12 items-start gap-16">
      <div className="col-span-8 flex flex-col gap-16">
        <AdminBox>
          <div className="flex justify-between gap-12">
            <OrderStatusChip status={o.displayStatus} label={`${statusLabel(o)} · paid ${adminDateTime(o.paidAt)}`} />
            <span>Stripe · {shortIntent(o.paymentIntent)} · {o.payment.label}{o.payment.threeDS === "passed" ? " · 3D Secure ✓" : o.payment.threeDS === "failed" ? " · 3D Secure failed" : ""}</span>
          </div>
          <div role="table" aria-label="Items" className="contents">
            <AdminHeadRow cols={ITEM_COLS}>
              <span role="columnheader"><span className="sr-only">Image</span></span>
              <span role="columnheader">Item</span>
              <span role="columnheader">Fulfilment</span>
              <span role="columnheader">Price</span>
            </AdminHeadRow>
            {o.items.map((i) => {
              const f = fulfilmentLabel(i.kind, i.fulfilment, i.accessRevoked);
              return (
                <AdminRow key={i.id} cols={ITEM_COLS} className="min-h-72">
                  <span role="cell">{i.imageUrl && <Artwork src={i.imageUrl} orientation={i.orientation} className="w-40" sizes="40px" />}</span>
                  <span role="cell"><ItemText item={i} /></span>
                  <span role="cell"><OrderStatusChip status={f} /></span>
                  <span role="cell" className="tabular-nums">{eur ? euro(eur.order.lines.get(i.id) ?? 0) : formatPrice(i.unitPriceCents * i.quantity)}</span>
                </AdminRow>
              );
            })}
          </div>
          {eur ? (
            <div className="grid grid-cols-[1fr_90px] justify-items-end gap-y-4 tabular-nums">
              {o.discountCents > 0 && (
                <>
                  <span className="text-fg-muted">Guide + print −{BUNDLE_DISCOUNT_PCT}%</span>
                  <span>−{euro(eur.order.discountCents)}</span>
                </>
              )}
              {o.shippingMethod && (
                <>
                  <span className="text-fg-muted">Shipping · {SHIPPING[o.shippingMethod].label.split(" — ")[0]}</span>
                  <span>{euro(eur.order.shippingCents)}</span>
                </>
              )}
              <span className="font-medium">Total excl. VAT</span>
              <span className="font-medium">{euro(eur.order.totalExVatCents)}</span>
              <span className="text-fg-muted">{o.vatLabel ? o.vatLabel.replace("VAT included", "VAT") : "No VAT"}</span>
              <span>{euro(eur.order.vatCents)}</span>
              <span className="text-fg-muted">Paid · {formatPrice(o.totalCents)} at {eur.order.fxRate.toFixed(4)} €/$</span>
              <span>{euro(eur.order.totalCents)}</span>
              {refundedCents > 0 && (
                <>
                  <span className="text-danger">Refunded · excl. VAT</span>
                  <span className="text-danger">−{euro(eur.order.refundedExVatCents)}</span>
                </>
              )}
            </div>
          ) : (
          <div className="grid grid-cols-[1fr_70px] justify-items-end gap-y-4 tabular-nums">
            {o.discountCents > 0 && (
              <>
                {/* The mock's only discount: guide + print of the same work. */}
                <span className="text-fg-muted">Guide + print −{BUNDLE_DISCOUNT_PCT}%</span>
                <span>−{formatPrice(o.discountCents)}</span>
              </>
            )}
            {o.shippingMethod && (
              <>
                <span className="text-fg-muted">Shipping · {SHIPPING[o.shippingMethod].label.split(" — ")[0]}</span>
                <span>{formatPrice(o.shippingCents)}</span>
              </>
            )}
            {o.vatLabel && (
              <>
                <span className="text-fg-muted">{o.vatLabel}</span>
                <span>{formatPrice(o.taxCents)}</span>
              </>
            )}
            <span className="font-medium">Total paid</span>
            <span className="font-medium">{formatPrice(o.totalCents)}</span>
            {refundedCents > 0 && (
              <>
                <span className="text-danger">Refunded</span>
                <span className="text-danger">−{formatPrice(refundedCents)}</span>
              </>
            )}
          </div>
          )}
        </AdminBox>

        {prints.length > 0 && <ShipBox order={o} canShip={hasRole(staff.role, "fulfilment") && (REFUNDABLE_STATUSES.includes(o.status) || isShipped(o))} onCert={(c) => setSent((s) => ({ ...s, cert: c }))} cert={sent.cert} run={run} />}

        <AdminBox>
          <AdminTitle>Timeline</AdminTitle>
          <ol className="contents">
            {timeline.map((e, i) => (
              <li key={i} className="box-content grid min-h-36 grid-cols-[120px_1fr] items-center gap-x-12 border-b border-border">
                <span className="text-fg-muted">{e.when}</span>
                <span>{e.what}</span>
              </li>
            ))}
          </ol>
          <form
            className="flex gap-10"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) {
                setNoteErr("Write the note first.");
                return;
              }
              run(() => addOrderNote(o.number, note), "Note added").then(() => setNote(""));
            }}
          >
            <label htmlFor="od-note" className="sr-only">Internal note</label>
            <Input id="od-note" placeholder="Add an internal note…" value={note} invalid={!!noteErr} aria-invalid={!!noteErr || undefined} aria-describedby={noteErr ? "od-note-err" : undefined} onChange={(e) => { setNote(e.target.value); setNoteErr(null); }} />
            <Button type="submit" variant="ghost">Add</Button>
          </form>
          {noteErr && <p id="od-note-err" role="alert" className="text-danger">{noteErr}</p>}
        </AdminBox>
      </div>

      <div className="col-span-4 flex flex-col gap-16">
        <AdminBox>
          <AdminTitle>Customer</AdminTitle>
          {canOpenAdmin(staff.role, "/admin/customers") ? <UnderLink href={`/admin/customers/detail/?id=${o.customer.id}`} className="self-start">{o.customer.fullName}</UnderLink> : <span>{o.customer.fullName}</span>}
          <span>
            {hasRole(staff.role, "support") ? <UnderLink href={`/admin/support?customer=${o.customer.id}&about=${encodeURIComponent(`#${o.number}`)}`} className="self-start" aria-label={`Write to ${o.customer.fullName} · ${o.customer.email}`}>{o.customer.email}</UnderLink> : o.customer.email}
            {o.customerPhone && (
              <>
                <br />
                {o.customerPhone}
              </>
            )}
          </span>
          <span className="text-fg-muted">
            {ordinal(o.customerOrdersCount)} order · {eur ? `${euro(eur.lifetime)} excl. VAT` : formatPrice(o.customerLifetimeCents)} lifetime
          </span>
          {o.shippingAddress && (
            <>
              <AdminTitle as="h3" className="mt-6">Ship to</AdminTitle>
              <span>
                {o.shippingAddress.line1}
                {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ""}
                <br />
                {o.shippingAddress.postalCode} {o.shippingAddress.city}, {countryName(o.shippingAddress.country)}
              </span>
            </>
          )}
        </AdminBox>
        <AdminBox>
          <AdminTitle>Actions</AdminTitle>
          {support && guides.length > 0 && (
            <Button variant="ghost" onClick={() => run(() => resendAccess(o.number), "Library link sent").then(() => setSent((s) => ({ ...s, access: true })))}>
              {sent.access ? "Library link sent" : "Resend library access"}
            </Button>
          )}
          {support && (
            <Button variant="ghost" onClick={() => run(() => resendReceipt(o.number), "Receipt sent").then(() => setSent((s) => ({ ...s, receipt: true })))}>
              {sent.receipt ? "Receipt sent" : "Resend receipt"}
            </Button>
          )}
          {support && <Button variant="ghost" onClick={() => run(() => downloadInvoice(o.number), `Invoice F-${o.number} downloaded`)}>Invoice PDF</Button>}
          {limit > 0 && (
            <Button variant="danger" disabled={!canRefund(o) || !options.data?.length} onClick={() => setRefundOpen(true)}>
              {canRefund(o) ? "Refund…" : "Refunded"}
            </Button>
          )}
        </AdminBox>
        <AdminBox>
          <AdminTitle>Risk</AdminTitle>
          <StatusChip state={risk.state} label={risk.text} />
        </AdminBox>
      </div>

      {limit > 0 && options.data && (
        <RefundModal
          open={refundOpen}
          onOpenChange={setRefundOpen}
          orderNumber={o.number}
          options={options.data.map((x) => ({ ...x, blocked: refundBlocked(x, staff.role) }))}
          reasons={REFUND_REASONS}
          restockLabel={prints.length ? `Put edition ${prints.map(copyNumbersLabel).join(", ")} back in stock` : null}
          limitCents={limit}
          onConfirm={async (input) => {
            await refundOrder({ number: o.number, option: input.option as "print" | "guide" | "full", reason: input.reason, restock: input.restock });
            toast.show(`Refunded · ${formatPrice(options.data!.find((x) => x.key === input.option)?.amountCents ?? 0)}`);
          }}
        />
      )}
    </div>
  );
}

function defaultParcel(o: OrderDetail) {
  return o.items.some((i) => i.kind === "print" && i.edition && i.edition.size !== "S") ? PARCELS[1] : PARCELS[0];
}

function ShipBox({ order: o, canShip, cert, onCert, run }: { order: OrderDetail; canShip: boolean; cert?: string; onCert: (c: string) => void; run: (fn: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const [carrier, setCarrier] = useState<Carrier>(o.shipment?.carrier ?? carrierOf(o.shippingMethod));
  const [parcel, setParcel] = useState<string>(o.shipment?.parcel ?? defaultParcel(o));
  const [tracking, setTracking] = useState(o.shipment ? formatTrackingNo(o.shipment.trackingNo) : "");
  const fulfilment = hasRole(useAdmin().staff.role, "fulfilment");
  const shipped = isShipped(o);
  const labelReady = !!o.shipment;
  // One step at a time (docs/admin-v2/05): print and sign → pack → label → ship.
  const step = nextPrintStep(o);
  const packed = step === "shipped" || shipped;
  const signed = step !== "printed";

  return (
    <AdminBox>
      <AdminTitle>Ship the print</AdminTitle>
      <div className="grid grid-cols-3 gap-12">
        <Field label="Carrier">
          <Select value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)} disabled={!canShip || shipped} className={BOARD_SELECT}>
            {CARRIER_OPTIONS.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tracking number">
          <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Filled by the label" disabled={!canShip || shipped} />
        </Field>
        <Field label="Parcel">
          <Select value={parcel} onChange={(e) => setParcel(e.target.value)} disabled={!canShip || shipped} className={BOARD_SELECT}>
            {PARCELS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
      </div>
      {canShip ? (
        <div className="flex flex-wrap gap-10">
          {(step === "printed" || step === "packed") && (
            <Button variant="ghost" onClick={() => run(() => advancePrints(o.number), step === "printed" ? "Printed & signed" : "Packed")}>
              {NEXT_STEP_LABEL[step]}
            </Button>
          )}
          <Button variant="ghost" aria-disabled={(!labelReady && !packed) || undefined} onClick={() => (labelReady ? run(() => downloadLabel(o.number), "Label downloaded") : packed && run(async () => setTracking(await createLabel({ number: o.number, carrier, parcel })), "Shipping label created"))}>
            {labelReady ? "Label ready · PDF" : "Create shipping label"}
          </Button>
          <Button variant="ghost" aria-disabled={!signed || undefined} onClick={() => signed && run(async () => { onCert(await generateCertificate(o.number)); await downloadCertificate(o.number); }, "Certificate downloaded")}>
            {cert ? `Certificate ${cert} ready` : "Generate certificate"}
          </Button>
          <Button className="min-w-260" trailing="→" aria-disabled={shipped || !packed || undefined} onClick={() => !shipped && packed && run(() => markShipped({ number: o.number, trackingNo: tracking, carrier, parcel }), "Marked as shipped · email sent")}>
            {shipped ? "Shipped · customer notified" : "Mark as shipped and notify"}
          </Button>
        </div>
      ) : (
        <p className="text-fg-muted">{fulfilment ? `${o.status === "refunded" ? "Refunded" : "Not paid"}: this order does not ship.` : "Fulfilment ships the prints."}</p>
      )}
      <span className="text-fg-muted">
        {!canShip || packed ? "Marking as shipped emails the customer with the tracking link." : step === "printed" ? "First print and sign it: the certificate is signed with the print. Then pack it; the label goes on the tube." : "Signed. Pack it next; the label goes on the tube."}
      </span>
    </AdminBox>
  );
}

// ── Phone (AdminMOrder) ──────────────────────────────────────────────────────

function PhoneOrder({ order: o }: { order: OrderDetail }) {
  const { staff } = useAdmin();
  const toast = useToast();
  const [tracking, setTracking] = useState(o.shipment ? formatTrackingNo(o.shipment.trackingNo) : "");
  const [scanning, setScanning] = useState(false);
  // Stable, so the scanner's camera effect does not restart on every render.
  const onScanned = useCallback((code: string) => {
    setTracking(formatTrackingNo(code.replace(/\s+/g, "").toUpperCase()));
    setScanning(false);
  }, []);
  const closeScanner = useCallback(() => setScanning(false), []);
  const field = useRef<HTMLInputElement>(null);
  const shipped = isShipped(o);
  const canShip = hasRole(staff.role, "fulfilment") && o.items.some((i) => i.kind === "print") && (REFUNDABLE_STATUSES.includes(o.status) || isShipped(o));
  const firstName = o.customer.fullName.split(" ")[0];
  const a = o.shippingAddress;

  const step = nextPrintStep(o);
  const ship = async () => {
    try {
      if (step === "printed" || step === "packed") await advancePrints(o.number);
      else await markShipped({ number: o.number, trackingNo: tracking });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not mark as shipped", { tone: "danger" });
    }
  };
  const scan = () => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window && "mediaDevices" in navigator) setScanning(true);
    else {
      field.current?.focus();
      toast.show("This browser cannot scan: type the number");
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <Link href="/admin/orders" className="self-start text-fg-muted hover:text-fg">← To ship</Link>
      <h1 className="text-admin-title leading-20 font-medium tracking-heading">#{o.number} · {formatPrice(o.totalCents)}</h1>
      <OrderStatusChip status={o.displayStatus} label={statusLabel(o)} />
      {/* The phone is for shipping: the prints only, or every line when there is none. */}
      {(o.items.some((i) => i.kind === "print") ? o.items.filter((i) => i.kind === "print") : o.items).map((i) => (
        <div key={i.id} className="flex gap-10 border border-border bg-surface p-14">
          {i.imageUrl && <Artwork src={i.imageUrl} orientation={i.orientation} className="w-60" sizes="60px" />}
          <span>
            {i.kind === "print" ? `${i.title} · ${i.edition?.size} · ${copyNumbersLabel(i)}` : `${i.title} · ${i.detail}`}
            <br />
            <span className="text-fg-muted">{i.kind === "print" ? (i.certificateNo ? `Certificate #${i.certificateNo}` : "") : fulfilmentLabel(i.kind, i.fulfilment, i.accessRevoked)}</span>
          </span>
        </div>
      ))}
      <div className="flex flex-col gap-14 border border-border bg-surface p-14">
        <span className="font-medium">{o.customer.fullName}</span>
        {a && <span>{a.line1}, {a.postalCode} {a.city}</span>}
        {o.customerPhone && (
          <a href={`tel:${o.customerPhone.replace(/\s+/g, "")}`} className="self-start underline underline-offset-3 hover:text-fg-muted">{o.customerPhone}</a>
        )}
      </div>
      {canShip && (
        <>
          <Field label="Tracking number">
            <Input ref={field} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Scan or type" disabled={shipped} autoComplete="off" />
          </Field>
          <Button variant="ghost" onClick={scan} disabled={shipped}>Scan the label barcode</Button>
          <Button trailing="→" onClick={() => !shipped && ship()} aria-disabled={shipped || undefined}>
            {shipped ? `Shipped · ${firstName} notified` : NEXT_STEP_LABEL[step ?? "shipped"]}
          </Button>
        </>
      )}
      {scanning && (
        <BarcodeScanner onCode={onScanned} onClose={closeScanner} />
      )}
    </div>
  );
}

interface Detector {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}

/** Camera + BarcodeDetector (Chrome on Android): the first code read fills the tracking field. */
function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = new Ctor({ formats: ["code_128", "code_39", "ean_13", "qr_code", "data_matrix"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        timer = setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return;
          const codes = await detector.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue) onCode(codes[0].rawValue);
        }, 300);
      })
      .catch(() => setError("The camera is not available. Type the number instead."));
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <div role="dialog" aria-label="Scan the label barcode" className="fixed inset-0 z-modal flex flex-col gap-12 bg-fg p-16 text-fg-inverse">
      <p>Point the camera at the barcode of the label.</p>
      {error ? <p role="alert">{error}</p> : <video ref={video} muted playsInline className="min-h-0 w-full flex-1 object-cover" />}
      <Button variant="ghost" onClick={onClose} className="border-fg-inverse text-fg-inverse hover:bg-action-hover">Cancel</Button>
    </div>
  );
}
