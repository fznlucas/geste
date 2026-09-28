import Link from "next/link";

/** White box, 20 px padding: label (Stone) · 28 px value · delta or context (Stone). The whole tile links to its module. */
export function KpiTile({ label, value, context, href }: { label: string; value: string; context: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-6 border border-border bg-surface p-20 hover:border-border-field">
      <span className="text-fg-muted">{label}</span>
      <span className="text-lg tabular-nums">{value}</span>
      <span className="text-fg-muted">{context}</span>
    </Link>
  );
}
