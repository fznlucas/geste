import type { Metadata } from "next";
import { AiPipelinePage } from "./AiPipelinePage";

export const metadata: Metadata = { title: "AI pipeline" };

/** /admin/ai (AdminAIPipeline): owner and content. */
export default function Page() {
  return <AiPipelinePage />;
}
