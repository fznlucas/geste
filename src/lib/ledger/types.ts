/**
 * The books (docs/admin-v2/02 §1): every money event of the business as ledger lines, in EUR cents
 * excluding VAT. Lines are derived from the rows by pure functions (./derive.ts) and never stored, so
 * they cannot drift from the orders, refunds, shipments, payouts and expenses they come from.
 * Sign: + income or asset, − cost or outflow; a liability grows with +.
 */
import type { UrssafCategory } from "@/config/business";

export type LedgerAccount =
  | "revenue.guides" | "revenue.prints" | "revenue.shipping" | "revenue.giftcards_redeemed" | "revenue.giftcards_breakage" | "revenue.affiliate"
  | "refunds.guides" | "refunds.prints" | "refunds.shipping"
  | "liability.giftcards" | "liability.vat"
  | "cost.print_production" | "cost.packaging" | "cost.shipping_labels" | "cost.payment_fees" | "cost.fx"
  | "cost.gpu" | "cost.software" | "cost.studio_materials" | "cost.ads" | "cost.bank"
  | "tax.urssaf" | "tax.cfp" | "tax.versement_liberatoire"
  | "cash.stripe_balance" | "cash.bank";

export interface LedgerLine {
  id: string;
  /** ISO instant; its business day is the Paris day. */
  at: string;
  account: LedgerAccount;
  amountEurCents: number;
  /** The original amount when charged in USD, and the rate used. */
  amountUsdCents?: number;
  fxRate?: number;
  /** URSSAF category of revenue and refund lines. */
  category: UrssafCategory | "none";
  /** VAT lines: the country whose rate applies. */
  country?: string;
  /** Stripe balance lines: when the money becomes available for a payout. */
  availableAt?: string;
  sourceTable: string;
  sourceId: string;
  memo: string;
}

/** Revenue accounts that make the turnover (chiffre d'affaires, cash basis). */
export const TURNOVER_ACCOUNTS: ReadonlyArray<LedgerAccount> = [
  "revenue.guides", "revenue.prints", "revenue.shipping", "revenue.giftcards_redeemed", "revenue.giftcards_breakage", "revenue.affiliate",
  "refunds.guides", "refunds.prints", "refunds.shipping",
];

/** The store's own sales (orders, refunds, gift cards used): the dashboard's "Revenue". */
export const STORE_ACCOUNTS: ReadonlyArray<LedgerAccount> = [
  "revenue.guides", "revenue.prints", "revenue.shipping", "revenue.giftcards_redeemed", "refunds.guides", "refunds.prints", "refunds.shipping",
];

export const DIRECT_COST_ACCOUNTS: ReadonlyArray<LedgerAccount> = ["cost.print_production", "cost.packaging", "cost.shipping_labels", "cost.payment_fees", "cost.fx"];
export const OVERHEAD_ACCOUNTS: ReadonlyArray<LedgerAccount> = ["cost.gpu", "cost.software", "cost.ads", "cost.studio_materials", "cost.bank"];
