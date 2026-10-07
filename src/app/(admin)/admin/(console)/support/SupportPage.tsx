"use client";

/**
 * /admin/support (AdminSupport): threads (Open / Done), the conversation with saved replies and the
 * reply box, and the customer's links. Opening a thread marks it read (sidebar "Support inbox 2").
 * `?thread=` opens a thread; `?customer=&about=` (Reviews › "Reply privately") opens the customer's
 * latest thread, or a first message to them when they have none. Owner and Support.
 */
import { useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { AdminTabs, Button, Input, MessageList, PillButton, Select, Textarea, ThreadListItem, UnderLink, useToast } from "@/components";
import { getCustomer, getOrder, getSavedReplies, getSupportThread, getSupportThreads, getWorkGuides, storeSetting, type FormatKey, type SupportThread } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { durationLabel, firstReplyMinutes } from "@/lib/metrics";
import { deleteReply, draftWithClaude, markThreadRead, reply, saveReply, setThreadStatus, startThread, swapGuideFormat } from "@/lib/client/admin/support";
import { cn } from "@/lib/cn";
import { parisDay, simNow } from "@/lib/clock";
import { adminDate, adminDateTime } from "@/lib/dates";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

type Tab = "Open" | "Done";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "09:12" today, "Yesterday", "Mon" this week, "Sep 24" before (simulated now, Paris time). */
function inboxWhen(iso: string): string {
  const day = (x: string) => Date.parse(`${x}T00:00:00Z`) / 86_400_000;
  const diff = Math.round(day(parisDay(simNow())) - day(parisDay(iso)));
  if (diff <= 0) return adminDateTime(iso).split(", ").at(-1)!;
  if (diff === 1) return "Yesterday";
  if (diff < 7) return DAYS[new Date(`${parisDay(iso)}T12:00:00Z`).getUTCDay()]!;
  return adminDate(iso);
}

/** List preview, as the board cuts it: 38 characters and an ellipsis. */
const preview = (t: SupportThread) => {
  const body = t.lastCustomerMessage?.body ?? "";
  return body.length > 38 ? `${body.slice(0, 38)}…` : body;
};

const firstName = (name: string | null, email: string) => (name ?? email).split(" ")[0]!;

export function SupportPage() {
  const params = useSearchParams();
  const { desktop } = useAdmin();
  const [tabChoice, setTab] = useState<Tab | null>(null);
  const [cur, setCur] = useState<string | null>(params.get("thread"));
  /** Set once the admin picks a thread: the ?customer= arrival no longer applies. */
  const [arrived, setArrived] = useState(false);
  const [picked, setPicked] = useState(false);
  const threads = useAdminQuery(() => getSupportThreads(), []);
  const all = useMemo(() => threads.data ?? [], [threads.data]);

  // ?customer=&about= (Reviews › "Reply privately", an order's email): that customer's latest thread, or
  // a first message to them; `new=1` (Customers › "Write to") always starts a new one; `review=` quotes it.
  const customerId = params.get("customer");
  const about = params.get("about");
  const fresh = params.get("new") === "1";
  const reviewId = params.get("review");
  const customer = useAdminQuery(() => (customerId ? getCustomer(customerId) : Promise.resolve(null)), [customerId]);
  const arrivalThread = !arrived && customerId && !fresh ? all.find((t) => t.customerId === customerId) : undefined;
  const review = reviewId ? customer.data?.reviews.find((r) => r.id === reviewId) : undefined;
  const compose =
    !arrived && customerId && threads.status === "ready" && !arrivalThread && customer.data
      ? {
          customerId: customer.data.id,
          name: customer.data.fullName,
          subject: about?.startsWith("#") ? `About your order ${about}` : about ? `Your review of ${about}` : "A note from Geste",
          draft: review ? `Hi ${customer.data.fullName.split(" ")[0]},\n\nThank you for your review of ${review.work.number}: “${review.body}”\n\n` : "",
        }
      : null;

  const target = cur ? all.find((t) => t.id === cur) : arrivalThread;
  // ?status=unread (the sidebar's count: threads not opened since the customer wrote), open, done.
  const status = params.get("status");
  const [showAll, setShowAll] = useState(false);
  const unreadOnly = status === "unread" && !showAll && !tabChoice;
  const tab: Tab = tabChoice ?? (target?.status === "done" || status === "done" ? "Done" : "Open");
  // Open threads: the longest waiting first (overdue ones on top).
  const list = all
    .filter((t) => (tab === "Open" ? t.status === "open" : t.status === "done"))
    .filter((t) => !unreadOnly || t.unread)
    .sort((a, b) => (tab === "Open" ? (a.lastCustomerMessage?.at ?? a.createdAt).localeCompare(b.lastCustomerMessage?.at ?? b.createdAt) : 0));
  // Nothing chosen yet: the first thread of the list (not marked read until clicked).
  const currentId = compose ? null : (cur ?? arrivalThread?.id ?? list[0]?.id ?? null);

  const open = (t: SupportThread) => {
    // From now on the tab only changes when clicked (closing a thread keeps the list where it is).
    setTab(tab);
    setArrived(true);
    setCur(t.id);
    setPicked(true);
    if (t.unread) markThreadRead(t.id);
  };

  const listPane = (
    <div className={cn("flex flex-col", desktop && "border-r border-border")}>
      <div className="flex gap-16 px-14 py-10">
        <AdminTabs label="Threads" tabs={["Open", "Done"] as const} value={tab} onChange={setTab} />
      </div>
      {unreadOnly && (
        <p role="status" className="flex gap-8 px-14 pb-10">
          <span>New messages only.</span>
          <button type="button" onClick={() => setShowAll(true)} className="cursor-pointer underline underline-offset-3 hover:text-fg-muted">Show every open thread</button>
        </p>
      )}
      {threads.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col">
          {[0, 1, 2, 3].map((i) => <div key={i} className="min-h-97 border-b border-border bg-surface-muted" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="px-14 py-20 text-fg-muted">{tab === "Open" ? "Nothing waiting. Every customer has an answer." : "No closed conversation yet."}</p>
      ) : (
        <ul className="flex flex-col">
          {list.map((t) => (
              <li key={t.id}>
                <ThreadListItem
                  who={t.customerName ?? t.email}
                  when={t.lastCustomerMessage ? `${t.overdue ? "Overdue · " : ""}${inboxWhen(t.lastCustomerMessage.at)}` : ""}
                  subject={t.subject}
                  preview={preview(t)}
                  open={t.status === "open"}
                  unread={t.unread}
                  selected={t.id === currentId}
                  onSelect={() => open(t)}
                />
              </li>
          ))}
        </ul>
      )}
    </div>
  );

  const conversation = compose ? (
    <Compose key={compose.customerId} {...compose} onSent={(id) => { setArrived(true); setCur(id); setTab("Open"); }} />
  ) : currentId ? (
    <Conversation key={currentId} id={currentId} onStatusChange={() => setTab(tab)} />
  ) : (
    <div className="flex flex-col p-20 text-fg-muted">{threads.status === "ready" ? "Choose a conversation." : ""}</div>
  );

  const phoneView = compose || picked ? (
    <div className="flex flex-col gap-8">
      <button type="button" onClick={() => { setPicked(false); setArrived(true); }} className="inline-flex min-h-44 cursor-pointer items-center self-start hover:text-fg-muted">
        ← Inbox
      </button>
      <div className="flex min-h-560 flex-col border border-border bg-surface">{conversation}</div>
    </div>
  ) : (
    <>
      <h1 className="text-admin-title font-medium tracking-heading">Support inbox</h1>
      <div className="border border-border bg-surface">{listPane}</div>
    </>
  );

  return (
    <AdminPage
      title="Support inbox"
      subtitle={threads.status === "ready" ? `${all.filter((t) => t.status === "open").length} open · ${all.filter((t) => t.overdue).length} waiting over 24 h · replies from ${storeSetting("store.support_email")}` : undefined}
      breadcrumbs={[{ label: "Customers", href: "/admin/customers" }]}
      roles={["support"]}
      desktopHref="/admin/support"
      phone={phoneView}
    >
      <div className="grid min-h-702 grid-cols-[340px_1fr_280px] border border-border bg-surface">
        {listPane}
        {conversation}
      </div>
    </AdminPage>
  );
}

function Conversation({ id, onStatusChange }: { id: string; onStatusChange: () => void }) {
  const { desktop } = useAdmin();
  const toast = useToast();
  const thread = useAdminQuery(() => getSupportThread(id), [id]);
  const replies = useAdminQuery(getSavedReplies, []);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = thread.data;
  if (thread.status === "loading") return <div aria-busy="true" className="p-20" />;
  if (!t) return <div className="p-20 text-fg-muted">This conversation no longer exists.</div>;

  const send = async () => {
    if (!draft.trim()) {
      setError("Write a reply first.");
      return;
    }
    setBusy(true);
    try {
      await reply(t.id, draft);
      setDraft("");
      setError(null);
      toast.show(`Reply sent to ${firstName(t.customerName, t.email)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reply could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-14 p-20">
        <div className="flex items-start justify-between gap-12">
          <h2 className="font-medium tracking-normal">{t.subject}</h2>
          <PillButton onClick={() => { onStatusChange(); setThreadStatus(t.id, t.status === "open" ? "done" : "open"); }}>{t.status === "open" ? "Mark as done" : "Reopen"}</PillButton>
        </div>
        <MessageList messages={t.messages} />
        <PillButton
          className="self-start"
          onClick={() =>
            draftWithClaude(t.id).then(
              (text) => {
                setDraft(text);
                toast.show("Draft written · read it before sending");
              },
              (e) => toast.show(e instanceof Error ? e.message : "Claude could not draft.", { tone: "danger" }),
            )
          }
        >
          Draft with Claude
        </PillButton>
        <ReplyBox
          draft={draft}
          setDraft={(v) => {
            setDraft(v);
            if (error && v.trim()) setError(null);
          }}
          error={error}
          busy={busy}
          onSend={send}
          replies={(replies.data ?? []).map((r) => ({ id: r.id, name: r.name, text: r.body.replace("{name}", firstName(t.customerName, t.email)) }))}
          // A draft can become a saved reply: the customer's first name turns back into {name}.
          onSaveReply={async (name) => {
            try {
              await saveReply(name, draft.split(firstName(t.customerName, t.email)).join("{name}"));
              toast.show(`Saved reply “${name}” added`);
            } catch (e) {
              toast.show(e instanceof Error ? e.message : "Could not save the reply.", { tone: "danger" });
            }
          }}
          onDeleteReply={async (id, name) => {
            await deleteReply(id, name);
            toast.show(`Saved reply “${name}” removed`);
          }}
        />
      </div>
      {desktop ? <Aside name={t.customerName ?? t.email} customerId={t.customerId} orderNumber={t.orderNumber} /> : null}
    </>
  );
}

function ReplyBox({ draft, setDraft, error, busy, onSend, replies, onSaveReply, onDeleteReply }: {
  draft: string;
  setDraft: (v: string) => void;
  error: string | null;
  busy: boolean;
  onSend: () => void;
  replies: Array<{ id: string; name: string; text: string }>;
  onSaveReply?: (name: string) => Promise<void>;
  onDeleteReply?: (id: string, name: string) => Promise<void>;
}) {
  const id = useId();
  const nameId = useId();
  const [managing, setManaging] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  return (
    <form
      className="mt-auto flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      {replies.length > 0 && (
        <div className="flex flex-wrap gap-6">
          <span className="text-fg-muted">Saved replies:</span>
          {replies.map((r) =>
            managing && onDeleteReply ? (
              <PillButton key={r.id} onClick={() => void onDeleteReply(r.id, r.name)} aria-label={`Remove saved reply ${r.name}`}>{r.name} ✕</PillButton>
            ) : (
              <PillButton key={r.id} onClick={() => setDraft(r.text)}>{r.name}</PillButton>
            ),
          )}
          {onDeleteReply && <PillButton pressed={managing} onClick={() => setManaging((m) => !m)}>{managing ? "Done" : "Edit"}</PillButton>}
          {managing && <span className="w-full text-fg-muted">Click a saved reply to remove it.</span>}
        </div>
      )}
      <label htmlFor={id} className="sr-only">Reply</label>
      <Textarea
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        invalid={!!error}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="min-h-110 resize-y"
      />
      {error && <p id={`${id}-err`} role="alert" className="text-danger">{error}</p>}
      {naming !== null && onSaveReply && (
        <div className="flex items-end gap-8">
          <label htmlFor={nameId} className="sr-only">Name of the saved reply</label>
          <Input id={nameId} value={naming} placeholder="Name of the saved reply" onChange={(e) => setNaming(e.target.value)} className="grow" />
          <PillButton onClick={() => { if (naming.trim()) void onSaveReply(naming.trim()).then(() => setNaming(null)); }}>Save</PillButton>
          <PillButton onClick={() => setNaming(null)}>Cancel</PillButton>
        </div>
      )}
      <div className="flex justify-end gap-8">
        {onSaveReply && naming === null && draft.trim() && (
          <Button type="button" variant="ghost" onClick={() => setNaming(draft.trim().split(/\s+/).slice(0, 3).join(" "))}>Save as saved reply</Button>
        )}
        <Button type="submit" trailing="→" loading={busy} className="min-w-180">Send reply</Button>
      </div>
    </form>
  );
}

function Aside({ name, customerId, orderNumber }: { name: string; customerId: string | null; orderNumber: string | null }) {
  const firstReply = firstReplyMinutes();
  return (
    <div className="flex flex-col gap-10 border-l border-border p-20">
      <span className="font-medium">{name}</span>
      {customerId && <UnderLink href={`/admin/customers/detail/?id=${customerId}`} className="self-start">Customer profile</UnderLink>}
      {orderNumber && <UnderLink href={`/admin/orders/detail?number=${orderNumber}`} className="self-start">Order #{orderNumber}</UnderLink>}
      {orderNumber && <GuideSwap orderNumber={orderNumber} />}
      <span className="text-fg-muted">Replies go out from {storeSetting("store.support_email")}. {firstReply === null ? "No reply this week yet." : `Average first reply this week: ${durationLabel(firstReply)}.`}</span>
    </div>
  );
}

/** "Switch the guide" (the Format swap saved reply's action): the same work and level on another canvas. */
function GuideSwap({ orderNumber }: { orderNumber: string }) {
  const toast = useToast();
  const id = useId();
  const order = useAdminQuery(() => getOrder(orderNumber), [orderNumber]);
  const guide = order.data?.items.find((i) => i.kind === "guide" && !i.accessRevoked);
  const options = useAdminQuery(() => (guide?.workId ? getWorkGuides(guide.workId) : Promise.resolve([])), [guide?.workId]);
  const [format, setFormat] = useState<FormatKey | "">("");
  if (!guide?.workId || !options.data?.length) return null;
  const current = options.data.find((g) => g.id === guide.guideId);
  const formats = options.data.filter((g) => g.level === current?.level && g.id !== guide.guideId);
  if (!current || !formats.length) return null;
  return (
    <div className="flex flex-col gap-6">
      <label htmlFor={id} className="text-fg-muted">Guide · {current.label}</label>
      <Select id={id} value={format} onChange={(e) => setFormat(e.target.value as FormatKey)}>
        <option value="">Switch to another canvas…</option>
        {formats.map((g) => <option key={g.id} value={g.format}>{g.label}</option>)}
      </Select>
      <PillButton
        disabled={!format}
        onClick={async () => {
          if (!format) return;
          try {
            toast.show(`Guide switched to ${await swapGuideFormat(orderNumber, guide.id, format)}`);
            setFormat("");
          } catch (e) {
            toast.show(e instanceof Error ? e.message : "Could not switch the guide.", { tone: "danger" });
          }
        }}
      >
        Switch the guide
      </PillButton>
    </div>
  );
}

/** First message to a customer with no thread yet. */
function Compose({ customerId, name, subject, draft: initial = "", onSent }: { customerId: string; name: string; subject: string; draft?: string; onSent: (threadId: string) => void }) {
  const { desktop } = useAdmin();
  const toast = useToast();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!draft.trim()) {
      setError("Write a reply first.");
      return;
    }
    setBusy(true);
    try {
      const id = await startThread(customerId, subject, draft);
      toast.show(`Message sent to ${name.split(" ")[0]}`);
      onSent(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The message could not be sent.");
      setBusy(false);
    }
  };
  return (
    <>
      <div className="flex flex-col gap-14 p-20">
        <h2 className="font-medium tracking-normal">{subject}</h2>
        <p className="text-fg-muted">New conversation with {name}. They get it by email and can answer from there.</p>
        <ReplyBox draft={draft} setDraft={(v) => { setDraft(v); if (error && v.trim()) setError(null); }} error={error} busy={busy} onSend={send} replies={[]} />
      </div>
      {desktop ? <Aside name={name} customerId={customerId} orderNumber={null} /> : null}
    </>
  );
}
