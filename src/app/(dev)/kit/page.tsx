"use client";

/**
 * /kit — living style guide. Every component in every state, side by side with the canvas board
 * "Dev — design system". Not linked from the store; remove from production with `notFound()` if needed.
 */
import { useEffect, useRef, useState } from "react";
import {
  Accordion, BarChart, Button, ButtonLink, CanvasDiagram, CartLine, CartPanel, CartSummary, Checkbox, CheckoutStepper, DataTable, DryingTimer, OrderSummary, OrderSummaryToggle, RadioRows,
  AppIcon, ArticleCard, EditionCounter, ExpressPay, Field, GiftCardPreview, GuideConfigurator, GridFilter, PrintCard, PrintEditionCard, PrintMat, PrintScale, Artwork, ProductGallery, ShoppingListTable, StickyBuyBar, HBar, Icon, ICON_NAMES, Input, KanbanBoard, KpiTile, Logo, Modal,
  AccountNav, AccountOrderRow, LibraryRow, OrDivider, PasswordField, PasswordRules, passwordRules, TrackingSteps,
  OtpInput, PasswordInput, PermissionMatrix, Pill, PriceMorph, ProgressBar, Segmented, Select, ShoppingListItem,
  StatusChip, StepCard, StepProgress, Plate, PrintSheet, GuideBooklet, type PrintScope, Switch, Tabs, Textarea, Timeline, ToastProvider, useToast, WorkCard,
} from "@/components";
import { N03_LAYERS, N03_STROKES } from "@/components/reader/sampleN03";
import { ShellKit } from "./_admin/ShellKit";
import { InfoKit } from "./_store/InfoKit";
import { DashboardKit } from "./_admin/DashboardKit";
import { OrdersKit } from "./_admin/OrdersKit";
import { FulfilmentKit } from "./_admin/FulfilmentKit";
import { CatalogKit } from "./_admin/CatalogKit";
import { GuidesKit } from "./_admin/GuidesKit";
import { SupportKit } from "./_admin/SupportKit";
import { GrowthKit } from "./_admin/GrowthKit";
import { getGuide, priceCart, type Guide, type ShoppingListLine, type StoredCartLine } from "@/lib/api";
import { addToCart } from "@/lib/client";
import { asset } from "@/lib/asset";
import { totalCents, type GuideConfig } from "@/lib/pricing";

const WORKS = [1, 2, 3, 4, 5].map((n) => ({
  id: `w${n}`, number: `N°0${n}`, slug: `n0${n}`, imageUrl: asset(`mock/work-0${n}.jpg`), imageAlt: `N°0${n}`,
  orientation: (n <= 2 ? "landscape" : "portrait") as "landscape" | "portrait", signature: n === 1,
  fromPriceCents: [2500, 1500, 2500, 2500, 1900][n - 1]!, defaultFormat: "40x50" as const,
  levelLabel: ["Beginner", "Beginner", "Intermediate", "Intermediate", "Beginner"][n - 1]!, duration: ["1h30", "1h", "3h30", "2h30", "1h30"][n - 1]!, soldOut: n === 5,
}));
const PALETTES = [
  { id: "original", name: "Original", swatches: ["#22A6C9", "#F2B632", "#E8862E"] },
  { id: "warm", name: "Warm", swatches: ["#E8735A", "#D9A441", "#F0A596"] },
  { id: "cool", name: "Cool", swatches: ["#2F5FB3", "#A9A3D9", "#F2DC5A"] },
  { id: "earth", name: "Earth", swatches: ["#A0522D", "#6F5A45", "#C9A27E"] },
];
// Cart fixtures (board Cart): N°03 guide + N°07 A2 print; N°12 A3 is the sold-out edition of the mock.
const N03 = "00000000-0000-0000-0000-000000000003";
const CART_LINES: StoredCartLine[] = [
  { id: "l1", addedAt: "2026-10-01T10:00:00Z", kind: "guide", workId: N03, format: "60x80", level: "match", palette: "original" },
  { id: "l2", addedAt: "2026-10-01T10:01:00Z", kind: "print", editionId: "ed-07-a2", quantity: 1 },
];
const CART_FULL = priceCart(CART_LINES, { shippingMethod: "mondial_relay" });
const CART_GUIDE = priceCart(CART_LINES.slice(0, 1), { shippingMethod: "mondial_relay" });
const CART_SOLD_OUT = priceCart([...CART_LINES.slice(0, 1), { id: "l3", addedAt: "2026-10-01T10:02:00Z", kind: "print", editionId: "ed-12-a3", quantity: 1 }], { shippingMethod: "mondial_relay" });
const CART_EMPTY = priceCart([]);
const summaryLines = (cart: typeof CART_FULL) =>
  cart.lines.map((l) => ({ id: l.id, title: l.title, detail: l.shortDetail, note: l.kind === "guide" ? l.note : null, receiptTitle: l.receiptTitle, imageUrl: l.imageUrl, priceCents: l.unitPriceCents * l.quantity, issue: l.unavailable ? "Sold out, not counted" : null }));
