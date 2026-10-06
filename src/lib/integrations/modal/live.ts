import { IntegrationNotConfigured } from "../errors";
import { API_BASE } from "../mode";
import type { ModalAdapter } from "./types";

/** Live: the backend spawns the Modal function with MODAL_TOKEN_ID / MODAL_TOKEN_SECRET; progress returns on /api/webhooks/modal. */
export const modalLive: ModalAdapter = {
  submitJob: async (input) => {
    if (!API_BASE) throw new IntegrationNotConfigured("modal", "Needs a server · set NEXT_PUBLIC_API_BASE");
    const res = await fetch(`${API_BASE}/modal/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!res.ok) throw new IntegrationNotConfigured("modal", `GPU provider refused (${res.status})`);
    return (await res.json()) as { callId: string };
  },
};
