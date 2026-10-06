import { BUSINESS } from "@/config/business";
import { hashString } from "@/sim/random";
import type { BoxtalAdapter } from "./types";

const EU = new Set(["FR", "BE", "DE", "NL", "ES", "IT", "AT", "PT", "IE", "LU"]);

/** Mock: tracking numbers in each carrier's format, the label price of the config's grid. */
export const boxtalMock: BoxtalAdapter = {
  createLabel: async ({ orderNumber, carrier, country }) => {
    const h = hashString(orderNumber);
    const digits = (n: number) => String(h).padStart(n, "0").slice(-n);
    const zone = country === "FR" ? "FR" : EU.has(country) ? "EU" : "INTL";
    const trackingNo =
      carrier === "mondial_relay" ? digits(8)
        : carrier === "chronopost" ? `XY${digits(9)}FR`
          : zone === "FR" ? `6A${digits(11)}` : `CA${digits(8)}FR`;
    const grid = BUSINESS.costs.labels.value as Record<string, Record<"FR" | "EU" | "INTL", number>>;
    return { trackingNo, costCents: grid[carrier]![zone] };
  },
};

/** Days from hand-over to the delivery round, by carrier (mock tracking). */
const TRANSIT_DAYS: Record<string, number> = { chronopost: 1, colissimo: 2, mondial_relay: 3 };

/**
 * Mock tracking webhook: the carrier's scans of a parcel the admin shipped, the evening of the
 * hand-over (in transit), then the delivery round and the delivery, each only once the clock passes it.
 */
export function mockCarrierScans(s: { carrier: string; shippedAt: string | null }, now: number): { inTransitAt: string | null; outForDeliveryAt: string | null; deliveredAt: string | null } {
  if (!s.shippedAt) return { inTransitAt: null, outForDeliveryAt: null, deliveredAt: null };
  const shipped = Date.parse(s.shippedAt);
  const iso = (ms: number) => (ms <= now ? new Date(ms).toISOString().slice(0, 19) + "Z" : null);
  const days = TRANSIT_DAYS[s.carrier] ?? 2;
  const round = Date.parse(new Date(shipped + days * 86_400_000).toISOString().slice(0, 10) + "T06:30:00Z");
  return { inTransitAt: iso(shipped + 6 * 3_600_000), outForDeliveryAt: iso(round), deliveredAt: iso(round + 5 * 3_600_000) };
}