const summaryTotals = (cart: typeof CART_FULL, shipping: number | null | undefined) => ({ subtotalCents: cart.totals.subtotalCents, shippingCents: shipping, totalCents: cart.totals.subtotalCents + (shipping ?? 0), vatCents: Math.round((cart.totals.subtotalCents + (shipping ?? 0)) / 6) });

// Shopping list fixture (board ShoppingList, 60×80): three of the ten lines.
const LIST: ShoppingListLine[] = [
  { position: 0, name: "Canvas", standard: { label: "Primed cotton canvas 60 × 80 cm, stretched", priceCents: 2400, url: "#" }, budget: { label: "Unprimed roll + 4 stretcher bars", priceCents: 1400, url: "#" } },
  { position: 1, name: "Cadmium yellow", standard: { label: "Acrylic, 60 ml", priceCents: 700, url: "#" }, budget: { label: "Student range, 75 ml", priceCents: 350, url: "#" } },
  { position: 2, name: "Orange", standard: { label: "Acrylic, 60 ml", priceCents: 700, url: "#" }, budget: { label: "Student range, 75 ml", priceCents: 350, url: "#" } },
];

const TRACK = [
  { label: "Ordered", time: "Oct 1, 14:02", done: true, current: false },
  { label: "Printed and signed", time: "Oct 2, 10:30", done: true, current: false },
  { label: "Handed to Colissimo", time: "Oct 2, 17:45", done: true, current: false },
  { label: "In transit", time: "Oct 3, 06:12", done: true, current: true },
  { label: "Out for delivery", time: "", done: false, current: false },
  { label: "Delivered", time: "", done: false, current: false },
];

const STEP_IDS = N03_LAYERS.flatMap((l, li) => l.steps.map((_, si) => `${li + 1}${"abcde"[si]}`));
const STEP_LAYERS = [0, 1, 2].map((l) => STEP_IDS.slice(l * 5, l * 5 + 5));

function KitArea({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-16 border-t border-border pt-24">
      <h3 className="font-medium">{title}</h3>
      {children}
    </section>
  );
}

function Board({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-24 border-t border-fg py-40">
      <div className="flex items-baseline gap-16">
        <span className="text-fg-muted">{n}</span>
        <h2 className="text-lg">{title}</h2>
      </div>
      {/* States keep their drawn widths: on a phone a board scrolls sideways instead of the page. */}
      <div role="region" aria-label={title} tabIndex={0} className="relative -m-4 overflow-x-auto p-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg">
        <div className="flex flex-col gap-24">{children}</div>
      </div>
    </section>
  );
}
function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <span className="text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

function ToastDemo() {
  const t = useToast();
  return (
    <div className="flex gap-10">
      <Button variant="ghost" onClick={() => t.show("Added to cart")}>Show toast</Button>
      <Button variant="ghost" onClick={() => t.show("Added to cart", { action: { label: "View", onClick: () => {} } })}>Toast with action</Button>
      <Button variant="danger" onClick={() => t.show("Payment declined. Try another card.", { tone: "danger" })}>Show error toast</Button>
    </div>
  );
}

