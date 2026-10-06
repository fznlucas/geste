# 06 · Readability (nothing removed, same design system)

Goal: Lucas understands each number in two seconds and knows where it comes from. Only existing tokens and components; any new piece goes into `src/components/admin/` and `/kit` with all states.

1. **Every figure says its unit and period.** "€3,412 excl. VAT · Sep 6 – Oct 5", "187 paid orders · September". Currency suffix follows the top-bar display switch (EUR excl. VAT / USD charged). Dates in one format everywhere (`src/lib/dates.ts`): "Oct 6", "Oct 6, 14:02", year only when not the current one.
2. **Every KPI explains itself.** An info icon (existing `Icon`, `Tooltip`) on each tile and P&L row: the definition in one sentence ("Paid orders ÷ visits, same period"), and a "See the rows" link to the filtered list. Definitions live next to the metric function (`lib/metrics/*`, exported `definition` string) so the tooltip and the code never disagree.
3. **Deltas name their comparison.** "+12 % vs previous 30 days", "+22 % vs Tue Sep 29". Positive/negative never by colour alone: sign + word.
4. **Numbers align.** Right-aligned money and counts in tables, tabular figures (JetBrains Mono already monospaced; keep decimals consistent: money always 2 decimals in tables, 0 in KPI tiles).
5. **Tables**: sticky header, row count + filter summary line above ("42 orders · To ship · last 30 days · Clear filters"), empty state sentence + action (docs/states.md), loading = Mist blocks.
6. **Page header line** (added under the title, `text-xs`, Stone): what this page is for and the period in view, e.g. Fulfilment: "3 prints to pack before the 16:00 pickup · 1 late".
7. **Group long pages** with the existing `Section` titles; Finance gets tabs (P&L · Taxes & URSSAF · Cash & payouts · Ledger), nothing removed from the P&L view.
8. **Status = dot + word** everywhere (StatusChip), including integrations and URSSAF periods.
9. **Links look like links** (underline on hover, focus ring) and every clickable row has a visible focus state and `aria-label` naming the target.
10. **Phone admin**: same metrics, the to-do first, money second.
11. **Copy**: sentence case, short, no jargon, English like the rest of the admin (no translation files exist yet).

Screenshot every admin page at 1440×900 and 390×844 before and after; compare: nothing missing, nothing restyled outside these rules.
