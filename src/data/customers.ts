/**
 * The 14 customers of AdminCustomers. Cities come from AdminFulfilment where the boards disagree
 * (the shipping prices of the orders depend on them); the country is the address country.
 */
import type { Address, ProfileRow } from "./types";

/** "Now" of the mock: every relative date (dashboard ranges, "today") is computed from here. */
export const MOCK_NOW = "2026-10-02T12:00:00Z";

function customer(slug: string, fullName: string, address: Omit<Address, "name">, opts: { newsletter: boolean; since: string; phone?: string }): ProfileRow {
  return {
    id: `cus-${slug}`,
    email: `${slug.replace("-", ".")}@mail.com`,
    fullName,
    locale: address.country === "FR" || address.country === "BE" ? "fr" : "en",
    newsletter: opts.newsletter,
    phone: opts.phone ?? null,
    defaultAddress: { name: fullName, ...address },
    createdAt: opts.since,
  };
}

export const customers: ProfileRow[] = [
  customer("camille-martin", "Camille Martin", { line1: "12 rue Mercière", postalCode: "69002", city: "Lyon", country: "FR" }, { newsletter: true, since: "2026-09-10T08:40:00Z", phone: "+33 6 12 34 56 78" }),
  customer("hugo-petit", "Hugo Petit", { line1: "8 avenue de Rumine", postalCode: "1005", city: "Lausanne", country: "CH" }, { newsletter: false, since: "2026-10-01T09:15:00Z" }),
  customer("lea-dubois", "Léa Dubois", { line1: "31 cours Victor Hugo", postalCode: "33000", city: "Bordeaux", country: "FR" }, { newsletter: true, since: "2026-09-12T17:05:00Z" }),
  customer("ines-moreau", "Inès Moreau", { line1: "4 rue Crébillon", postalCode: "44000", city: "Nantes", country: "FR" }, { newsletter: false, since: "2026-09-30T11:20:00Z" }),
  customer("tom-laurent", "Tom Laurent", { line1: "17 rue du Stand", postalCode: "1204", city: "Genève", country: "CH" }, { newsletter: true, since: "2026-09-15T19:30:00Z" }),
  customer("sarah-cohen", "Sarah Cohen", { line1: "22 rue Oberkampf", postalCode: "75011", city: "Paris", country: "FR" }, { newsletter: true, since: "2026-09-29T20:10:00Z" }),
  customer("yanis-benali", "Yanis Benali", { line1: "56 rue Haute", postalCode: "1000", city: "Bruxelles", country: "BE" }, { newsletter: false, since: "2026-09-16T12:45:00Z" }),
  customer("emma-roux", "Emma Roux", { line1: "9 rue Sainte", postalCode: "13001", city: "Marseille", country: "FR" }, { newsletter: false, since: "2026-09-17T10:00:00Z" }),
  customer("jules-fabre", "Jules Fabre", { line1: "3 place Rihour", postalCode: "59800", city: "Lille", country: "FR" }, { newsletter: true, since: "2026-09-28T16:25:00Z" }),
  customer("chloe-garnier", "Chloé Garnier", { line1: "11 rue de Bourg", postalCode: "1003", city: "Lausanne", country: "CH" }, { newsletter: false, since: "2026-09-19T14:05:00Z" }),
  customer("nina-keller", "Nina Keller", { line1: "40 boulevard Carl-Vogt", postalCode: "1205", city: "Genève", country: "CH" }, { newsletter: false, since: "2026-09-20T07:50:00Z" }),
  customer("paul-girard", "Paul Girard", { line1: "14 rue Saint-Gilles", postalCode: "4000", city: "Liège", country: "BE" }, { newsletter: true, since: "2026-09-26T18:40:00Z" }),
  customer("maya-lopez", "Maya Lopez", { line1: "25 Langstrasse", postalCode: "8004", city: "Zürich", country: "CH" }, { newsletter: false, since: "2026-09-25T13:35:00Z" }),
  customer("adam-faure", "Adam Faure", { line1: "6 rue du Taur", postalCode: "31000", city: "Toulouse", country: "FR" }, { newsletter: false, since: "2026-09-24T09:05:00Z" }),
];

/** The customer the fake session signs in as ("Hi Camille" on the Account board). */
export const DEMO_CUSTOMER_ID = "cus-camille-martin";