export default function KitPage() {
  const [seg, setSeg] = useState("beginner");
  const [otp, setOtp] = useState("4812");
  const [pw, setPw] = useState("Paint-it-2026");
  const [pw2, setPw2] = useState("paint");
  const [orderOpen, setOrderOpen] = useState(true);
  const [sw, setSw] = useState(true);
  const [cfg, setCfg] = useState<GuideConfig>({ format: "60x80", level: "match", palette: "original" });
  const [added, setAdded] = useState(false);
  const [step, setStep] = useState(7);
  const [printOpen, setPrintOpen] = useState(false);
  const [printScope, setPrintScope] = useState<PrintScope>("full");
  const [printsLeft, setPrintsLeft] = useState(2);
  const [kitGuide, setKitGuide] = useState<Guide | null>(null);
  useEffect(() => {
    void getGuide("00000000-0000-0000-0000-0000000000a3").then(setKitGuide);
  }, []);
  const [modal, setModal] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [ship, setShip] = useState("home");
  const [sel, setSel] = useState<Set<string>>(new Set(["#GS-2041"]));
  const buy = useRef<HTMLDivElement>(null);
  const layer = N03_LAYERS[Math.floor(step / 5)]!;

  return (
    <ToastProvider>
      <main className="mx-auto flex max-w-1264 flex-col px-32 pb-80 pt-40">
        <div className="flex items-end justify-between pb-40">
          <div className="flex flex-col gap-8">
            <Logo size={24} animateOnHover />
            <h1 className="text-xl">Component kit</h1>
          </div>
          <p className="max-w-460 text-right text-fg-muted">Every component, every state. Hover the logo to see the pencil. Source: src/components.</p>
        </div>

        <Board n="01" title="Brand">
          <div className="flex flex-wrap items-center gap-40">
            <Logo size={40} />
            <Logo size={40} variant="short" />
            <span className="bg-fg p-24"><Logo size={24} tone="paper" /></span>
          </div>
          <State label="Favicon and app icon · 16, 32, 64, 128 px, home screen (BrandFavicon)">
            <div className="flex flex-wrap items-end gap-48">
              {([16, 32, 64, 128] as const).map((s) => <AppIcon key={s} size={s} />)}
              <AppIcon size={128} rounded />
            </div>
          </State>
          <div className="grid grid-cols-10 gap-16">
            {ICON_NAMES.map((n) => (
              <div key={n} className="flex flex-col gap-8">
                <span className="flex h-72 items-center justify-center bg-surface-muted"><Icon name={n} size={24} /></span>
                <span className="text-fg-muted">{n}</span>
              </div>
            ))}
          </div>
        </Board>

        <Board n="02" title="Buttons">
          <div className="grid grid-cols-4 gap-24">
            <State label="Primary"><Button trailing="→">Add to cart</Button></State>
            <State label="Primary · price"><Button trailing="$19">Add to cart</Button></State>
            <State label="Primary · loading"><Button loading>Paying</Button></State>
            <State label="Primary · disabled"><Button trailing="→" disabled>Continue</Button></State>
            <State label="Ghost"><Button variant="ghost">Preview</Button></State>
            <State label="Danger"><Button variant="danger">Refund…</Button></State>
            <State label="Danger solid · confirm a deletion"><Button variant="danger-solid" trailing="→">Yes, delete</Button></State>
            <State label="Text"><Button variant="text">Forgot password?</Button></State>
            <State label="Dense (admin)"><div className="flex gap-6"><Pill>7 d</Pill><Pill selected>30 d</Pill><Pill>90 d</Pill></div></State>
          </div>
        </Board>

        <Board n="03" title="Fields">
          <div className="grid grid-cols-3 gap-24">
            <Field label="Email — where your guides are sent"><Input type="email" placeholder="you@example.com" /></Field>
            <Field label="Postcode" error="Check your postcode"><Input defaultValue="690" /></Field>
            <Field label="Card name" hint="As printed on the card"><Input disabled defaultValue="Disabled" /></Field>
            <Field label="Country"><Select defaultValue="FR"><option value="FR">France</option><option value="BE">Belgium</option></Select></Field>
            <Field label="Password"><PasswordInput showStrength value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            <Field label="Code from your email"><OtpInput value={otp} onChange={setOtp} /></Field>
            <Field label="Message"><Textarea placeholder="Tell us what happened" /></Field>
            <div className="flex flex-col"><Checkbox label="Send me letters from the studio" defaultChecked /><Checkbox label="I accept the terms" invalid /><Checkbox layout="inline" label="Inline (checkout): Also create a password — optional" /><Checkbox layout="inline" disabled label="Inline, disabled" /></div>
            <Switch label="New order notifications" checked={sw} onCheckedChange={setSw} />
            <State label="Password field · Show in the label row (Login, Register)"><PasswordField label="Password" autoComplete="off" value={pw2} onChange={(e) => setPw2(e.target.value)} /></State>
            <State label="Password field · error"><PasswordField label="Password" autoComplete="off" defaultValue="" error="Enter your password" /></State>
            <State label="Password rules · as typed above"><PasswordRules rules={passwordRules(pw2)} className="gap-2" /></State>
            <State label="Or divider"><OrDivider /></State>
            <State label="Checkbox · setting (Settings, Login)"><div className="flex flex-col"><Checkbox layout="setting" label="Letters from the studio, twice a month" defaultChecked /><Checkbox layout="setting" gap="gap-10" label="Keep me logged in" /><Checkbox layout="setting" disabled label="Disabled" /></div></State>
            <State label="Code field (Login)"><Field label="6-digit code"><Input inputMode="numeric" placeholder="123 456" className="text-code tracking-code" /></Field></State>
          </div>
        </Board>

        <Board n="04" title="Choice, tabs, accordion, status">
          <div className="grid grid-cols-2 gap-40">
            <State label="Segmented"><Segmented label="Level" value={seg} onChange={setSeg} options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced", note: "+$4" }, { value: "x", label: "Sold out", disabled: true }]} /></State>
            <State label="Status chips"><div className="flex gap-16"><StatusChip state="done" label="Delivered" /><StatusChip state="todo" label="Printed" /><StatusChip state="issue" label="To ship" /><StatusChip state="off" label="Off" /></div></State>
            <Tabs label="Help topics" items={[{ value: "a", label: "Orders", content: <p className="text-fg-muted">Tab panel content.</p> }, { value: "b", label: "Guides", count: 12, content: <p>Guides</p> }, { value: "c", label: "Prints", content: <p>Prints</p> }]} />
            <Accordion items={[{ value: "a", title: "What’s in the guide", content: "15 steps, 3 layers, a drying timer and a printable PDF." }, { value: "b", title: "Materials", content: "Shopping list with standard and budget options." }]} defaultValue={["a"]} />
            <State label="Accordion · faq, rows plus their rule (MMethod)"><Accordion variant="faq" items={[{ value: "a", title: "I have never painted.", content: "That is who Geste is for. Start with a Beginner work." }, { value: "b", title: "Offline?", content: "Yes: open the guide once online." }]} defaultValue={["a"]} /></State>
            <State label="Progress"><ProgressBar value={55} label="Guide progress" /></State>
            <State label="Progress · line (Library)"><div className="flex flex-col gap-12"><ProgressBar variant="line" value={33} label="N°03 progress" /><ProgressBar variant="line" value={0} label="N°01 progress" /><ProgressBar variant="line" value={100} label="N°07 progress" /></div></State>
            <EditionCounter left={5} total={50} size="M" />
          </div>
          <InfoKit />
        </Board>

        <Board n="05" title="Commerce">
          <div className="grid grid-cols-5 gap-40">
            {WORKS.map((w, i) => <WorkCard key={w.id} work={w} alwaysShowMeta={i === 0} />)}
          </div>
          <div className="grid grid-cols-5 gap-40">
            {WORKS.map((w) => <WorkCard key={w.id} work={w} variant="home" />)}
          </div>
          <div className="grid grid-cols-2 gap-40">
            <State label="Price morph · hidden / shown"><div className="flex w-208 flex-col gap-16"><PriceMorph visible={false} meta="Beginner · 1h" price="from $15" /><PriceMorph visible meta="Beginner · 1h" price="from $15" /></div></State>
            <div ref={buy}><GuideConfigurator value={cfg} onChange={setCfg} palettes={PALETTES} priceCents={totalCents(cfg)} onAdd={() => setAdded(true)} added={added} /></div>
            <State label="Configurator · landscape work (turned formats), no S print left (option disabled)"><GuideConfigurator value={{ format: "40x50", level: "match", palette: "warm" }} onChange={() => {}} palettes={PALETTES} printAvailable={false} orientation="landscape" priceCents={1900} onAdd={() => {}} /></State>
            <State label="Product gallery · format and palette follow the configurator above"><ProductGallery workNumber="N°03" imageUrl={asset("mock/work-03.jpg")} filter={{ original: null, warm: "sepia(0.25) saturate(1.25) hue-rotate(-12deg)", cool: "hue-rotate(150deg) saturate(0.9)", earth: "sepia(0.6) saturate(0.8) hue-rotate(-8deg)" }[cfg.palette] ?? null} format={cfg.format} caption={`${cfg.palette} palette, ${cfg.format}`} resultPhotoUrl={null} /></State>
            <State label="Product gallery · landscape work (N°01), long side follows the format"><ProductGallery workNumber="N°01" imageUrl={asset("mock/work-01.jpg")} filter={null} format={cfg.format} orientation="landscape" caption="Original palette, 50×40" resultPhotoUrl={null} /></State>
            <State label="Sticky buy bar · phone only (< 1200 px), pinned to the bottom"><StickyBuyBar title="N°03 · 60×80" detail="Guide + list" price="$19" onAdd={() => {}} /></State>
            <div className="flex flex-col">
              <CartLine item={{ id: "1", kind: "guide", title: "N°03 — Guide", detail: "60×80 · Intermediate · Original", imageUrl: asset("mock/work-03.jpg"), unitPriceCents: 2500, quantity: 1 }} href="#" note="+ shopping list" onRemove={() => {}} />
              <CartLine item={{ id: "2", kind: "print", title: "N°07 — Print", detail: "M · 59 × 42 cm · Edition 13/50", imageUrl: asset("mock/work-07.jpg"), orientation: "landscape", unitPriceCents: 9500, quantity: 1, discountCents: 1425 }} href="#" note="Signed, with certificate" bundleNote="−15% with the guide" onRemove={() => {}} onQuantity={() => {}} maxQuantity={3} />
              <CartLine item={{ id: "3", kind: "print", title: "N°07 — Print", detail: "S · 42 × 30 cm · Sold out", imageUrl: asset("mock/work-07.jpg"), orientation: "landscape", unitPriceCents: 5500, quantity: 1 }} issue="Sold out, not counted" onRemove={() => {}} />
              <CartLine size="lg" item={{ id: "4", kind: "guide", title: "N°07 — Guide", detail: "40×30 · Beginner · Original", imageUrl: asset("mock/work-07.jpg"), orientation: "landscape", unitPriceCents: 1500, quantity: 1, discountCents: 225 }} href="#" note="+ shopping list" bundleNote="−15% with the print" onRemove={() => {}} />
              <div className="pt-16"><CartSummary hasPhysical totals={{ subtotalCents: 13500, discountCents: 1650, discountLabel: "Guide + print −15%", shippingCents: null, totalCents: 11850 }} /></div>
            </div>
            <div className="flex flex-col gap-24">
              <State label="Checkout stepper · on payment, shipping incomplete (desktop)"><CheckoutStepper steps={["contact", "shipping", "payment", "confirmation"]} current="payment" clickable={["contact", "shipping", "payment"]} errors={["shipping"]} onGo={() => {}} /></State>
              <State label="Checkout stepper · confirmed, nothing clickable (desktop)"><CheckoutStepper steps={["contact", "shipping", "payment", "confirmation"]} current="confirmation" clickable={[]} onGo={() => {}} /></State>
              <State label="Checkout stepper · guides only, phone"><div className="w-358"><CheckoutStepper variant="phone" steps={["contact", "payment", "confirmation"]} current="contact" clickable={["contact", "payment"]} onGo={() => {}} /></div></State>
              <State label="Express pay · desktop"><div className="flex flex-col gap-20"><ExpressPay onPay={() => {}} /></div></State>
              <State label="Express pay · phone, Apple Pay processing"><div className="flex w-358 flex-col gap-14"><ExpressPay variant="phone" busy="apple_pay" onPay={() => {}} /></div></State>
              <State label="Radio rows · delivery (Klarna-style disabled row last)"><RadioRows name="kit-ship" label="Delivery method" value={ship} onChange={setShip} options={[{ value: "home", label: "Colissimo, home", sub: "3–5 working days", aside: "$6" }, { value: "relay", label: "Mondial Relay, pickup point", sub: "4–6 working days", aside: "$4" }, { value: "express", label: "Chronopost express", sub: "Next working day", aside: "$14", disabled: true }]} /></State>
              <div className="flex gap-10"><Button variant="ghost" onClick={() => setIncomplete(true)}>Open incomplete-step modal</Button></div>
              <ShoppingListItem choice="budget" item={{ name: "Turquoise", quantity: "60 ml", standard: { label: "Artist range", priceUsd: 7, url: "https://example.com" }, budget: { label: "Student range", priceUsd: 4, url: "https://example.com" } }} />
              <div className="flex gap-10"><Button variant="ghost" onClick={() => setModal(true)}>Open payment error modal</Button><ToastDemo /></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-40">
            <State label="Cart panel · drawer, guide + print"><div className="flex min-h-640 w-376 flex-col"><CartPanel variant="drawer" cart={CART_FULL} onRemove={() => {}} onQuantity={() => {}} /></div></State>
            <State label="Cart panel · drawer, guides only"><div className="flex min-h-640 w-376 flex-col"><CartPanel variant="drawer" cart={CART_GUIDE} onRemove={() => {}} onQuantity={() => {}} /></div></State>
            <State label="Cart panel · sold-out line"><div className="flex min-h-640 w-376 flex-col"><CartPanel variant="drawer" cart={CART_SOLD_OUT} onRemove={() => {}} onQuantity={() => {}} /></div></State>
            <State label="Cart panel · empty"><div className="flex min-h-400 w-376 flex-col"><CartPanel variant="drawer" cart={CART_EMPTY} onRemove={() => {}} onQuantity={() => {}} /></div></State>
            <State label="Cart panel · empty after remove (Undo)"><div className="flex min-h-400 w-376 flex-col"><CartPanel variant="drawer" cart={CART_EMPTY} onRemove={() => {}} onQuantity={() => {}} onUndo={() => {}} /></div></State>
            <State label="Cart panel · page (phone)"><div className="w-358"><CartPanel variant="page" cart={CART_FULL} onRemove={() => {}} onQuantity={() => {}} /></div></State>
            <State label="Order summary · checkout step 01 (shipping next step)"><div className="w-374"><OrderSummary lines={summaryLines(CART_FULL)} totals={summaryTotals(CART_FULL, null)} onApplyCode={async () => false} /></div></State>
            <State label="Order summary · carrier chosen, sold-out line"><div className="w-374"><OrderSummary lines={summaryLines(CART_SOLD_OUT)} totals={summaryTotals(CART_SOLD_OUT, undefined)} onApplyCode={async () => false} /></div></State>
            <State label="Order summary · phone toggle (tap to open)"><div className="w-358"><OrderSummaryToggle lines={summaryLines(CART_FULL)} totals={summaryTotals(CART_FULL, 600)} /></div></State>
          </div>
          <div className="grid grid-cols-[1fr_358px] gap-40">
            <div className="flex flex-col">
              <State label="Library row · in progress, not started, finished · preparing, no print left"><div>
                <LibraryRow imageUrl={asset("mock/work-03.jpg")} number="N°03" detail="60×80 · Intermediate · Original palette" progress={0.33} status="Layer 2 of 3" action="Continue" openHref="#" listHref="#" printsLeft={2} printHref="#" />
                <LibraryRow imageUrl={asset("mock/work-01.jpg")} number="N°01" detail="40×50 · Beginner · Warm palette" progress={0} status="Not started" action="Start" openHref="#" listHref="#" printsLeft={3} printHref="#" />
                <LibraryRow imageUrl={asset("mock/work-07.jpg")} number="N°07" detail="30×40 · Beginner · Original palette" progress={1} status="Finished · signed 12 Sept" action="Open" openHref="#" listHref="#" printsLeft={0} printHref="#" />
              </div></State>
            </div>
            <State label="Library row · phone"><div>
              <LibraryRow variant="phone" imageUrl={asset("mock/work-03.jpg")} number="N°03" detail="60×80 · Intermediate" progress={0.33} status="Layer 2 of 3 · offline ready" action="Continue" openHref="#" listHref="#" printsLeft={2} printHref="#" />
              <LibraryRow variant="phone" imageUrl={asset("mock/work-07.jpg")} number="N°07" detail="30×40 · Beginner" progress={1} status="Finished · signed" action="Open" openHref="#" listHref="#" printsLeft={0} printHref="#" />
            </div></State>
            <State label="Account order rows · open, closed (desktop)"><div>
              <AccountOrderRow number="#GS-2041" date="Oct 1, 2026" status="Print shipped · arriving Oct 3–5" total="$70" lines={[{ label: "N°03 — Guide, 60×80", price: "$19" }, { label: "N°07 — Print A3, 12/50", price: "$45" }, { label: "Colissimo, home", price: "$6" }]} open={orderOpen} onToggle={() => setOrderOpen((o) => !o)} actions={<><ButtonLink href="#" variant="ghost">Track the print</ButtonLink><ButtonLink href="#" variant="ghost">Open in library</ButtonLink></>} />
              <AccountOrderRow number="#GS-1987" date="Sept 10, 2026" status="Delivered instantly" total="$25" lines={[]} open={false} onToggle={() => {}} actions={null} />
            </div></State>
            <State label="Account order row · phone"><div><AccountOrderRow variant="phone" number="#GS-2041" date="Oct 1, 2026" status="Print shipped" total="$70" lines={[{ label: "N°03 — Guide, 60×80", price: "$19" }, { label: "Colissimo, home", price: "$6" }]} open onToggle={() => {}} actions={<><ButtonLink href="#" variant="ghost">Track</ButtonLink><Button variant="ghost">Invoice</Button></>} /></div></State>
            <State label="Tracking steps · in transit (desktop)"><TrackingSteps steps={TRACK} /></State>
            <State label="Tracking steps · phone"><TrackingSteps variant="phone" steps={TRACK} /></State>
            <State label="Account nav · desktop"><AccountNav current="library" firstName="Camille" onLogOut={() => {}} /></State>
            <State label="Account nav · phone"><div className="flex flex-col gap-14"><AccountNav variant="phone" current="orders" firstName="Camille" onLogOut={() => {}} /></div></State>
          </div>
          <State label="Demo cart (writes the real mock cart, then open the cart icon on any store page)">
            <div className="flex gap-10">
              <Button variant="ghost" onClick={() => CART_LINES.forEach(({ id: _id, addedAt: _at, ...input }) => addToCart(input))}>Add N°03 guide + N°07 print to the cart</Button>
              <Button variant="ghost" onClick={() => addToCart({ kind: "print", editionId: "ed-12-a3", quantity: 1 })}>Add N°12 A3 (sold out)</Button>
              <ButtonLink href="/cart" variant="ghost">Open /cart</ButtonLink>
              <ButtonLink href="/checkout?paymentOutcome=soldout" variant="ghost">Checkout, number taken at payment</ButtonLink>
            </div>
          </State>
          <div className="grid grid-cols-2 gap-40">
            <State label="Shopping list · standard, first line ticked"><ShoppingListTable lines={LIST} tier="standard" have={new Set([0])} onToggle={() => {}} /></State>
            <State label="Shopping list · budget"><ShoppingListTable lines={LIST} tier="budget" have={new Set()} onToggle={() => {}} /></State>
            <State label="Print mat (board Print) · portrait"><PrintMat imageUrl={asset("mock/work-03.jpg")} alt="N°03, limited print" caption="N°03 · 1/100" /></State>
            <State label="Print mat · landscape (N°07)"><PrintMat imageUrl={asset("mock/work-07.jpg")} alt="N°07, limited print" caption="N°07 · 12/100" orientation="landscape" /></State>
            <State label="Print to scale · S, M, L above a 160 cm sideboard"><div className="flex flex-col gap-16">{(["S", "M", "L"] as const).map((z) => <div key={z} className="bg-surface-sunk px-24 pt-24"><PrintScale imageUrl={asset("mock/work-06.jpg")} alt={`N°06 in ${z}`} orientation="portrait" size={z} /></div>)}</div></State>
            <State label="Print to scale · landscape L (N°01)"><div className="bg-surface-sunk px-24 pt-24"><PrintScale imageUrl={asset("mock/work-01.jpg")} alt="N°01 in L" orientation="landscape" size="L" /></div></State>
            <State label="Gift card preview · empty names show …"><GiftCardPreview imageUrl={asset("mock/work-03.jpg")} amountCents={3000} toName="Léa" fromName="" message="For your first canvas." /></State>
          </div>
          <div className="grid grid-cols-4 gap-40">
            <State label="Print card · landscape work whole on the mat"><PrintCard href="#" imageUrl={asset("mock/work-01.jpg")} orientation="landscape" title="N°01 print" price="from $55" note="4/100" /></State>
            <State label="Print edition card (/prints) · meta shown / sold out"><div className="flex gap-40"><PrintEditionCard href="#" imageUrl={asset("mock/work-07.jpg")} orientation="landscape" number="N°07" size="S" next="12/100" price="$55" alwaysShowMeta /><PrintEditionCard href="#" imageUrl={asset("mock/work-12.jpg")} orientation="portrait" number="N°12" size="S" next={null} price="$55" alwaysShowMeta /></div></State>
            <State label="Artwork · turned thumbnail, portrait and landscape"><div className="flex items-start gap-16"><Artwork src={asset("mock/work-03.jpg")} className="w-64" sizes="64px" /><Artwork src={asset("mock/work-01.jpg")} orientation="landscape" className="w-64" sizes="64px" /><Artwork src={asset("mock/work-02.jpg")} orientation="landscape" className="w-144" sizes="144px" /></div></State>
            <State label="Grid filter"><GridFilter label="Orientation" value="landscape" options={[{ value: "all", label: "All" }, { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} onChange={() => {}} /></State>
            <State label="Article card · journal"><ArticleCard href="#" imageUrl={asset("mock/work-09.jpg")} title="How to avoid mud: three rules" category="Method" date="Sept 24" excerpt="Why colours turn grey-brown, and the three habits that keep them clean." /></State>
            <State label="Article card · keep reading"><ArticleCard href="#" imageUrl={asset("mock/work-10.jpg")} title="First canvas, first signature" excerpt="Five first-time painters, the same guide, five different paintings." variant="keep" /></State>
          </div>
          <Modal open={incomplete} onOpenChange={setIncomplete} tone="alert" width={440} title="Step 01 · Contact is incomplete" actions={<Button fullWidth trailing="→" onClick={() => setIncomplete(false)}>OK, let me fix it</Button>}>
            <ul className="flex flex-col gap-4">{["Enter your email", "Enter your first name"].map((t) => <li key={t} className="grid grid-cols-[16px_1fr]"><span aria-hidden="true" className="text-danger">—</span><span>{t}</span></li>)}</ul>
          </Modal>
          <Modal open={modal} onOpenChange={setModal} title="Payment declined" description="Your bank refused the payment. No money was taken." actions={<><Button variant="ghost" className="flex-1" onClick={() => setModal(false)}>Use another card</Button><Button className="flex-[2]" trailing="→" onClick={() => setModal(false)}>Try again</Button></>} />
        </Board>

        <Board n="06" title="Guide reader">
          <State label="Step progress · desktop, click a segment (GuideReader)"><StepProgress layers={STEP_LAYERS} current={STEP_IDS[step]!} onGo={(id) => setStep(STEP_IDS.indexOf(id))} /></State>
          <div className="w-full max-w-358"><State label="Step progress · phone, current layer (AppStep)"><StepProgress variant="phone" layers={STEP_LAYERS} current={STEP_IDS[step]!} onGo={(id) => setStep(STEP_IDS.indexOf(id))} /></State></div>
          {/* Desktop reader parts side by side from 768 px; stacked on a phone, where the reader uses AppStep. */}
          <div className="grid grid-cols-1 gap-40 md:grid-cols-2">
            <div className="flex justify-center bg-surface-muted p-24"><CanvasDiagram strokes={N03_STROKES} upTo={Math.floor(step / 5) + 1} current={Math.floor(step / 5) + 1} width={360} /></div>
            <div className="flex flex-col justify-center gap-24 md:px-48">
              <StepCard id={STEP_IDS[step]!} lastLetter="e" brush={layer.brush} text={layer.steps[step % 5]!} plate={layer.plate.map(([hex, name]) => ({ hex, name }))} tip={layer.tip} />
              <div className="flex gap-10"><Button variant="ghost" className="min-h-56 min-w-120" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</Button><Button className="min-h-56 flex-1" trailing="→" onClick={() => setStep(Math.min(14, step + 1))}>{step % 5 === 4 && step < 14 ? "Start drying timer" : step === 14 ? "I signed it. Finish" : "Next step"}</Button></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-40 md:grid-cols-3">
            <State label="Step card · phone (AppStep)"><StepCard variant="phone" id="2c" lastLetter="e" brush="50 mm flat" text="Top right: fill a large block with ultramarine, then drag night down in two vertical strokes over it." /></State>
            <State label="Plate"><Plate colours={layer.plate.map(([hex, name]) => ({ hex, name }))} /></State>
            <State label="Print sheet (AppPrint) · panel on desktop"><Button variant="ghost" onClick={() => setPrintOpen(true)}>Open the print sheet</Button></State>
          </div>
          <div className="grid grid-cols-1 gap-40 md:grid-cols-3">
            <State label="Drying · running (GuideReader)"><DryingTimer left={1452} total={2700} layer="02" running onToggle={() => {}} /></State>
            <State label="Drying · paused"><DryingTimer left={2700} total={2700} layer="02" running={false} onToggle={() => {}} /></State>
            <State label="Drying · dry (00:00, toggle disabled)"><DryingTimer left={0} total={2700} layer="02" running={false} onToggle={() => {}} /></State>
          </div>
          <div className="w-full max-w-358"><State label="Drying · phone (AppTimer)"><DryingTimer variant="phone" left={1452} total={2700} layer="2" running /></State></div>
          {kitGuide && (
            <State label="Printed guide · cover and layer 02 at 50 % (Guide01, Guide06), watermarked">
              <div className="flex flex-wrap gap-24" style={{ zoom: 0.5 }}>
                <GuideBooklet guide={kitGuide} paletteName="Original" license={{ name: "Camille M.", email: "camille.martin@mail.com", orderNumber: "GS-2041" }} only={[1, 6]} />
              </div>
            </State>
          )}
          <PrintSheet open={printOpen} onClose={() => setPrintOpen(false)} variant="panel" printsLeft={printsLeft} pages={8} name="Camille M." orderNumber="GS-2041" scope={printScope} onScope={setPrintScope} onPrepare={() => setPrintsLeft((n) => Math.max(0, n - 1))} />
          <div className="flex gap-10"><Button variant="ghost" size="sm" onClick={() => setPrintsLeft(2)}>2 prints left</Button><Button variant="ghost" size="sm" onClick={() => setPrintsLeft(0)}>No prints left</Button></div>
        </Board>

        <Board n="07" title="Admin">
          <div className="grid grid-cols-4 gap-12">
            <KpiTile label="Revenue · 30 d" value="$4,212" context="+38% vs Aug" href="#" />
            <KpiTile label="Orders · 30 d" value="187" context="+41%" href="#" />
            <KpiTile label="Conversion" value="2.8%" context="+0.6 pt" href="#" />
            <KpiTile label="Guides finished" value="61%" context="of guides started" href="#" />
          </div>
          <BarChart caption="Revenue per day, September" data={Array.from({ length: 30 }, (_, i) => { const v = i === 21 ? 310 : Math.round(70 + i * 1.8 + ((i * 37) % 40)); return { label: `Sep ${i + 1}`, value: v, tip: `Sep ${i + 1} · $${v}` }; })} />
          <HBar rows={[{ label: "Visits", value: 6680 }, { label: "Viewed a work", value: 3410 }, { label: "Added to cart", value: 402 }, { label: "Paid", value: 187 }]} />
          <DataTable
            caption="Orders"
            selectable
            selected={sel}
            onSelectedChange={setSel}
            bulkActions={<Button size="sm" variant="ghost" className="border-fg-inverse text-fg-inverse">Mark as shipped</Button>}
            rowKey={(r) => r.id}
            rows={[{ id: "#GS-2041", c: "Camille Martin", t: "$70", s: "issue" as const, l: "To ship" }, { id: "#GS-2040", c: "Hugo Petit", t: "$12", s: "done" as const, l: "Delivered" }, { id: "#GS-2038", c: "Inès Moreau", t: "$100", s: "todo" as const, l: "Printed" }]}
            columns={[{ key: "id", header: "Order", width: "100px", cell: (r) => r.id }, { key: "c", header: "Customer", width: "1fr", cell: (r) => r.c }, { key: "t", header: "Total", width: "80px", cell: (r) => r.t }, { key: "s", header: "Status", width: "140px", cell: (r) => <StatusChip state={r.s} label={r.l} /> }]}
          />
          <KanbanBoard onMove={() => {}} columns={[{ key: "print", title: "To print", nextLabel: "Printed & signed", cards: [{ id: "#GS-2041", title: "N°07 · A3 · 12/50", subtitle: "Camille Martin · Lyon", imageUrl: asset("mock/work-07.jpg"), href: "#" }] }, { key: "signed", title: "Printed & signed", cards: [] }, { key: "packed", title: "Packed", cards: [] }, { key: "shipped", title: "Shipped", cards: [] }]} />
          <div className="grid grid-cols-2 gap-40">
            <Timeline events={[{ at: "Oct 1, 14:02", text: "Order paid · $70" }, { at: "Oct 2, 10:30", text: "Print N°07 12/50 printed and signed" }, { at: "Note", text: "Customer asked for gift wrap", kind: "note" }]} onAddNote={async () => {}} />
            <PermissionMatrix />
          </div>
          {/* M6: every admin component in its states, one section per area. */}
          <KitArea title="Shell"><ShellKit /></KitArea>
          <KitArea title="Dashboard, alerts, phone"><DashboardKit /></KitArea>
          <KitArea title="Orders"><OrdersKit /></KitArea>
          <KitArea title="Fulfilment, editions, customers"><FulfilmentKit /></KitArea>
          <KitArea title="Catalog, work editor"><CatalogKit /></KitArea>
          <KitArea title="Guide editor, AI pipeline"><GuidesKit /></KitArea>
          <KitArea title="Support, reviews, content"><SupportKit /></KitArea>
          <KitArea title="Analytics, finance, marketing, settings"><GrowthKit /></KitArea>
        </Board>
      </main>
    </ToastProvider>
  );
}
