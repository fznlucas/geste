/** Gift cards — boards GiftCard, MGiftCard, docs/screens/store.md §Gift cards. */
import type { Metadata } from "next";
import { getWork } from "@/lib/api";
import { GiftCardForm } from "./GiftCardForm";

export const metadata: Metadata = { title: "Gift card", description: "Let someone paint their first canvas. They choose the work, the format and the palette." };

/** Card designs drawn on the board: N°03, N°07, N°01. */
const DESIGNS = ["n03", "n07", "n01"];

export default async function Page() {
  const designs = (await Promise.all(DESIGNS.map((s) => getWork(s)))).flatMap((w) => (w ? [{ key: w.slug, number: w.number, imageUrl: w.imageUrl }] : []));
  return <GiftCardForm designs={designs} />;
}
