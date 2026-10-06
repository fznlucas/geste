/**
 * What the fixture orders lack and the simulation fills (source, device): one rule, used by the merge
 * (src/lib/api/local.ts) and by the calibration, so both count the fixtures the same way.
 */
import { CUSTOMER_SOURCES } from "@/data/customers";
import type { Device, OrderRow, Source } from "@/data/types";
import { hashString } from "./random";

const DEVICES: Device[] = ["phone", "phone", "phone", "phone", "phone", "phone", "phone", "desktop", "desktop", "tablet"];
const SOURCE_OF_TAG: Record<string, Source> = { TikTok: "tiktok", Instagram: "instagram", Google: "google", Newsletter: "newsletter", Pinterest: "pinterest", Friend: "referral" };

/** The customer's tag on AdminCustomerDetail (first order's source), "Direct" when none. */
export const fixtureSource = (o: Pick<OrderRow, "userId" | "source">): Source => o.source ?? SOURCE_OF_TAG[CUSTOMER_SOURCES[o.userId] ?? ""] ?? "direct";

/** 7 in 10 on a phone, 2 on a desktop, 1 on a tablet, stable per order. */
export const fixtureDevice = (o: Pick<OrderRow, "id" | "device">): Device => o.device ?? DEVICES[hashString(o.id) % DEVICES.length]!;
