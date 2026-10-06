import type { OutboxEmail } from "../log";

/** What the app needs from Resend: send one email (rendered by ./templates.ts). */
export interface ResendAdapter {
  send(email: Omit<OutboxEmail, "id" | "at" | "mode">): Promise<{ id: string }>;
}
