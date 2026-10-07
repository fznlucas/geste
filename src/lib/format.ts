/** Money is stored in integer cents (USD). */
export function formatPrice(cents: number, locale: "en" | "fr" = "en", currency = "USD"): string {
  const v = cents / 100;
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
  }).format(v);
}

/** Money in admin tables: always two decimals, so the column lines up ("$80.00", "€12.40"). */
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/** "from $15" style label used on work cards. */
export function fromPrice(cents: number, locale: "en" | "fr" = "en"): string {
  return (locale === "fr" ? "dès " : "from ") + formatPrice(cents, locale);
}

/** 1830 -> "30:30" for the drying timer. */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
