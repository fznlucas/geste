import type { ClaudeAdapter } from "./types";

/** Mock: a canned draft that follows the thread's subject. */
export const claudeMock: ClaudeAdapter = {
  draftReply: async ({ subject, firstName }) => {
    const s = subject.toLowerCase();
    if (/ship|print|arriv|track/.test(s)) return `Hi ${firstName}, your print is signed and on its way: you will get the tracking link by email today. — Lucas`;
    if (/refund/.test(s)) return `Hi ${firstName}, I am sorry it did not work out. I have refunded you: it shows on your card in 3 to 5 days. — Lucas`;
    if (/format|size|canvas/.test(s)) return `Hi ${firstName}, no problem: I have switched your guide to the right canvas. Open your library to see it. — Lucas`;
    if (/grey|mud|layer/.test(s)) return `Hi ${firstName}, let the layer dry fully, then paint the colour again on top in one stroke. Send me a photo if you want. — Lucas`;
    return `Hi ${firstName}, thank you for writing. — Lucas`;
  },
};
