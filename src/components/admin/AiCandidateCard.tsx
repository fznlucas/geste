import Link from "next/link";
import Image from "next/image";
import { Button } from "../primitives/Button";
import { PillButton } from "./AdminUI";
import { cn } from "@/lib/cn";

/**
 * 8 px Mist track with an Ink fill whose end is rounded 3 px (AdminAIPipeline: job progress, GPU budget;
 * AdminEditions sold/edition). role=progressbar with its value.
 */
export function AdminMeter({ pct, label, className }: { pct: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} className={cn("relative block h-8 bg-surface-muted", className)}>
      <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${v}%` }} />
    </span>
  );
}

export interface AiCandidateCardProps {
  /** Approved: the draft work it became ("→ Works (draft)" links to its editor). */
  workHref?: string | null;
  id: string;
  imageUrl: string;
  similarity: number;
  strokes: number;
  layers: number;
  /** "Beginner-friendly", "Too many strokes for level" */
  note: string;
  /** The note is a warning: Signal (the words carry it too). */
  warning?: boolean;
  status: "pending" | "approved" | "rejected";
  busy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

/**
 * A candidate to validate (AdminAIPipeline): 4:5 image, id + similarity, strokes · layers, note, then
 * Approve (Ink, 32 px) + ✕ pill; once decided, the verdict ("✓ Approved → Works (draft)", "✕ Rejected",
 * the rejected card's image at 40 % and its text Stone: the board fades the whole card, which fails contrast).
 */
export function AiCandidateCard({ id, imageUrl, similarity, strokes, layers, note, warning, status, busy, onApprove, onReject, workHref }: AiCandidateCardProps) {
  return (
    <li className={cn("flex flex-col gap-6", status === "rejected" && "text-fg-muted")}>
      <span className={cn("relative block aspect-[4/5] w-full", status === "rejected" && "opacity-40")}>
        <Image src={imageUrl} alt={`Candidate ${id}`} fill sizes="(min-width: 1200px) 130px, 45vw" className="object-cover" />
      </span>
      <span className="flex justify-between">
        <span>{id}</span>
        <span>{similarity}%</span>
      </span>
      <span className="text-fg-muted">{strokes} strokes · {layers} layers</span>
      <span className={warning && status !== "rejected" ? "text-danger" : "text-fg-muted"}>{note}</span>
      {status === "pending" ? (
        <span className="flex gap-6">
          <Button size="sm" className="grow justify-center!" onClick={onApprove} disabled={busy} aria-label={`Approve ${id}`}>
            Approve
          </Button>
          <PillButton onClick={onReject} disabled={busy} aria-label={`Reject ${id}`}>✕</PillButton>
        </span>
      ) : (
        status === "approved" && workHref ? (
          <Link href={workHref} className="self-start underline underline-offset-3 hover:text-fg-muted">✓ Approved → Works (draft)</Link>
        ) : (
          <span>{status === "approved" ? "✓ Approved → Works (draft)" : "✕ Rejected"}</span>
        )
      )}
    </li>
  );
}
