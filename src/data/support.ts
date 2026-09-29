/**
 * Support inbox (AdminSupport): the board's four open threads, two of them new since the last visit
 * (sidebar "Support inbox 2", "2 new support messages"), plus two answered ones in "Done".
 * Messages are `support_messages`; saved replies are `site_settings` "support.saved_replies".
 */
import type { SavedReplyRow, SupportMessageRow, SupportThreadRow } from "./types";

export const supportThreads: SupportThreadRow[] = [
  { id: "thread-1", userId: "cus-yanis-benali", email: "yanis.benali@mail.com", subject: "Refund for N°04?", orderId: "order-2035", category: "refund", status: "open", readAt: null, createdAt: "2026-10-02T09:12:00Z", updatedAt: "2026-10-02T09:12:00Z" },
  { id: "thread-4", userId: "cus-sarah-cohen", email: "sarah.cohen@mail.com", subject: "When will my print ship?", orderId: "order-2036", category: "question", status: "open", readAt: null, createdAt: "2026-10-02T08:02:00Z", updatedAt: "2026-10-02T08:02:00Z" },
  { id: "thread-5", userId: "cus-emma-roux", email: "emma.roux@mail.com", subject: "Layer 2 turned grey", orderId: "order-2034", category: "problem", status: "open", readAt: "2026-10-01T21:30:00Z", createdAt: "2026-10-01T21:10:00Z", updatedAt: "2026-10-01T21:10:00Z" },
  // The board says "Mon", but Hugo's only order is Oct 1: the thank-you comes after it (docs/decisions.md "Admin support (M6)").
  { id: "thread-6", userId: "cus-hugo-petit", email: "hugo.petit@mail.com", subject: "Thank you!", orderId: "order-2040", category: "question", status: "open", readAt: "2026-10-01T21:00:00Z", createdAt: "2026-10-01T20:40:00Z", updatedAt: "2026-10-01T20:40:00Z" },
  { id: "thread-2", userId: "cus-tom-laurent", email: "tom.laurent@mail.com", subject: "Canvas link in the shopping list is broken", orderId: "order-2037", category: "problem", status: "done", readAt: "2026-10-01T10:20:00Z", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:25:00Z" },
  { id: "thread-3", userId: "cus-camille-martin", email: "camille.martin@mail.com", subject: "Gift wrap for my print?", orderId: "order-2041", category: "question", status: "done", readAt: "2026-10-01T18:20:00Z", createdAt: "2026-10-01T18:00:00Z", updatedAt: "2026-10-01T18:30:00Z" },
];

export const supportMessages: SupportMessageRow[] = [
  { id: "msg-1-1", threadId: "thread-1", from: "customer", body: "I bought the wrong format, can I change to 40×50?", staffName: null, createdAt: "2026-10-02T09:12:00Z" },
  { id: "msg-4-1", threadId: "thread-4", from: "customer", body: "Hi, I ordered N°07 A3 on Monday. It is a present for Saturday: when does it leave the studio?", staffName: null, createdAt: "2026-10-02T08:02:00Z" },
  { id: "msg-5-1", threadId: "thread-5", from: "customer", body: "I think I mixed while wet, what do I do?", staffName: null, createdAt: "2026-10-01T21:10:00Z" },
  { id: "msg-6-1", threadId: "thread-6", from: "customer", body: "Finished N°01 with my daughter.", staffName: null, createdAt: "2026-10-01T20:40:00Z" },
  { id: "msg-2-1", threadId: "thread-2", from: "customer", body: "The canvas link in the shopping list of N°02 goes to an empty page.", staffName: null, createdAt: "2026-10-01T10:00:00Z" },
  { id: "msg-2-2", threadId: "thread-2", from: "staff", body: "Hi Tom, thank you: the link is fixed. The canvas is back in the list. — Lucas", staffName: "Lucas", createdAt: "2026-10-01T10:25:00Z" },
  { id: "msg-3-1", threadId: "thread-3", from: "customer", body: "Could my print come gift wrapped? It is for my sister.", staffName: null, createdAt: "2026-10-01T18:00:00Z" },
  { id: "msg-3-2", threadId: "thread-3", from: "staff", body: "Hi Camille, every print ships in a tube with a signed card, ready to give. — Lucas", staffName: "Lucas", createdAt: "2026-10-01T18:30:00Z" },
];

/** "Saved replies:" of the board. `{name}` is the customer's first name. */
export const savedReplies: SavedReplyRow[] = [
  { id: "reply-format", name: "Format swap", body: "Hi {name}, no problem: I have switched your guide to 40×50. Open your library to see the new version. — Lucas, Geste" },
  { id: "reply-eta", name: "Print ETA", body: "Hi {name}, your print is signed and leaves Lyon today. You will get the tracking link tonight. — Lucas" },
  { id: "reply-mud", name: "Mud rescue", body: "Hi {name}, let the layer dry fully, then paint the colour again on top in one stroke. Send me a photo if you want. — Lucas" },
];
