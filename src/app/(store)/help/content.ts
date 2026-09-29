/**
 * Help topics, word for word from the Help board (desktop rows) and MHelp (one paragraph per topic).
 * Static copy (docs/screens/store.md): moves to messages/ with the French pass.
 */
export type HelpTopic = "shipping" | "returns" | "faq" | "gift" | "contact";

export const HELP_TOPICS: Array<{ key: HelpTopic; label: string }> = [
  { key: "shipping", label: "Shipping" },
  { key: "returns", label: "Returns" },
  { key: "faq", label: "FAQ" },
  { key: "gift", label: "Gift cards" },
  { key: "contact", label: "Contact" },
];

export const HELP_ROWS: Record<Exclude<HelpTopic, "contact">, Array<{ label: string; text: string }>> = {
  shipping: [
    { label: "Guides", text: "Digital: they unlock in your library the second you pay." },
    { label: "Prints, France", text: "Colissimo home $6 (3–5 days) · Mondial Relay pickup $4 (4–6 days) · Chronopost express $14 (next day)." },
    { label: "Prints, Europe", text: "From $12, 5–8 working days. Tracking number by email." },
    { label: "Packaging", text: "Rolled in a rigid tube, wrapped in acid-free paper." },
  ],
  returns: [
    { label: "Prints", text: "14 days to change your mind. Send it back in its tube, we refund within 5 days." },
    { label: "Guides", text: "Digital content accessed immediately cannot be returned, as you agreed at checkout. If something is wrong with a guide, write to us, we will fix it." },
    { label: "Damaged print", text: "Send a photo within 48 hours, we reprint it for free." },
  ],
  faq: [
    { label: "I have never painted. Is that a problem?", text: "That is who Geste is for. Start with a Beginner work." },
    { label: "Which paint do I need?", text: "Each guide has an exact shopping list, with a budget option." },
    { label: "Can I use the guide offline?", text: "Yes, open it once online and it stays on your phone." },
    { label: "Can I print the guide?", text: "Three times per guide, each copy carries your name." },
  ],
  gift: [{ label: "Gift cards", text: "From $15 to $150, sent by email on the date you choose, valid 12 months." }],
};

/** MHelp's accordion: one paragraph per topic (no Contact row: the form sits below). */
export const HELP_PHONE: Array<{ key: Exclude<HelpTopic, "contact">; title: string; text: string }> = [
  { key: "shipping", title: "Shipping", text: "Guides unlock instantly. Prints in France: Colissimo $6 (3–5 days), Mondial Relay $4, Chronopost $14. Europe from $12." },
  { key: "returns", title: "Returns", text: "Prints: 14 days to change your mind. Guides accessed immediately cannot be returned; if something is wrong, we fix it." },
  { key: "faq", title: "FAQ", text: "Never painted? Start with a Beginner work. Offline? Yes. Print the guide? Three times." },
  { key: "gift", title: "Gift cards", text: "From $15 to $150, sent by email on the date you choose." },
];
