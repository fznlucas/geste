/**
 * Analytics and finance (owner only). The figures are computed in `@/lib/metrics/analytics` and
 * `@/lib/metrics/finance` (docs/admin-v2: one source per number); these reads keep their signatures.
 */
export { analytics as getAnalytics, ANALYTICS_RANGES, type Analytics, type AnalyticsRange } from "@/lib/metrics/analytics";
export { finance as getFinance, financeCsv, type Finance, type PnlRow } from "@/lib/metrics/finance";
