/** What the app needs from Claude: a draft reply for a support thread. */
export interface ClaudeAdapter {
  draftReply(input: { subject: string; firstName: string; lastMessage: string }): Promise<string>;
}
