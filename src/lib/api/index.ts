/**
 * Data access for every page. Mock phase: reads `src/data` (no network). Later each function is
 * re-implemented on Supabase with the same signature, and the pages do not change.
 * Pages import from "@/lib/api" only, never from "@/data".
 */
export { getWorks, getWork, getWorkById, getHomeHeroWork, getShoppingList, toWorkCard, toConfiguratorPalettes } from "./works";
export { getGuide, findGuide, flattenSteps } from "./guides";
export { getEditions, getEdition, getPrintCopies } from "./editions";
export { getOrders, getOrder } from "./orders";
export { getCustomers, getCustomer } from "./customers";
export { getLibrary, getEntitlement } from "./library";
export { getReviews } from "./reviews";
export { getSupportThreads } from "./support";
export { MOCK_NOW, DEMO_CUSTOMER_ID } from "@/data/customers";
export type * from "./types";
