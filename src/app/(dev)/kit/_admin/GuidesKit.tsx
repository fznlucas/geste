"use client";

/** /kit: the AI pipeline's candidate card in every state and the admin meter (M6 "guides"). */
import { AdminMeter, AiCandidateCard } from "@/components";
import { asset } from "@/lib/asset";

const BASE = { imageUrl: asset("mock/work-10.jpg"), similarity: 95, strokes: 96, layers: 3 };

export function GuidesKit() {
  return (
    <div className="flex flex-col gap-24">
      <div className="flex max-w-420 flex-col gap-10">
        <span className="text-fg-muted">AdminMeter · 0 %, 35 %, 88 %, 100 %</span>
        {[0, 35, 88, 100].map((p) => <AdminMeter key={p} pct={p} label={`Kit meter ${p}%`} />)}
      </div>
      <ul className="grid max-w-720 grid-cols-5 gap-14">
        <AiCandidateCard id="C-115-a" {...BASE} note="Best score" status="pending" />
        <AiCandidateCard id="C-114-b" {...BASE} imageUrl={asset("mock/work-06.jpg")} similarity={88} strokes={131} note="Too many strokes for level" warning status="pending" />
        <AiCandidateCard id="C-115-c" {...BASE} imageUrl={asset("mock/work-02.jpg")} note="" status="pending" busy />
        <AiCandidateCard id="C-114-a" {...BASE} imageUrl={asset("mock/work-04.jpg")} note="Beginner-friendly" status="approved" />
        <AiCandidateCard id="C-115-b" {...BASE} imageUrl={asset("mock/work-05.jpg")} similarity={81} note="Low similarity" warning status="rejected" />
      </ul>
    </div>
  );
}
