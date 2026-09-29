/** Help — boards Help, MHelp, docs/screens/store.md §Help. */
import type { Metadata } from "next";
import { HelpPage } from "./HelpPage";

export const metadata: Metadata = { title: "Help", description: "Shipping, returns, questions and gift cards. Write to us: we reply within one working day." };

export default function Page() {
  return <HelpPage />;
}
