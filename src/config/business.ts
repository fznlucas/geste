/**
 * Business rules of the books (docs/admin-v2/02): a French micro-entreprise keeping its books in EUR,
 * excluding VAT. Every value says where it comes from; **every one is to confirm with the accountant**
 * (Settings › Payments & tax shows them so). Read by the ledger, the metrics and the simulation.
 * Money in EUR cents unless the name says otherwise; rates in percent.
 */

export type UrssafCategory = "sales_goods" | "services_bic" | "services_bnc";
export type VatRegime = "collect" | "franchise";

/** One value and where it comes from. */
const v = <T>(value: T, source: string) => ({ value, source, confirm: true as const });

export const BUSINESS = {
  /** `collect` = today's store (VAT included and shown); `franchise` = "TVA non applicable, art. 293 B du CGI". Settings › Payments & tax. */
  vatRegime: v<VatRegime>("collect", "spec 02 §5: initial value = the store's behaviour today"),
  /** OSS registration (destination VAT for EU consumers): "To do" in Settings. */
  ossRegistered: v(false, "Settings › Payments & tax: OSS registration To do"),

  categories: {
    guides: v<UrssafCategory>("services_bic", "sale of digital content, BIC services (spec 02 §2; confirm)"),
    prints: v<UrssafCategory>("sales_goods", "sale of goods (spec 02 §2)"),
    shipping: v<UrssafCategory>("sales_goods", "shipping follows the prints (spec 02 §2)"),
    affiliate: v<UrssafCategory>("services_bnc", "commission, BNC by default (spec 02 §2; BIC if commercial brokerage)"),
    breakage: v<UrssafCategory>("services_bic", "expired gift cards, estimate (confirm)"),
  },

  fees: {
    stripeEea: v({ pct: 1.5, fixedCents: 25 }, "Stripe pricing FR, standard EEA cards (checked Oct 2026)"),
    stripeEeaPremium: v({ pct: 2.8, fixedCents: 25 }, "Stripe pricing FR, premium EEA cards"),
    stripeUk: v({ pct: 2.5, fixedCents: 25 }, "Stripe pricing FR, UK cards"),
    stripeIntl: v({ pct: 3.15, fixedCents: 25 }, "Stripe pricing FR, international cards"),
    paypal: v({ pct: 2.9, fixedCents: 35 }, "PayPal via Stripe, estimate (confirm with your PayPal pricing)"),
    currencyConversionPct: v(2, "Stripe: conversion of USD charges settled in EUR"),
    stripeTaxPct: v(0.5, "Stripe Tax per transaction, only when VAT regime = collect"),
    disputeCents: v(2000, "Stripe dispute fee"),
  },

  /** USD → EUR: base rate and a deterministic daily drift; the live adapter reads Stripe's balance transaction rate. */
  fx: v({ eurPerUsd: 0.86, dailyDriftPct: 0.3 }, "ECB reference rate, autumn 2026, estimate (confirm)"),

  thresholds: {
    franchiseGoods: v({ limitCents: 8_500_000, toleranceCents: 9_350_000 }, "VAT franchise, sales of goods, 2026"),
    franchiseServices: v({ limitCents: 3_750_000, toleranceCents: 4_125_000 }, "VAT franchise, services, 2026"),
    euCrossBorder: v({ limitCents: 1_000_000 }, "EU B2C distance sales + digital services, all EU countries together"),
    microGoods: v({ limitCents: 20_310_000 }, "micro-entreprise ceiling, sales of goods (total)"),
    microServices: v({ limitCents: 8_360_000 }, "micro-entreprise ceiling, services (within the total)"),
    alertPct: v(80, "spec 02 §5"),
  },

  urssaf: {
    /** Social contributions by category, 2026. */
    ratesPct: v<Record<UrssafCategory, number>>({ sales_goods: 12.3, services_bic: 21.2, services_bnc: 25.6 }, "URSSAF micro-entrepreneur rates 2026"),
    /** Contribution à la formation professionnelle (commerçant: 0.1 % on services BIC; artisan would be 0.3 %). */
    cfpPct: v<Record<UrssafCategory, number>>({ sales_goods: 0.1, services_bic: 0.1, services_bnc: 0.2 }, "CFP 2026, commerçant (confirm: artisan 0.3 %)"),
    /** Versement libératoire de l'impôt sur le revenu, if the option is taken. */
    vlPct: v<Record<UrssafCategory, number>>({ sales_goods: 1, services_bic: 1.7, services_bnc: 2.2 }, "versement libératoire 2026"),
    versementLiberatoire: v(false, "option not taken (confirm)"),
    acre: v(false, "ACRE first-year reduction, off by default (spec 02 §6)"),
    frequency: v<"monthly" | "quarterly">("quarterly", "declaration frequency (spec 02 §6)"),
  },

  /** VAT returns (CA3): how often, and the due day of the month after the period. */
  vatReturns: v<{ frequency: "monthly" | "quarterly"; dueDay: number }>({ frequency: "quarterly", dueDay: 24 }, "CA3 return, quarterly while VAT due is small; due date estimate (confirm with your tax office calendar)"),
  giftCardExpiryYears: v(2, "gift card validity, estimate (confirm)"),
  payouts: v({ availableAfterDays: 7, weekday: 4 /* Friday, 0 = Monday */, arrivalDays: 2 }, "Stripe payout schedule: weekly on Friday, funds available after 7 days"),
  bank: v({ openingCents: 0, monthlyFeeCents: 900, feeDay: 1 }, "business account, Qonto-like, estimate (confirm)"),

  costs: {
    /** Paper and ink per copy, by size. */
    printProduction: v({ S: 480, M: 850, L: 1300 }, "cotton paper + pigment ink per copy, estimate (confirm)"),
    /** Tube, caps, certificate card, per shipment. */
    packagingCents: v(240, "tube + caps + certificate card, estimate (confirm)"),
    /** Boxtal label price by carrier and zone. */
    labels: v({ mondial_relay: { FR: 420, EU: 420, INTL: 420 }, colissimo: { FR: 750, EU: 1650, INTL: 2450 }, chronopost: { FR: 1250, EU: 2600, INTL: 3400 } }, "Boxtal price grid, estimate (confirm)"),
    /** Subscriptions, EUR per month, billed on `day`. */
    software: v([
      { vendor: "Domain (geste.studio)", cents: 150, day: 1 },
      { vendor: "Vercel", cents: 1900, day: 3 },
      { vendor: "Supabase", cents: 2400, day: 5 },
      { vendor: "Resend", cents: 1900, day: 7 },
      { vendor: "Claude", cents: 1900, day: 10 },
      { vendor: "Plausible", cents: 900, day: 12 },
      { vendor: "Mux", cents: 0, day: 15 },
      { vendor: "PostHog", cents: 0, day: 15 },
    ], "list prices, autumn 2026, estimate (confirm)"),
    /** Canvases and paints for studio tests: per new work, and a monthly restock. */
    studioMaterials: v({ perWorkCents: 6000, monthlyCents: 4000, day: 20 }, "canvases and paints, estimate (confirm)"),
    adsMonthlyCents: v(0, "no paid campaigns (spec 02 §2)"),
  },

  /** Who prints the copies (Settings › Shipping): the studio's printer, or an external lab that sends them back printed. */
  printLab: v<{ mode: "in_house" | "external"; name: string; turnaroundWorkingDays: number }>({ mode: "in_house", name: "Atelier Tirage, Paris", turnaroundWorkingDays: 2 }, "lab name and turnaround, estimate (confirm with the lab)"),

  /**
   * Supplies counted at the studio (Fulfilment › Supplies): stock at launch, the level that asks for a
   * reorder, the usual reorder and its price, the supplier's delay. Paper and certificates are used when a
   * copy is printed (paper only in-house), a tube when a parcel gets its label.
   */
  supplies: v({
    supplier: { name: "Papeterie Lemaire", email: "orders@papeterie-lemaire.example" },
    items: {
      tubes: { label: "Tubes", opening: 55, reorderAt: 10, reorderQty: 50, unitCents: 180, leadDays: 4 },
      paper_s: { label: "Paper S", opening: 80, reorderAt: 20, reorderQty: 100, unitCents: 210, leadDays: 6 },
      paper_m: { label: "Paper M", opening: 40, reorderAt: 10, reorderQty: 50, unitCents: 390, leadDays: 6 },
      paper_l: { label: "Paper L", opening: 25, reorderAt: 6, reorderQty: 25, unitCents: 640, leadDays: 6 },
      certificates: { label: "Certificates", opening: 200, reorderAt: 40, reorderQty: 200, unitCents: 35, leadDays: 8 },
    },
  }, "stock at launch, reorder levels, prices and delays: estimates (confirm with the supplier)"),
} as const;

export type Business = typeof BUSINESS;
