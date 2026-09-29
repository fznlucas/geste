/**
 * /learn — the installed app's start page (manifest start_url, docs/screens/reader.md §PWA). No board:
 * it opens the guide the painter used last (else the first one of the Library), or the Library.
 */
import type { Metadata } from "next";
import { LearnHome } from "./_reader/LearnHome";

export const metadata: Metadata = { title: "Your guides" };

export default function Page() {
  return <LearnHome />;
}
