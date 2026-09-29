/**
 * Data access for every page. Mock phase: reads `src/data` (no network). Later each function is
 * re-implemented on Supabase with the same signature, and the pages do not change.
 * Pages import from "@/lib/api" only, never from "@/data".
 */
export { getWorks, getWork, getWorkById, getHomeHeroWork, getShoppingList, getGuideOutline, toWorkCard, toConfiguratorPalettes } from "./works";
export { getArticles, getArticle, articleDate } from "./articles";
export { getGuide, findGuide, flattenSteps } from "./guides";
export { getEditions, getEdition, getPrintCopies } from "./editions";
export { getOrders, getOrder } from "./orders";
export { getCustomers, getCustomer, findCustomerByEmail } from "./customers";
export { getLibrary, getEntitlement } from "./library";
export { getReviews } from "./reviews";
export { priceCart, sameCartLine, GIFT_CARD_PRESETS, GIFT_CARD_MIN, GIFT_CARD_MAX } from "./cart";
export { buildOrder, nextOrderNumber, CheckoutError, type PlaceOrderInput } from "./checkout";
export { setLocalRowsSource, type LocalRows } from "./local";
export { getStaffMember } from "./staff";
export { getSupportThreads } from "./support";
export { MOCK_NOW, DEMO_CUSTOMER_ID } from "@/data/customers";
export { DEMO_STAFF_ID } from "@/data/staff";
export type * from "./types";
