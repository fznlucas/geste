import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Support inbox and reviews pieces (AdminSupport, AdminReviews).
 */

export interface ThreadListItemProps {
  who: string;
  /** "09:12", "Yesterday", "Mon" */
  when: string;
  subject: string;
  /** Customer's last message, cut at 38 characters. */
  preview: string;
  /** Open threads are medium weight, done ones regular. */
  open: boolean;
  /** Not opened by staff since the customer wrote (announced to screen readers). */
  unread?: boolean;
  selected?: boolean;
  onSelect: () => void;
}

/** One inbox row: name + time, subject, preview (Stone). 97 px tall (72 px content + 12 px padding + rule, as measured on the board). Selected: #F4F1ED. */
export function ThreadListItem({ who, when, subject, preview, open, unread, selected, onSelect }: ThreadListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex min-h-97 w-full cursor-pointer flex-col items-stretch gap-2 border-b border-border px-14 py-12 text-left font-mono text-xs",
        "focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg",
        selected ? "bg-surface-hover" : "bg-surface hover:bg-surface-hover",
      )}
    >
      <span className="flex justify-between gap-8">
        <span className={open ? "font-medium" : undefined}>
          {who}
          {unread && <span className="sr-only"> · new</span>}
        </span>
        <span className="text-fg-muted">{when}</span>
      </span>
      <span>{subject}</span>
      <span className="text-fg-muted">{preview}</span>
    </button>
  );
}

export interface MessageItem {
  id: string;
  from: "customer" | "staff";
  body: string;
  staffName: string | null;
}

/** Conversation: customer messages on Mist at the left, staff replies on Ink at the right, 80 % wide at most. */
export function MessageList({ messages }: { messages: MessageItem[] }) {
  return (
    <ol aria-label="Messages" className="flex flex-col gap-14">
      {messages.map((m) => (
        <li key={m.id} className={cn("max-w-[80%] whitespace-pre-wrap px-14 py-12", m.from === "customer" ? "self-start bg-surface-muted" : "self-end bg-fg text-fg-inverse")}>
          <span className="sr-only">{m.from === "customer" ? "Customer: " : `${m.staffName ?? "Geste"}: `}</span>
          {m.body}
        </li>
      ))}
    </ol>
  );
}

export interface ReviewCardProps {
  who: string;
  /** "N°01" */
  work: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  photoUrl: string | null;
  /** Pending: Approve / Feature / Hide. Decided: the verdict line in Stone ("Published · featured on home"), then its own actions (Unfeature, Hide, Publish). */
  actions?: ReactNode;
  verdict?: string;
  /** "Reply privately" link, when the role can open the inbox. */
  reply?: ReactNode;
}

/** Review card (AdminReviews): 4:5 photo, name · work and stars, the quote, then actions or verdict, then "Reply privately". */
export function ReviewCard({ who, work, rating, body, photoUrl, actions, verdict, reply }: ReviewCardProps) {
  return (
    <li className="flex flex-col gap-14 border border-border bg-surface p-14">
      {photoUrl && (
        <Image src={photoUrl} alt={`${who}’s painting of ${work}`} width={400} height={500} sizes="(min-width: 768px) 25vw, 100vw" className="block aspect-[4/5] w-full object-cover" />
      )}
      <span className="flex justify-between gap-8">
        <span>{who} · {work}</span>
        <span role="img" aria-label={`${rating} out of 5`}>{"★".repeat(rating) + "☆".repeat(5 - rating)}</span>
      </span>
      <span>“{body}”</span>
      {verdict && <span className="text-fg-muted">{verdict}</span>}
      {actions}
      {reply}
    </li>
  );
}
