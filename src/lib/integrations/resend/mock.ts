import { adminNow, insertRow } from "@/lib/client/admin";
import type { ResendAdapter } from "./types";

/** Mock: the email is kept, whole and readable, in Settings › Integrations › Outbox. Nothing is sent. */
export const resendMock: ResendAdapter = {
  send: async (email) => {
    const row = insertRow("outbox", { ...email, at: adminNow(), mode: "mock" });
    return { id: row.id };
  },
};
