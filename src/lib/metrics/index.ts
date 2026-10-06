/**
 * Every number of the admin (docs/admin-v2: "one source per number"). Pages read figures here, rows
 * through `@/lib/api`, browser state through `@/lib/client`. Each metric carries its `definition`.
 */
export { metric, type Metric } from "./define";
export { calendarMonth, dayLabel, daysOf, inPeriod, periodDays, periodLabel, previousPeriod, rollingDays, type Period } from "./period";
export { ORDER_TABS, inOrderTab, orderTab, ordersThisMonth } from "./orders";
export { orderMoney, type OrderMoney } from "./order-money";
export { alertWhen, alerts, isLowStock, lowEdition, nextPickupLabel, pickup, setAiToReviewSource, todoCounts, todoItems, type AdminAlert, type AdminCounts, type TodoItem } from "./todo";
export { DASHBOARD_DEFINITIONS, adminDay, dashboard, type Dashboard, type DashboardDay, type DashboardTopWork } from "./dashboard";
export { ANALYTICS_DEFINITIONS, ANALYTICS_RANGES, SMALL_SAMPLE_READERS, analytics, type Analytics, type AnalyticsRange } from "./analytics";
export {
  FINANCE_DEFINITIONS, cash, finance, financeCsv, financeFec, financePeriod, financePeriodLabel, financePeriodOptions, financePeriodSlug, ledgerLines, storeTurnoverEurCents, thresholds,
  type Cash, type Finance, type PnlRow, type Threshold,
} from "./finance";
export type { LedgerAccount, LedgerLine, Payout, UrssafDeclaration, VatReturn } from "@/lib/ledger";
export { durationLabel, firstReplyMinutes } from "./support";
export {
  INTEGRATIONS, INTEGRATION_ROWS, PAYMENT_ROWS, businessAssumptions, integrationLogs, modeCounts, outbox, simulationAssumptions, simulationStatus, statusOf, vatRegimeNow,
  type Integration, type IntegrationLog, type OutboxEmail,
} from "./integrations";
