"use client";

/**
 * /checkout (boards Checkout 1440, MCheckout 390; docs/screens/checkout.md). Mock payment
 * (docs/mock-plan.md M3): a plain card form styled like the Payment Element, outcomes from Stripe's
 * test cards, express buttons that run the success path. `?paymentOutcome=soldout` reproduces the
 * board's sold-out tweak (someone took the edition number between the cart and the payment).
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Button,
  ButtonLink,
  CheckoutStepper,
  Checkbox,
  ExpressPay,
  Field,
  Input,
  Modal,
  OrderSummary,
  OrderSummaryToggle,
  RadioRows,
  Segmented,
  Select,
  type CheckoutStep,
  type ExpressMethod,
  type OrderSummaryLine,
} from "@/components";
import { CheckoutError, DEMO_CUSTOMER_ID, getCustomer, type PricedCart } from "@/lib/api";
import { placeOrder, useCart, useHydrated, useSession, type CustomerSession } from "@/lib/client";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { SHIPPING, type ShippingMethod } from "@/lib/pricing";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { COUNTRIES, DELIVERY } from "@/lib/delivery";

// ── Form ─────────────────────────────────────────────────────────────────────

interface Values {
  email: string;
  fn: string;
  ln: string;
  tel: string;
  pw: string;
  country: string;
  a1: string;
  a2: string;
  zip: string;
  city: string;
  card: string;
  cname: string;
  exp: string;
  cvc: string;
  terms: boolean;
  waiver: boolean;
  billingSame: boolean;
  newsletter: boolean;
  wantPwd: boolean;
}
type Key = keyof Values;
type Errors = Partial<Record<Key, string>>;

type PayMethod = "card" | "paypal" | "klarna" | "apple";
/** `short`: the phone's one-line choice (decisions.md "Phone checkout: country and payment method"). */
const PAY_METHODS: Array<{ value: PayMethod; name: string; short: string; note: string }> = [
  { value: "card", name: "Card", short: "Card", note: "Visa · Mastercard · CB" },
  { value: "paypal", name: "PayPal", short: "PayPal", note: "" },
  { value: "klarna", name: "Pay in 3 with Klarna", short: "Klarna", note: "from $30" },
  { value: "apple", name: "Apple Pay", short: "Apple Pay", note: "" },
];
const KLARNA_MIN_CENTS = 3000;

/** Stripe test cards (docs.stripe.com/testing). Any other complete number succeeds. */
const DECLINED = new Set(["4000000000000002", "4000000000009995", "4000000000009987", "4000000000009979", "4000000000000069", "4000000000000127", "4000000000000119"]);
const THREE_DS = new Set(["4000002760003184", "4000002500003155", "4000000000003220", "4000000000003063"]);

/** Fake network time of a payment; Pay stays disabled meanwhile (one order per click). */
const PROCESSING_MS = 800;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const digits = (s: string) => s.replace(/\D/g, "");
const formatCard = (s: string) => digits(s).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
function formatExpiry(s: string) {
  const d = digits(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

/** Checkout / MCheckout validate(): same rules, the phone board words a few messages differently. */
function validate(step: CheckoutStep, v: Values, ctx: { phone: boolean; pay: PayMethod }): Errors {
  const e: Errors = {};
  const need = (k: Key, m: string) => {
    if (!String(v[k] ?? "").trim()) e[k] = m;
  };
  if (step === "contact") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) e.email = v.email.trim() ? "This email looks incomplete" : "Enter your email";
    need("fn", "Enter your first name");
    need("ln", "Enter your last name");
    if (v.wantPwd && v.pw && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v.pw)) e.pw = "8 characters, a letter and a number";
  }
  if (step === "shipping") {
    need("a1", ctx.phone ? "Enter your address" : "Enter your street and number");
    if (ctx.phone) need("zip", "Enter your postcode");
    else if (!/^[0-9A-Za-z -]{4,10}$/.test(v.zip.trim())) e.zip = v.zip.trim() ? "Check your postcode" : "Enter your postcode";
    need("city", "Enter your city");
  }
  if (step === "payment") {
    if (ctx.pay === "card") {
      const d = digits(v.card);
      if (!/^[0-9]{13,19}$/.test(d)) e.card = d || ctx.phone ? "Card number is incomplete" : "Enter your card number";
      if (!ctx.phone) need("cname", "Enter the name on the card");
      if (!/^(0[1-9]|1[0-2]) ?\/ ?[0-9]{2}$/.test(v.exp.trim())) e.exp = v.exp.trim() || ctx.phone ? "Use MM / YY" : "Enter the expiry date";
      if (!/^[0-9]{3,4}$/.test(v.cvc.trim())) e.cvc = v.cvc.trim() || ctx.phone ? "3 or 4 digits" : "Enter the security code";
    }
    if (!v.terms) e.terms = ctx.phone ? "Accept the terms" : "Please accept the terms to continue";
  }
  return e;
}

