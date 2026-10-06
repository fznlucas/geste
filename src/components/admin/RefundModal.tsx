"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Modal } from "../overlay/Modal";
import { Button } from "../primitives/Button";
import { Field } from "../primitives/Field";
import { Select } from "../primitives/Input";

export interface RefundChoice {
  key: string;
  label: string;
  amountCents: number;
  /** Why the signed-in role cannot make this one ("The guide was opened: only the owner can take it back."). */
  blocked?: string | null;
}

export interface RefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "GS-2041" */
  orderNumber: string;
  options: RefundChoice[];
  reasons: readonly string[];
  /** "Put edition 12/50 back in stock"; null when the order has no print. */
  restockLabel: string | null;
  /** The largest amount the signed-in role may refund (Support: $50). */
  limitCents: number;
  onConfirm: (input: { option: string; reason: string; restock: boolean }) => Promise<void>;
}

/**
 * AdminOrderDetail refund dialog: the choices as 40 px outline rows (selected = Ink border, amount at
 * the right), the reason sent to the customer, restock, Cancel + a Signal "Refund $51  →".
 * Above the role's limit, or when the choice is blocked for the role, the confirm is disabled and says why.
 */
export function RefundModal(props: RefundModalProps) {
  // Mounted on open: every opening starts from the first choice, no leftover error.
  return props.open ? <RefundDialog {...props} /> : null;
}

function RefundDialog({ open, onOpenChange, orderNumber, options, reasons, restockLabel, limitCents, onConfirm }: RefundModalProps) {
  const [choice, setChoice] = useState(options[0]?.key ?? "full");
  const [reason, setReason] = useState<string>(reasons[0] ?? "");
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const picked = options.find((o) => o.key === choice) ?? options[0];
  const over = !!picked && picked.amountCents > limitCents;
  const blocked = picked?.blocked ?? (over ? `Support can refund up to ${formatPrice(limitCents)}. Ask the owner for this one.` : null);
  const confirm = async () => {
    if (!picked || blocked) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ option: picked.key, reason, restock: restockLabel !== null && restock && picked.key !== "guide" });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The refund failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Refund #${orderNumber}`}
      tone="danger"
      width={508}
      placement="admin"
      actions={
        <>
          <Button variant="ghost" className="grow" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="danger-solid" className="grow-2" style={{ gap: 0 }} trailing="→" loading={busy} disabled={!picked || !!blocked} onClick={confirm}>
            Refund {picked ? formatPrice(picked.amountCents) : ""}
          </Button>
        </>
      }
    >
      <div role="group" aria-label="What to refund" className="flex flex-col gap-6">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={o.key === picked?.key}
            onClick={() => setChoice(o.key)}
            className={cn(
              "flex min-h-42 cursor-pointer items-center justify-between border px-10 font-mono text-xs",
              "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg",
              o.key === picked?.key ? "border-fg" : "border-border-field hover:border-fg",
            )}
          >
            <span>{o.label}</span>
            <span className="tabular-nums">{formatPrice(o.amountCents)}</span>
          </button>
        ))}
      </div>
      <Field label="Reason — sent to the customer">
        <Select value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-45">
          {reasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
      {restockLabel && picked?.key !== "guide" && (
        <label className="flex cursor-pointer items-center gap-8">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="accent-fg" />
          <span>{restockLabel}</span>
        </label>
      )}
      {blocked && <p role="alert" className="text-danger">{blocked}</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
    </Modal>
  );
}
