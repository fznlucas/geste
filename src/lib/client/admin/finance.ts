"use client";

/**
 * Finance actions (owner only, docs/admin-v2/02 §6): URSSAF declarations marked as declared or paid,
 * exports. Each writes the admin overlay and an audit line; a paid declaration becomes its tax and bank
 * lines in the ledger (src/lib/ledger), and the simulation no longer handles that period.
 */
import { adminNow, audit, patchRow, requireStaff } from "../admin";

export class FinanceStateError extends Error {}

/** "Mark as declared": the period's figures were declared on autoentrepreneur.urssaf.fr. */
export function markUrssafDeclared(key: string, label: string, status: string) {
  const staff = requireStaff("owner");
  if (status === "in_progress") throw new FinanceStateError(`${label} is not over yet.`);
  if (status === "declared" || status === "paid") throw new FinanceStateError(`${label} is already ${status}.`);
  patchRow("urssaf_declarations", key, { declaredAt: adminNow() }, { action: "urssaf.declare", target: `urssaf:${key}`, summary: `${staff.fullName} marked the URSSAF declaration of ${label} as declared` });
}

/** "Mark as paid": the contributions left the bank (declared at the same time if it was not). */
export function markUrssafPaid(key: string, label: string, status: string, totalCents: number) {
  const staff = requireStaff("owner");
  if (status === "in_progress") throw new FinanceStateError(`${label} is not over yet.`);
  if (status === "paid") throw new FinanceStateError(`${label} is already paid.`);
  const at = adminNow();
  patchRow("urssaf_declarations", key, { paidAt: at, ...(status === "declared" ? {} : { declaredAt: at }) }, {
    action: "urssaf.pay", target: `urssaf:${key}`, summary: `${staff.fullName} marked the URSSAF payment of ${label} as paid · €${(totalCents / 100).toFixed(2)}`,
  });
}

/** An export of the books for the accountant (CSV or FEC), for the audit log. */
export function exportBooks(period: string, kind: "CSV" | "FEC") {
  const staff = requireStaff("owner");
  audit({ action: "finance.export", target: `finance:${period}`, summary: `${staff.fullName} exported the ${period} books (${kind})` });
}

/** "Mark as declared" on a VAT return (CA3 filed on impots.gouv.fr). */
export function markVatDeclared(key: string, label: string, status: string) {
  const staff = requireStaff("owner");
  if (status === "in_progress") throw new FinanceStateError(`${label} is not over yet.`);
  if (status === "declared" || status === "paid") throw new FinanceStateError(`${label} is already ${status}.`);
  patchRow("vat_returns", key, { declaredAt: adminNow() }, { action: "vat.declare", target: `vat:${key}`, summary: `${staff.fullName} marked the VAT return of ${label} as filed` });
}

/** "Mark as paid" on a VAT return: the VAT left the bank (filed at the same time if it was not). */
export function markVatPaid(key: string, label: string, status: string, amountCents: number) {
  const staff = requireStaff("owner");
  if (status === "in_progress") throw new FinanceStateError(`${label} is not over yet.`);
  if (status === "paid") throw new FinanceStateError(`${label} is already paid.`);
  const at = adminNow();
  patchRow("vat_returns", key, { paidAt: at, ...(status === "declared" ? {} : { declaredAt: at }) }, {
    action: "vat.pay", target: `vat:${key}`, summary: `${staff.fullName} marked the VAT of ${label} as paid · €${(amountCents / 100).toFixed(2)}`,
  });
}
