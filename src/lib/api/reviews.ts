/** Reviews and real results. */
import { asset } from "@/lib/asset";
import type { ReviewRow } from "@/data/types";
import { works } from "@/data/works";
import { clone } from "./clone";
import { allCustomers, allReviews } from "./local";
import type { Review, ReviewStatus, ReviewsQuery } from "./types";

export function mapReview(row: ReviewRow): Review {
  const customer = allCustomers().find((c) => c.id === row.userId)!;
  const work = works.find((w) => w.id === row.workId)!;
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    photoUrl: row.photoPath ? asset(row.photoPath) : null,
    photoPath: row.photoPath ?? null,
    status: row.status,
    createdAt: row.createdAt,
    customer: { id: customer.id, fullName: customer.fullName },
    work: { id: work.id, number: work.number, slug: work.slug },
  };
}

/** Newest first. The store asks for ["published", "featured"]; "Real results" on Home for "featured". */
export async function getReviews(query: ReviewsQuery = {}): Promise<Review[]> {
  const statuses = query.status === undefined ? null : ([] as ReviewStatus[]).concat(query.status);
  return clone(
    allReviews()
      .filter((r) => !statuses || statuses.includes(r.status))
      .filter((r) => !query.workId || r.workId === query.workId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(mapReview),
  );
}