function initialValues(session: CustomerSession | null): Values {
  const [fn = "", ...rest] = session?.fullName.split(" ") ?? [];
  return {
    email: session?.email ?? "",
    fn,
    ln: rest.join(" "),
    tel: "",
    pw: "",
    country: "FR",
    a1: "",
    a2: "",
    zip: "",
    city: "",
    card: "",
    cname: "",
    exp: "",
    cvc: "",
    terms: false,
    waiver: false,
    billingSame: true,
    newsletter: false,
    wantPwd: false,
  };
}

// ── Payment outcomes ─────────────────────────────────────────────────────────

type PayError =
  | { kind: "declined" }
  | { kind: "3ds" }
  /** The number shown in the cart was taken: the next one is held (board "Take 13/50 and pay"). */
  | { kind: "soldout"; title: string; text: string; alt: string; editionId: string }
  /** No copy left at all: back to the cart. */
  | { kind: "soldout_full"; title: string; text: string };

function payErrorCopy(err: PayError): { title: string; text: string } {
  if (err.kind === "declined") return { title: "Your card was declined", text: "No money was taken. Check the card details, try another card, or pay with PayPal." };
  if (err.kind === "3ds") return { title: "Your bank could not confirm the payment", text: "The 3D Secure check was cancelled or timed out. No money was taken." };
  return { title: err.title, text: err.text };
}

/** The sold-out outcome for the cart, or null when every print still has copies. */
function soldOutError(cart: PricedCart, demoRace: boolean): PayError | null {
  const gone = cart.lines.find((l) => l.unavailable === "sold_out");
  if (gone) {
    return { kind: "soldout_full", title: `${gone.title.replace(" — Print", "")} ${gone.edition?.size ?? ""} just sold out`.replace(/\s+/g, " "), text: "Someone was faster. No money was taken. Remove it from your cart to pay for the rest." };
  }
  if (!demoRace) return null;
  const print = cart.lines.find((l) => l.kind === "print" && l.unavailable === null && l.edition);
  if (!print?.edition) return null;
  const { firstNumber: n, editionSize: size, left, id } = print.edition;
  const work = print.title.replace(" — Print", "");
  if (left <= print.quantity) {
    return { kind: "soldout_full", title: `Edition ${n}/${size} of ${work} just sold out`, text: "Someone was faster. It was the last copy. No money was taken. Remove it from your cart to pay for the rest." };
  }
  return { kind: "soldout", title: `Edition ${n}/${size} of ${work} just sold out`, text: `Someone was faster. We reserved ${n + 1}/${size} for you for 10 minutes, same price.`, alt: `Take ${n + 1}/${size} and pay`, editionId: id };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CheckoutFlow() {
  const hydrated = useHydrated();
  const session = useSession();
  const desktop = useMediaQuery("(min-width: 1200px)");
  if (!hydrated || session.status === "loading") return <CheckoutSkeleton />;
  // One flow for both layouts: crossing 1200 px keeps what was typed.
  return <Flow phone={!desktop} session={session.session} />;
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-20 px-16 pt-8 lg:mx-auto lg:grid lg:w-full lg:max-w-1440 lg:grid-cols-12 lg:gap-x-40 lg:px-120 lg:pt-40">
      <span className="sr-only">Loading your checkout</span>
      <div className="flex flex-col gap-32 lg:col-span-7">
        <div className="h-20 w-160 bg-surface-muted" />
        <div className="h-30 bg-surface-muted" />
        <div className="h-480 bg-surface-muted" />
      </div>
      <div className="hidden h-560 bg-surface-hover lg:col-span-4 lg:col-start-9 lg:block" />
    </div>
  );
}

