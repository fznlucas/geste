import { IntegrationNotConfigured } from "../errors";
import { API_BASE } from "../mode";
import type { ResendAdapter } from "./types";

/** Live: the backend sends with RESEND_API_KEY from EMAIL_FROM (React Email templates server-side). */
export const resendLive: ResendAdapter = {
  send: async (email) => {
    if (!API_BASE) throw new IntegrationNotConfigured("resend", "Needs a server · set NEXT_PUBLIC_API_BASE");
    const res = await fetch(`${API_BASE}/email`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(email) });
    if (!res.ok) throw new IntegrationNotConfigured("resend", `Resend refused the email (${res.status})`);
    return (await res.json()) as { id: string };
  },
};
