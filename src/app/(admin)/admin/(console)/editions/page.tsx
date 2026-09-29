import type { Metadata } from "next";
import { EditionsPage } from "./EditionsPage";

export const metadata: Metadata = { title: "Print editions" };

export default function Page() {
  return <EditionsPage />;
}
