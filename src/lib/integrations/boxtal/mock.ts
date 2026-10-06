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
