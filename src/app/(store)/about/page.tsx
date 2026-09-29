/**
 * About — boards About (1440) and MAbout (390), docs/screens/store.md §About. Built at deploy time.
 * The studio photo and the founder note are the boards' placeholders until Lucas supplies them (docs/decisions.md).
 */
import type { Metadata } from "next";
import { ButtonLink } from "@/components";

export const metadata: Metadata = {
  title: "About",
  description: "Geste is a small studio in Lyon. We design abstract works stroke by stroke, then break them into layers anyone can follow.",
};

/** Desktop wording, then the phone's shorter one (MAbout). */
const VALUES = [
  { n: "01", title: "Designed, then painted", text: "Every work is composed as a sequence of gestures, and painted by the studio before it is released.", short: "Every work is painted by the studio before release." },
  { n: "02", title: "Honest previews", text: "The digital preview is labelled as such, and every work shows a real result by a first-time painter.", short: "Labelled previews, real results from beginners." },
  { n: "03", title: "Yours, not ours", text: "Your painting will not look like the preview. It will look like you. That is the point.", short: "It will look like you. That is the point." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-1440 flex-col gap-40 px-16 pt-24 lg:gap-120 lg:px-120 lg:pt-88">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:gap-x-40 lg:gap-y-0">
        <div className="flex flex-col gap-10 lg:col-span-7 lg:gap-16">
          <span className="text-fg-muted">About</span>
          <h1 className="text-lg lg:text-xl">A studio that designs paintings for other hands.</h1>
        </div>
        <p className="text-fg-muted lg:col-span-4 lg:col-start-9 lg:self-end">
          Geste is a small studio in Lyon. We design abstract works stroke by stroke, then break them into layers anyone can follow.
        </p>
      </div>

      <div className="flex h-302 items-center justify-center border border-dashed border-border-dashed text-center text-fg-muted lg:h-562">
        <span className="lg:hidden">[Photo: the studio table]</span>
        <span className="hidden lg:inline">[Photo: the studio table, brushes, a canvas mid-layer]</span>
      </div>

      <div className="flex flex-col gap-40 lg:grid lg:grid-cols-3 lg:gap-x-40">
        {VALUES.map((v) => (
          <div key={v.n} className="flex flex-col gap-6 border-t border-border pt-14 lg:gap-8 lg:pt-16">
            <span className="text-fg-muted">{v.n}</span>
            <h2 className="text-xs font-medium tracking-normal">{v.title}</h2>
            <p className="text-fg-muted">
              <span className="lg:hidden">{v.short}</span>
              <span className="hidden lg:inline">{v.text}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-40 lg:border-t lg:border-border lg:py-40">
        <div className="hidden flex-col gap-6 lg:col-span-6 lg:flex">
          <span className="font-medium">[Founder note — two or three lines in your own words]</span>
          <span className="text-fg-muted">Write to us: hello@geste.studio</span>
        </div>
        <div className="flex flex-col-reverse gap-10 lg:col-span-6 lg:col-start-7 lg:flex-row lg:justify-end lg:gap-12">
          <ButtonLink href="/method" variant="ghost" className="lg:min-w-180">Read the method</ButtonLink>
          <ButtonLink href="/shop" trailing="→" className="lg:min-w-220">Browse works</ButtonLink>
        </div>
      </div>
    </div>
  );
}
