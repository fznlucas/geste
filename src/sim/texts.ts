/**
 * Words of the simulated customers and of "Lucas · simulated": support threads, reviews, social posts,
 * newsletters. `{work}` is a work number ("N°03"), `{name}` a first name, `{format}` a canvas.
 */

export const THREAD_TEXTS = {
  print_eta: {
    subjects: ["When will my print ship?", "Print not arrived yet", "Tracking for my print?", "Is my print on its way?"],
    bodies: ["Hi, I ordered {work} a few days ago. When does it leave the studio?", "Hello, any news about my print? It is a present.", "I have not received the tracking link for my print yet."],
    reply: "Hi {name}, your print is signed and on its way: the tracking link is in your email. — Lucas",
  },
  format_swap: {
    subjects: ["Wrong canvas size", "Can I change the format?", "Format swap for {work}?"],
    bodies: ["I bought the guide for the wrong canvas, can I switch to {format}?", "My canvas is {format}, not the one I picked. Can you change it?"],
    reply: "Hi {name}, no problem: I have switched your guide to {format}. Open your library to see the new version. — Lucas, Geste",
  },
  access: {
    subjects: ["Cannot open my guide", "Login link not working", "Where is my guide?"],
    bodies: ["I paid but I cannot find the guide in my library.", "The login link says it expired.", "The guide page stays blank on my phone."],
    reply: "Hi {name}, I have sent you a new login link: your guide is in your library. — Lucas",
  },
  refund: {
    subjects: ["Refund for {work}?", "I would like a refund", "Damaged print"],
    bodies: ["I bought the wrong guide and have not opened it. Can I get a refund?", "My print arrived with a dent in the corner.", "I changed my mind, the guide is not opened."],
    reply: "Hi {name}, done: the refund is on its way to your card (3 to 5 days). — Lucas",
  },
  invoice: {
    subjects: ["Invoice please", "Invoice for my order", "Company invoice"],
    bodies: ["Could you send me an invoice with my address?", "I need an invoice for my company, is that possible?"],
    reply: "Hi {name}, your invoice is attached. — Lucas",
  },
  pre_sale: {
    subjects: ["Which level for a first painting?", "Do I need an easel?", "Gift for a beginner?", "Acrylic or gouache?"],
    bodies: ["I have never painted. Which work should I start with?", "Can I paint flat on a table?", "Is a gift card a good idea for my mother who never painted?"],
    reply: "Hi {name}, start with a Beginner work on the small canvas: about an hour, nothing to buy but the list. — Lucas",
  },
} as const;

export const THANKS = ["Thank you!", "Perfect, thanks a lot.", "Great, thank you Lucas.", "Got it, thanks."];

export const REVIEW_TEXTS: Record<number, string[]> = {
  5: ["I did not believe I could paint this.", "Done in an afternoon. Clear steps.", "It is on my wall now.", "The drying timer kept me honest.", "My first painting since school.", "The layers make it feel possible.", "Painted it with my daughter, we loved it."],
  4: ["Layer 2 was tricky, but it worked.", "Long, but worth it.", "Good guide, the shopping list helped.", "Nice result, I rushed the last layer."],
  3: ["Harder than I thought.", "OK, the second layer turned grey.", "Fine, but I needed more time than said."],
  2: ["Too hard for a first try.", "The colours did not match my tubes."],
  1: ["Not for me.", "test"],
};

export const SOCIAL_TITLES = {
  tiktok: ["Sunday painting", "Mud in 30 s", "One stroke, then lift", "Layer 2 in real time", "Before / after", "Studio test"],
  instagram: ["Reel · results of the week", "Story · the studio", "Carousel · palette of the month", "Reel · drying time"],
  pinterest: ["Pin · new work", "Pin · finished results"],
  youtube: ["Short · first canvas"],
} as const;

export const NEWSLETTER_SUBJECTS = [
  "Three rules against mud",
  "Why your second layer turns grey",
  "The small canvas is not a smaller painting",
  "What to do while it dries",
  "Paint with someone this weekend",
  "Your palette, your tubes",
  "Stop earlier than you think",
  "A year of first canvases",
];

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
