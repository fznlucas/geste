import Link from "next/link";
import { InfoTip } from "./InfoTip";
import { cn } from "@/lib/cn";

export interface KpiTileProps {
  label: string;
  value: string;
  context: string;
  /** The module the number comes from; without it (a role that cannot open the module) the tile is not a link. */
  href?: string;
  /** md: dashboard (20 px padding, 28 px value, 6 px gaps). sm: phone Today (14 px padding, 24 px value, 2 px gaps). */
  size?: "md" | "sm";
  /** The figure's definition (its metric's `definition`): a "?" in the corner shows it. */
  definition?: string;
  /** The rows behind the figure ("See the rows" in the "?"). */
  rowsHref?: string;
}

/** White box: label (Stone) · value · delta or context (Stone). The whole tile links to its module. */
export function KpiTile({ label, value, context, href, size = "md", definition, rowsHref }: KpiTileProps) {
  const cls = cn("flex flex-col border border-border bg-surface", size === "md" ? "gap-6 p-20" : "gap-2 p-14", href && "hover:border-border-field focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg");
  const body = (
    <>
      <span className="text-fg-muted">{label}</span>
      <span className={cn("tabular-nums", size === "md" ? "text-lg tracking-heading" : "text-stat")}>{value}</span>
      <span className="text-fg-muted">{context}</span>
    </>
  );
  const tile = href ? <Link href={href} className={cn(cls, "h-full")}>{body}</Link> : <div className={cn(cls, "h-full")}>{body}</div>;
  if (!definition) return tile;
  // The "?" sits on the tile, outside its link (a link cannot hold a button).
  return (
    <div className="relative">
      {tile}
      <span className={cn("absolute", size === "md" ? "right-12 top-12" : "right-8 top-8")}>
        {/* Named by the figure alone ("About Revenue"), not its period. */}
        <InfoTip definition={definition} rowsHref={rowsHref} label={label.split(" · ")[0]!} />
      </span>
    </div>
  );
}
