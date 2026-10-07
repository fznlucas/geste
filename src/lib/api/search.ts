/**
 * Admin top-bar search (docs/admin-v2/04 Shell): orders (number, email, name), customers, works, guides,
 * support threads, promo codes, grouped, at most 5 per group. The page keeps the groups the signed-in
 * role can open. Later: a Postgres full-text query.
 */
import { clone } from "./clone";
import { allCustomers, allOrders, allSupportThreads, allWorks, customerById } from "./local";
import { allPromos } from "./marketing";

export interface SearchHit {
  label: string;
  detail: string;
  href: string;
}

export interface SearchGroup {
  group: "Orders" | "Customers" | "Works" | "Guides" | "Support" | "Promo codes";
  hits: SearchHit[];
}

const LIMIT = 5;

export async function adminSearch(query: string): Promise<SearchGroup[]> {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (q.length < 2) return [];
  const digits = q.replace(/[^0-9]/g, "");
  const has = (...values: Array<string | null | undefined>) => values.some((v) => v?.toLowerCase().includes(q));

  const orders = [...allOrders()]
    .reverse()
    .filter((o) => has(o.number, o.email, customerById(o.userId)?.fullName))
    .slice(0, LIMIT)
    .map((o) => ({ label: `#${o.number}`, detail: `${customerById(o.userId)?.fullName ?? o.email} · ${o.paidAt.slice(0, 10)}`, href: `/admin/orders/detail/?number=${o.number}` }));
  const customers = allCustomers()
    .filter((c) => has(c.fullName, c.email))
    .slice(0, LIMIT)
    .map((c) => ({ label: c.fullName, detail: c.email, href: `/admin/customers/detail/?id=${c.id}` }));
  const works = allWorks()
    .filter((w) => has(w.number, w.slug, w.description) || (digits && Number(w.number.slice(2)) === Number(digits)))
    .slice(0, LIMIT)
    .map((w) => ({ label: w.number, detail: w.status, href: `/admin/works/${w.slug}/` }));
  const guides = allWorks()
    .filter((w) => /guide/.test(q) ? has(w.number) || (digits && Number(w.number.slice(2)) === Number(digits)) : false)
    .slice(0, LIMIT)
    .map((w) => ({ label: `${w.number} guides`, detail: "every canvas and level", href: `/admin/guides/?work=${w.slug}` }));
  const threads = allSupportThreads()
    .filter((t) => has(t.subject, t.email, customerById(t.userId ?? "")?.fullName))
    .slice(0, LIMIT)
    .map((t) => ({ label: t.subject, detail: `${customerById(t.userId ?? "")?.fullName ?? t.email} · ${t.status}`, href: `/admin/support/?thread=${t.id}` }));
  const promos = allPromos()
    .filter((p) => has(p.code, p.label))
    .slice(0, LIMIT)
    .map((p) => ({ label: p.code, detail: p.label, href: "/admin/marketing/" }));

  const groups: SearchGroup[] = [
    { group: "Orders", hits: orders },
    { group: "Customers", hits: customers },
    { group: "Works", hits: works },
    { group: "Guides", hits: guides },
    { group: "Support", hits: threads },
    { group: "Promo codes", hits: promos },
  ];
  return clone(groups.filter((g) => g.hits.length));
}
