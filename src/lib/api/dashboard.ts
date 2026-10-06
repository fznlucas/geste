/**
 * Dashboard (AdminDashboard, AdminMToday). The figures are computed in `@/lib/metrics/dashboard`
 * (docs/admin-v2: one source per number); this read keeps its signature for existing callers.
 */
export { dashboard as getDashboard, adminDay, type Dashboard, type DashboardDay, type DashboardTopWork } from "@/lib/metrics/dashboard";
