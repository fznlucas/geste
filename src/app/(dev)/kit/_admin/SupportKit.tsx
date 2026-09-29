"use client";

/** Kit: support inbox and review pieces (AdminSupport, AdminReviews) in their states. */
import { useState } from "react";
import { Button, MessageList, PillButton, ReviewCard, ThreadListItem, UnderLink } from "@/components";
import { asset } from "@/lib/asset";

export function SupportKit() {
  const [sel, setSel] = useState("a");
  return (
    <div className="flex flex-col gap-24">
      <div className="grid grid-cols-[340px_1fr] gap-24">
        <ul aria-label="Thread list states" className="flex flex-col border border-border bg-surface">
          <li><ThreadListItem who="Yanis Benali" when="09:12" subject="Refund for N°04?" preview="I bought the wrong format, can I chang…" open unread selected={sel === "a"} onSelect={() => setSel("a")} /></li>
          <li><ThreadListItem who="Emma Roux" when="Yesterday" subject="Layer 2 turned grey" preview="I think I mixed while wet, what do I d…" open selected={sel === "b"} onSelect={() => setSel("b")} /></li>
          <li><ThreadListItem who="Tom Laurent" when="Oct 1" subject="Canvas link in the shopping list is broken" preview="The canvas link in the shopping list o…" open={false} selected={sel === "c"} onSelect={() => setSel("c")} /></li>
        </ul>
        <div className="flex flex-col gap-14 border border-border bg-surface p-20">
          <MessageList
            messages={[
              { id: "1", from: "customer", body: "I bought the wrong format, can I change to 40×50?", staffName: null },
              { id: "2", from: "staff", body: "Hi Yanis, no problem: I have switched your guide to 40×50. Open your library to see the new version. — Lucas, Geste", staffName: "Lucas" },
            ]}
          />
        </div>
      </div>
      <ul aria-label="Review card states" className="grid grid-cols-4 gap-16">
        <ReviewCard
          who="Hugo Petit" work="N°01" rating={5} body="Done in an afternoon with my daughter. Clear steps." photoUrl={asset("mock/work-07.jpg")}
          actions={<div className="flex flex-wrap gap-6"><Button size="sm" className="grow justify-center!">Approve</Button><PillButton>Feature</PillButton><PillButton>Hide</PillButton></div>}
          reply={<UnderLink href="#" className="self-start">Reply privately</UnderLink>}
        />
        <ReviewCard who="Emma Roux" work="N°05" rating={4} body="Layer 2 was tricky, the mud page saved me." photoUrl={asset("mock/work-04.jpg")} verdict="Published · featured on home" reply={<UnderLink href="#" className="self-start">Reply privately</UnderLink>} />
        <ReviewCard who="Tom Laurent" work="N°02" rating={2} body="Shopping list link was broken for the canvas." photoUrl={null} verdict="Hidden" />
        <ReviewCard
          who="Chloé Garnier" work="N°03" rating={5} body="I did not believe I could paint this." photoUrl={null}
          actions={<div className="flex flex-wrap gap-6"><Button size="sm" className="grow justify-center!" disabled>Approve</Button><PillButton disabled>Feature</PillButton><PillButton disabled>Hide</PillButton></div>}
        />
      </ul>
    </div>
  );
}
