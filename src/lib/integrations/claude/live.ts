import { IntegrationNotConfigured } from "../errors";
import { API_BASE } from "../mode";
import type { ClaudeAdapter } from "./types";

/** Live: the backend asks the Claude API with ANTHROPIC_API_KEY. */
export const claudeLive: ClaudeAdapter = {
  draftReply: async (input) => {
    if (!API_BASE) throw new IntegrationNotConfigured("claude", "Needs a server · set NEXT_PUBLIC_API_BASE");
    const res = await fetch(`${API_BASE}/claude/draft`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!res.ok) throw new IntegrationNotConfigured("claude", `Claude refused (${res.status})`);
    return ((await res.json()) as { text: string }).text;
  },
};
