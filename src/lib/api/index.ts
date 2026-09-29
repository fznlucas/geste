/**
 * Data access for every page. Mock phase: reads `src/data` (no network). Later each function is
 * re-implemented on Supabase with the same signature, and the pages do not change.
 * Pages import from "@/lib/api" only, never from "@/data".
 */
export { getWorks, getWork, getWorkById, getHomeHeroWork, getShoppingList, getGuideOutline, toWorkCard, toConfiguratorPalettes } from "./works";
export { getAdminWorks, getAdminWork, getWorkSlugs, formatRowId, paletteRowId, listRowId, type AdminWork, type AdminWorkDetail, type AdminWorkFormat, type AdminWorkPalette, type AdminListItem, type AdminWorkEdition, type AdminChecklistItem } from "./works";
export { getArticles, getArticle, articleDate } from "./articles";
export { getGuide, findGuide, flattenSteps } from "./guides";
export { getGuideEditor, getGuideEditorParams, getWorkGuides, guideDraftContent, nextGuideVersion, type GuideContent, type GuideContentLayer, type GuideEditorData, type GuideVersionInfo } from "./guides";
export { getAiPipeline, aiBudget, aiJobCostCents, aiJobLabel, aiStage, aiJobRow, aiCandidateRow, allAiJobs, AI_STYLES, AI_MEDIUMS, AI_PALETTES, AI_FORMATS, AI_LIMITS, type AiPipeline, type AiJob, type AiCandidate, type AiBudget, type AiJobParams, type AiStyle, type AiMedium } from "./ai";
export { getEditions, getEdition, getPrintCopies, getCertificateLog } from "./editions";
export { getOrders, getOrder, getRefundOptions, ORDERS_THIS_MONTH, getOrderTracking, customerOrderStatus, orderLineTitle, copyNumbersLabel, trackingCarrierLine } from "./orders";
export { getCustomers, getCustomer, findCustomerByEmail, getAccountSecurity } from "./customers";
export { getLibrary, getEntitlement, getEntitlementIds, libraryProgress } from "./library";
export { getReviews } from "./reviews";
export { priceCart, sameCartLine, GIFT_CARD_PRESETS, GIFT_CARD_MIN, GIFT_CARD_MAX } from "./cart";
export { buildOrder, nextOrderNumber, CheckoutError, type PlaceOrderInput } from "./checkout";
export { setLocalRowsSource, setAdminOverlaySource, type LocalRows, type AdminOverlay } from "./local";
export { getStaffMember } from "./staff";
export { getAdminCounts, getAdminAlerts, getLowEdition, getPushSettings, PUSH_TOPICS, getOrderNotes, setAiToReviewSource, type AdminCounts, type AdminAlert, type OrderNote } from "./admin";
export { getSupportThreads, getSupportThread, getSavedReplies } from "./support";
export { getAdminArticles, getHomeSettings, getTranslationProgress, getLegalDocs, type AdminArticle, type HomeSettings, type LegalDoc } from "./content";
export { getAnalytics, getFinance, financeCsv, ANALYTICS_RANGES, type Analytics, type AnalyticsRange, type Finance, type PnlRow } from "./insights";
export { getPromoCodes, promoCodeExists, getGiftCards, getCampaigns, getAffiliates, getSocialWeek, type PromoCode, type GiftCard, type Campaign, type PromoKind, type PromoScope } from "./marketing";
export { getStoreSettings, getShippingZones, getPaymentProviders, getSecuritySettings, getIntegrations, getTeam, getPastAudit, TEAM_ROLE_LABEL, type StoreSetting, type TeamMember, type SettingStatus } from "./settings";
export { getDashboard, adminDay, type Dashboard, type DashboardDay, type DashboardTopWork } from "./dashboard";
export { MOCK_NOW, DEMO_CUSTOMER_ID } from "@/data/customers";
export { DEMO_STAFF_ID } from "@/data/staff";
export type * from "./types";
