import { IntegrationNotConfigured } from "../errors";
import { API_BASE } from "../mode";
import type { BoxtalAdapter } from "./types";

/** Live: the backend buys the label with BOXTAL_API_KEY / BOXTAL_SECRET. */
export const boxtalLive: BoxtalAdapter = {
  createLabel: async (input) => {
    if (!API_BASE) throw new IntegrationNotConfigured("boxtal", "Needs a server · set NEXT_PUBLIC_API_BASE");
    const res = await fetch(`${API_BASE}/boxtal/labels`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!res.ok) throw new IntegrationNotConfigured("boxtal", `Boxtal refused the label (${res.status})`);
    return (await res.json()) as { trackingNo: string; costCents: number };
  },
};