function Flow({ phone, session }: { phone: boolean; session: CustomerSession | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const demoRace = params.get("paymentOutcome") === "soldout";

  const [v, setV] = useState<Values>(() => initialValues(session));
  const [step, setStep] = useState<CheckoutStep>("contact");
  const [maxIndex, setMaxIndex] = useState(0);
  const [err, setErr] = useState<Errors>({});
  const [bad, setBad] = useState<CheckoutStep[]>([]);
  const [pop, setPop] = useState<{ step: CheckoutStep; items: string[] } | null>(null);
  const [ship, setShip] = useState<ShippingMethod>("colissimo");
  const [pay, setPay] = useState<PayMethod>("card");
  const [payErr, setPayErr] = useState<PayError | null>(null);
  const [processing, setProcessing] = useState(false);
  const [express, setExpress] = useState<ExpressMethod | null>(null);
  const [challenge, setChallenge] = useState(false);
  const [skip, setSkip] = useState<Record<string, number>>({});
  const busy = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  const live = useCart({ shippingMethod: step === "contact" ? null : ship, country: v.country });
  // After the order is placed the cart empties; keep showing the paid cart until the success page opens.
  const [frozen, setFrozen] = useState<(PricedCart & { stored: typeof live.stored }) | null>(null);
  const cart = frozen ?? live;

  const steps: CheckoutStep[] = cart.hasPhysical ? ["contact", "shipping", "payment", "confirmation"] : ["contact", "payment", "confirmation"];
  const idx = (s: CheckoutStep) => steps.indexOf(s);
  const payIndex = idx("payment");
  const clickable = steps.filter((_, i) => i <= Math.min(maxIndex + 1, payIndex));
  const labelOf = (s: CheckoutStep) => ({ contact: "Contact", shipping: "Shipping", payment: "Payment", confirmation: "Confirmation" })[s];

  // Step change: back to the top of the form, focus on the new step for keyboard and screen readers.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    sectionRef.current?.focus({ preventScroll: true });
  }, [step]);

  /** Board setField(): typing clears that field's error; the step's flag goes once none is left. */
  const set = <K extends Key>(k: K, value: Values[K]) => {
    setV((prev) => ({ ...prev, [k]: value }));
    if (!(k in err)) return;
    const next = { ...err };
    delete next[k];
    setErr(next);
    if (Object.keys(next).length === 0) {
      setBad((b) => b.filter((s) => s !== step));
      if (phone) setPop(null);
    }
  };

  const firstInvalid = () => document.querySelector<HTMLElement>('main [aria-invalid="true"]');
  const focusFirstInvalid = () => setTimeout(() => firstInvalid()?.focus(), 0);

  /** Board goTo(): back is free; forward validates every step in between and stops at the first with errors. */
  function goTo(target: CheckoutStep) {
    if (processing) return;
    const ti = idx(target);
    const ci = idx(step);
    if (ti <= ci) {
      setStep(target);
      setPop(null);
      return;
    }
    for (let k = ci; k < ti; k++) {
      const s = steps[k]!;
      const e = validate(s, v, { phone, pay });
      if (Object.keys(e).length) {
        setStep(s);
        setErr(e);
        setBad((b) => [...b.filter((x) => x !== s), s]);
        setPop({ step: s, items: Object.values(e) as string[] });
        if (phone) focusFirstInvalid();
        return;
      }
    }
    if (target === "confirmation") {
      void submitPayment();
      return;
    }
    setStep(target);
    setMaxIndex((m) => Math.max(m, ti));
    setErr({});
    setBad((b) => b.filter((x) => idx(x) >= ti));
    setPop(null);
  }

  async function finish(method: PayMethod | ExpressMethod, wallet?: Partial<Values>, skipNumbers = skip) {
    const f = { ...v, ...wallet };
    const snapshot = live;
    try {
      setFrozen(snapshot);
      const number = await placeOrder({
        lines: snapshot.stored,
        email: f.email.trim(),
        firstName: f.fn.trim(),
        shippingMethod: snapshot.hasPhysical ? (wallet ? "colissimo" : ship) : null,
        shippingAddress: snapshot.hasPhysical ? { name: `${f.fn} ${f.ln}`.trim(), line1: f.a1.trim(), line2: f.a2.trim() || undefined, postalCode: f.zip.trim(), city: f.city.trim(), country: f.country } : null,
        country: f.country === "XX" ? "" : f.country,
        cardLast4: method === "card" ? digits(f.card).slice(-4) : "4242",
        withdrawalWaived: f.waiver || !!wallet,
        skipNumbers,
      });
      router.push(`/checkout/success?order=${number}`);
    } catch (e) {
      setFrozen(null);
      busy.current = false;
      setProcessing(false);
      setExpress(null);
      if (e instanceof CheckoutError && e.code === "sold_out") setPayErr(soldOutError(live, false) ?? { kind: "soldout_full", title: "A print in your cart just sold out", text: "Someone was faster. No money was taken. Remove it from your cart to pay for the rest." });
      else throw e;
    }
  }

  /** Pay now: one payment at a time (a double click does nothing), outcome from the test card. */
  async function submitPayment(opts: { skipNumbers?: Record<string, number> } = {}) {
    if (busy.current) return;
    busy.current = true;
    setProcessing(true);
    setPayErr(null);
    await wait(PROCESSING_MS);
    const skipNumbers = opts.skipNumbers ?? skip;
    const sold = soldOutError(live, demoRace && Object.keys(skipNumbers).length === 0);
    if (sold) {
      busy.current = false;
      setProcessing(false);
      setPayErr(sold);
      return;
    }
    if (pay === "card") {
      const d = digits(v.card);
      if (DECLINED.has(d)) {
        busy.current = false;
        setProcessing(false);
        setPayErr({ kind: "declined" });
        return;
      }
      if (THREE_DS.has(d)) {
        setChallenge(true); // stays "processing" until the bank answers
        return;
      }
    }
    await finish(pay, undefined, skipNumbers);
  }

  function endChallenge(passed: boolean) {
    setChallenge(false);
    if (passed) {
      void finish("card");
      return;
    }
    busy.current = false;
    setProcessing(false);
    setPayErr({ kind: "3ds" });
  }

  /** Express checkout: the wallet fills contact, address and payment (board: straight to the confirmation). */
  async function onExpress(method: ExpressMethod) {
    if (busy.current) return;
    busy.current = true;
    setExpress(method);
    setPayErr(null);
    await wait(PROCESSING_MS);
    const sold = soldOutError(live, false);
    if (sold) {
      busy.current = false;
      setExpress(null);
      setPayErr(sold);
      return;
    }
    const who = await getCustomer(session?.userId ?? DEMO_CUSTOMER_ID);
    const [fn = "", ...ln] = (who?.fullName ?? "Camille Martin").split(" ");
    const a = who?.address;
    await finish(method, { email: who?.email ?? "camille.martin@mail.com", fn, ln: ln.join(" "), a1: a?.line1 ?? "", a2: "", zip: a?.postalCode ?? "", city: a?.city ?? "", country: a?.country ?? "FR" });
  }

  // ── Derived display values ──
  const shipOption = DELIVERY.find((d) => d.method === ship)!;
  const countryLabel = COUNTRIES.find(([, c]) => c === v.country)?.[0] ?? v.country;
  const contactLine = v.email + (v.tel ? ` · ${v.tel}` : "");
  const addrLine = [v.a1, v.a2, `${v.zip} ${v.city}`.trim(), countryLabel].filter(Boolean).join(", ");
  const summaryLines: OrderSummaryLine[] = cart.lines.map((l) => ({
    id: l.id,
    title: l.title,
    detail: l.shortDetail,
    note: l.kind === "guide" ? l.note : null,
    receiptTitle: l.receiptTitle,
    imageUrl: l.imageUrl,
    priceCents: l.unitPriceCents * l.quantity,
    issue: l.unavailable === "sold_out" ? "Sold out, not counted" : l.unavailable ? "Unavailable, not counted" : null,
  }));
  const totals = {
    subtotalCents: cart.totals.subtotalCents,
    shippingCents: cart.hasPhysical ? cart.totals.shippingCents : undefined,
    totalCents: cart.totals.totalCents,
    vatCents: cart.totals.taxIncludedCents,
  };
  const applyCode = async () => {
    await wait(300);
    return false; // Mock: no promotions or gift card balances yet.
  };

  const field = (k: Key, label: string, props: Partial<React.ComponentProps<typeof Input>> = {}, className?: string) => (
    // MCheckout puts errors 4 px under the field (Checkout: 6).
    <Field label={label} error={err[k]} className={cn(className, phone && "[&>p]:mt-4")}>
      <Input
        id={`co-${k}`}
        value={v[k] as string}
        onChange={(e) => set(k, (k === "card" ? formatCard(e.target.value) : k === "exp" ? formatExpiry(e.target.value) : e.target.value) as never)}
        {...props}
      />
    </Field>
  );

  const payAlert = payErr && (
    <PayAlert
      phone={phone}
      err={payErr}
      busy={processing}
      onRetry={() => goTo("confirmation")}
      onOtherMethod={() => {
        setPayErr(null);
        setPay("paypal");
      }}
      onTakeAlt={(editionId) => {
        const next = { ...skip, [editionId]: (skip[editionId] ?? 0) + 1 };
        setSkip(next);
        void submitPayment({ skipNumbers: next });
      }}
    />
  );

  const empty = cart.lines.length === 0;
  const payLabel = processing ? "Processing" : "Pay now";
  const payButton = (
    <Button className="flex-1" onClick={() => goTo("confirmation")} disabled={processing || empty} loading={processing} trailing={formatPrice(cart.totals.totalCents)} aria-label={processing ? "Processing your payment" : `Pay now, ${formatPrice(cart.totals.totalCents)}`}>
      {payLabel}
    </Button>
  );
  const backTo = (s: CheckoutStep) => (
    <Button variant="ghost" onClick={() => goTo(s)} disabled={processing} className={phone ? "min-w-90" : "min-w-120"}>
      Back
    </Button>
  );
  const continueTo = (s: CheckoutStep) => (
    <Button className={idx(step) > 0 ? "flex-1" : undefined} fullWidth={idx(step) === 0} onClick={() => goTo(s)} trailing="→">
      {s === "shipping" ? "Continue to shipping" : "Continue to payment"}
    </Button>
  );
  const loginHref = "/login?next=%2Fcheckout";
  const signedIn = session !== null;
  const heading = (text: ReactNode, sub?: string) => (
    <h2 className={cn("font-normal tracking-normal", !phone && "mt-8")}>
      <span className="font-medium">{text}</span>
      {sub && <span className="text-fg-muted"> {sub}</span>}
    </h2>
  );

  if (empty && !frozen) {
    return (
      <div className="flex flex-col items-start gap-12 px-16 pb-64 pt-24 lg:mx-auto lg:w-full lg:max-w-1440 lg:px-120 lg:pt-40">
        <h1 className="text-xs font-medium tracking-normal">Checkout</h1>
        <p>Your cart is empty.</p>
        <p className="text-fg-muted">Start with a Beginner work, about an hour.</p>
        <ButtonLink href="/shop" trailing="→">Browse works</ButtonLink>
      </div>
    );
  }

  // ── Steps ──
  const sectionProps = { ref: sectionRef, tabIndex: -1, "aria-label": labelOf(step), className: cn("flex flex-col outline-none", phone ? "gap-14" : "gap-20") };

  const contact = phone ? (
    <section {...sectionProps}>
      <ExpressPay variant="phone" onPay={onExpress} busy={express} />
      <div className="flex justify-between">
        <h2 className="font-medium tracking-normal">Contact</h2>
        {!signedIn && <Link href={loginHref} className="underline underline-offset-3 hover:text-fg-muted">Log in</Link>}
      </div>
      {field("email", "Email", { type: "email", placeholder: "you@example.com", autoComplete: "email" })}
      {field("fn", "First name", { autoComplete: "given-name" })}
      {field("ln", "Last name", { autoComplete: "family-name" })}
      <Checkbox layout="inline" label="Also create a password — optional" checked={v.wantPwd} onChange={(e) => set("wantPwd", e.target.checked)} />
      {v.wantPwd && field("pw", "Password", { type: "password", autoComplete: "new-password" })}
      {continueTo(cart.hasPhysical ? "shipping" : "payment")}
    </section>
  ) : (
    <section {...sectionProps}>
      <ExpressPay onPay={onExpress} busy={express} />
      <div className="flex justify-between">
        <h2 className="font-medium tracking-normal">Contact</h2>
        {!signedIn && (
          <span className="text-fg-muted">
            Have an account? <Link href={loginHref} className="text-fg underline underline-offset-3 hover:text-fg-muted">Log in</Link>
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-14">
        {field("email", "Email — where your guides are sent", { type: "email", placeholder: "you@example.com", autoComplete: "email" }, "col-span-2")}
        {field("fn", "First name", { autoComplete: "given-name" })}
        {field("ln", "Last name", { autoComplete: "family-name" })}
        {cart.hasPhysical && field("tel", "Phone — for the carrier, optional", { type: "tel", placeholder: "+33 6 12 34 56 78", autoComplete: "tel" }, "col-span-2")}
      </div>
      <div className="grid grid-cols-[88px_1fr] gap-x-12 bg-surface-muted px-16 py-14">
        <span className="font-medium">Your library</span>
        <span>We create it with this email. Log in later with a code sent by email, or choose a password below.</span>
      </div>
      <Checkbox layout="inline" label="Also create a password — optional" checked={v.wantPwd} onChange={(e) => set("wantPwd", e.target.checked)} />
      {v.wantPwd && field("pw", "Password — 8 characters, a letter and a number", { type: "password", autoComplete: "new-password" })}
      <Checkbox layout="inline" className="text-fg-muted" label="Send me new works and methods. About twice a month, unsubscribe anytime." checked={v.newsletter} onChange={(e) => set("newsletter", e.target.checked)} />
      {continueTo(cart.hasPhysical ? "shipping" : "payment")}
    </section>
  );

  const deliveryRows = (
    <RadioRows
      name="delivery"
      label="Delivery method"
      value={ship}
      onChange={setShip}
      dense={phone}
      options={DELIVERY.map((d) => ({ value: d.method, label: phone ? d.phoneName : d.name, sub: phone ? d.phoneEta : d.eta, aside: formatPrice(SHIPPING[d.method].cents) }))}
    />
  );

  const countrySelect = (className?: string) => (
    // 7 px under the label: the board's native select sits 1 px lower than the text fields (inline baseline).
    <Field label="Country" className={cn(className, "[&>label]:mb-7")}>
      <Select id="co-country" value={v.country} onChange={(e) => set("country", e.target.value)} autoComplete="country">
        {COUNTRIES.map(([label, code]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </Select>
    </Field>
  );
  const payMethodDisabled = (m: PayMethod) => m === "klarna" && cart.totals.totalCents < KLARNA_MIN_CENTS;
  const choosePay = (m: PayMethod) => {
    setPay(m);
    setErr({});
  };

  const shipping = phone ? (
    <section {...sectionProps}>
      {payAlert}
      <h2 className="font-medium tracking-normal">Shipping address</h2>
      {countrySelect()}
      {field("a1", "Address", { autoComplete: "address-line1" })}
      {/* Side by side (like Expiry / Code) so the added Country row keeps the step as long as MCheckout's. */}
      <div className="grid grid-cols-2 gap-12">
        {field("zip", "Postcode", { autoComplete: "postal-code" })}
        {field("city", "City", { autoComplete: "address-level2" })}
      </div>
      <h2 className="font-medium tracking-normal">Delivery</h2>
      {deliveryRows}
      <div className="flex gap-10">
        {backTo("contact")}
        {continueTo("payment")}
      </div>
    </section>
  ) : (
    <section {...sectionProps}>
      {payAlert}
      <SummaryRow label="Contact" value={contactLine} onChange={() => goTo("contact")} />
      {heading("Shipping address", "— for your print. Guides are digital.")}
      <div className="grid grid-cols-2 gap-14">
        {countrySelect("col-span-2")}
        {field("a1", "Address", { placeholder: "Street and number", autoComplete: "address-line1" }, "col-span-2")}
        {field("a2", "Apartment, building, floor — optional", { autoComplete: "address-line2" }, "col-span-2")}
        {field("zip", "Postcode", { autoComplete: "postal-code" })}
        {field("city", "City", { autoComplete: "address-level2" })}
      </div>
      {heading("Delivery")}
      {deliveryRows}
      <span className="text-fg-muted">Prints ship rolled in a rigid tube from Lyon, within 48h. Tracking number by email.</span>
      <div className="flex gap-12">
        {backTo("contact")}
        {continueTo("payment")}
      </div>
    </section>
  );

  const prev: CheckoutStep = cart.hasPhysical ? "shipping" : "contact";
  const termsError = err.terms && (
    <span id="co-terms-err" className={phone ? "text-danger" : "pl-23 text-danger"}>{err.terms}</span>
  );
  const payment = phone ? (
    <section {...sectionProps}>
      {payAlert}
      <h2 className="font-medium tracking-normal">Payment</h2>
      <Segmented<PayMethod> label="Payment method" gap="gap-x-16" value={pay} onChange={choosePay} options={PAY_METHODS.map((m) => ({ value: m.value, label: m.short, disabled: payMethodDisabled(m.value) }))} />
      {pay === "card" && (
        <>
          {field("card", "Card number", { placeholder: "1234 1234 1234 1234", autoComplete: "cc-number", inputMode: "numeric" })}
          <div className="grid grid-cols-2 gap-12">
            {field("exp", "Expiry", { placeholder: "MM / YY", autoComplete: "cc-exp", inputMode: "numeric" })}
            {field("cvc", "Code", { placeholder: "123", autoComplete: "cc-csc", inputMode: "numeric" })}
          </div>
        </>
      )}
      {cart.hasGuide && <Checkbox layout="inline" label="Immediate access to my guide: I waive the 14-day withdrawal right for digital content." checked={v.waiver} onChange={(e) => set("waiver", e.target.checked)} />}
      <Checkbox
        layout="inline"
        className={err.terms ? "text-danger" : undefined}
        invalid={!!err.terms}
        aria-invalid={!!err.terms || undefined}
        aria-describedby={err.terms ? "co-terms-err" : undefined}
        checked={v.terms}
        onChange={(e) => set("terms", e.target.checked)}
        label={<>I accept the <Link href="/legal/terms" className="underline underline-offset-3">terms of sale</Link>.</>}
      />
      {termsError}
      <div className="flex gap-10">
        {backTo(prev)}
        {payButton}
      </div>
    </section>
  ) : (
    <section {...sectionProps}>
      {payAlert}
      <div>
        <SummaryRow label="Contact" value={v.email} onChange={() => goTo("contact")} />
        {cart.hasPhysical && (
          <>
            <SummaryRow label="Ship to" value={addrLine} onChange={() => goTo("shipping")} />
            <SummaryRow label="Delivery" value={`${shipOption.name} · ${formatPrice(SHIPPING[ship].cents)}`} onChange={() => goTo("shipping")} />
          </>
        )}
      </div>
      {heading("Payment", "— all transactions are encrypted")}
      <RadioRows
        name="payment"
        label="Payment method"
        value={pay}
        onChange={choosePay}
        rowHeight={52}
        options={PAY_METHODS.map((m) => ({ value: m.value, label: m.name, aside: m.note, asideMuted: true, disabled: payMethodDisabled(m.value) }))}
      />
      {pay === "card" && (
        <div className="grid grid-cols-2 gap-14 bg-surface-muted p-16">
          {field("card", "Card number", { placeholder: "1234 1234 1234 1234", autoComplete: "cc-number", inputMode: "numeric" }, "col-span-2")}
          {field("cname", "Name on card", { autoComplete: "cc-name" }, "col-span-2")}
          {field("exp", "Expiry", { placeholder: "MM / YY", autoComplete: "cc-exp", inputMode: "numeric" })}
          {field("cvc", "Security code", { placeholder: "3 digits on the back", autoComplete: "cc-csc", inputMode: "numeric" })}
        </div>
      )}
      {cart.hasPhysical && <Checkbox layout="inline" label="Billing address same as shipping" checked={v.billingSame} onChange={(e) => set("billingSame", e.target.checked)} />}
      {cart.hasGuide && <Checkbox layout="inline" label="I want immediate access to my guide and waive my 14-day withdrawal right for digital content. Prints keep their 14-day right." checked={v.waiver} onChange={(e) => set("waiver", e.target.checked)} />}
      <div className="flex flex-col gap-6">
        <Checkbox
          layout="inline"
          className={err.terms ? "text-danger" : undefined}
          invalid={!!err.terms}
          aria-invalid={!!err.terms || undefined}
          aria-describedby={err.terms ? "co-terms-err" : undefined}
          checked={v.terms}
          onChange={(e) => set("terms", e.target.checked)}
          label={<>I accept the <Link href="/legal/terms" className="underline underline-offset-3">terms of sale</Link> and the <Link href="/legal/privacy" className="underline underline-offset-3">privacy policy</Link>.</>}
        />
        {termsError}
      </div>
      <div className="flex gap-12">
        {backTo(prev)}
        {payButton}
      </div>
    </section>
  );

  const current = step === "contact" ? contact : step === "shipping" ? shipping : payment;
  const errorsInStepper = phone ? (pop ? [pop.step] : []) : bad;
  const stepper = <CheckoutStepper variant={phone ? "phone" : "desktop"} steps={steps} current={step} clickable={clickable} errors={errorsInStepper} onGo={goTo} />;

  const modals = (
    <>
      <Modal
        open={!phone && pop !== null}
        onOpenChange={(o) => !o && setPop(null)}
        focusOnClose={firstInvalid}
        tone="alert"
        width={440}
        title={pop ? `Step 0${idx(pop.step) + 1} · ${labelOf(pop.step)} is incomplete` : ""}
        actions={
          <Button fullWidth trailing="→" onClick={() => setPop(null)}>
            OK, let me fix it
          </Button>
        }
      >
        <ul className="flex flex-col gap-4">
          {pop?.items.map((t) => (
            <li key={t} className="grid grid-cols-[16px_1fr]">
              <span aria-hidden="true" className="text-danger">—</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Modal>
      <Modal
        open={challenge}
        onOpenChange={(o) => !o && endChallenge(false)}
        width={440}
        title="Confirm the payment with your bank"
        description={`3D Secure test: ${formatPrice(cart.totals.totalCents)} to Geste Studio. Your bank's page opens here in production.`}
        actions={
          <>
            <Button className="flex-1" trailing="→" onClick={() => endChallenge(true)}>Complete</Button>
            <Button variant="ghost" onClick={() => endChallenge(false)}>Fail</Button>
          </>
        }
      />
    </>
  );

  if (phone) {
    return (
      <div className="mx-auto flex w-full max-w-560 flex-col gap-20 px-16 pb-40 pt-8">
        <h1 className="sr-only">Checkout</h1>
        {stepper}
        <OrderSummaryToggle lines={summaryLines} totals={totals} />
        {pop && (
          <div role="alert" className="flex flex-col gap-6 border border-danger p-14">
            <span className="font-medium text-danger">{labelOf(pop.step)} is incomplete</span>
            <span>{pop.items.join(" · ")}</span>
          </div>
        )}
        {step === "contact" && payAlert}
        {current}
        {modals}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-1440 grid-cols-12 content-start gap-x-40 px-120 pt-40">
      <div className="col-span-7 flex flex-col gap-32">
        <h1 className="sr-only">Checkout</h1>
        <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted">
          <Link href="/cart" className="hover:text-fg">Cart</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-fg">Checkout</span>
        </nav>
        {stepper}
        {step === "contact" && payAlert}
        {current}
      </div>
      <div className="col-span-4 col-start-9 self-start">
        <OrderSummary lines={summaryLines} totals={totals} onApplyCode={applyCode} />
      </div>
      {modals}
    </div>
  );
}

function SummaryRow({ label, value, onChange }: { label: string; value: string; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between border-t border-border py-12">
      <span className="w-90 shrink-0 text-fg-muted">{label}</span>
      <span className="flex-1">{value}</span>
      <button type="button" onClick={onChange} aria-label={`Change ${label.toLowerCase()}`} className="inline-flex min-h-32 items-center underline underline-offset-3 hover:text-fg-muted">
        Change
      </button>
    </div>
  );
}

function PayAlert({ phone, err, busy, onRetry, onOtherMethod, onTakeAlt }: { phone: boolean; err: PayError; busy: boolean; onRetry: () => void; onOtherMethod: () => void; onTakeAlt: (editionId: string) => void }) {
  const { title, text } = payErrorCopy(err);
  return (
    <div role="alert" className={cn("flex flex-col border border-danger", phone ? "gap-6 p-14" : "gap-10 px-20 py-16")}>
      <span className="font-medium text-danger">{title}</span>
      <span>{text}</span>
      {err.kind === "soldout" ? (
        <div className={cn("flex", phone ? "flex-col gap-8" : "gap-10")}>
          <Button className={phone ? undefined : "min-w-220"} onClick={() => onTakeAlt(err.editionId)} disabled={busy} loading={busy} trailing="→">{err.alt}</Button>
          <ButtonLink href="/cart" variant="ghost">Back to cart</ButtonLink>
        </div>
      ) : err.kind === "soldout_full" ? (
        <div className="flex gap-10">
          <ButtonLink href="/cart" variant="ghost">Back to cart</ButtonLink>
        </div>
      ) : (
        <div className="flex gap-10">
          <Button className={phone ? "flex-1" : "min-w-180"} onClick={onRetry} disabled={busy} loading={busy} trailing="→">Try again</Button>
          {!phone && <Button variant="ghost" onClick={onOtherMethod} disabled={busy}>Use another method</Button>}
        </div>
      )}
    </div>
  );
}
