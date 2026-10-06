/**
 * Every number of the admin (docs/admin-v2: "one source per number"). Pages read figures here, rows
 * through `@/lib/api`, browser state through `@/lib/client`. Each metric carries its `definition`.
 */
export { metric, type Metric } from "./define";
export { calendarMonth, dayLabel, daysOf, inPeriod, periodDays, periodLabel, previousPeriod, rollingDays, type Period } from "./period";
export { ORDER_TABS, inOrderTab, orderTab, ordersThisMonth } from "./orders";
export { alerts, lowEdition, setAiToReviewSource, todoCounts, todoItems, type AdminAlert, type AdminCounts, type TodoItem } from "./todo";
export { DASHBOARD_DEFINITIONS, adminDay, dashboard, type Dashboard, type DashboardDay, type DashboardTopWork } from "./dashboard";
export { ANALYTICS_DEFINITIONS, ANALYTICS_RANGES, SMALL_SAMPLE_READERS, analytics, type Analytics, type AnalyticsRange } from "./analytics";
export { FINANCE_DEFINITIONS, finance, financeCsv, type Finance, type PnlRow } from "./finance";
export { durationLabel, firstReplyMinutes } from "./support";
