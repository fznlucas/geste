"use client";

/** Review moderation (future `src/actions/admin/reviews.ts`: setReviewStatus). Support and Content moderate. */
import { getReviews, type Review, type ReviewStatus } from "@/lib/api";
import { patchRow, requireStaff } from "../admin";

const VERB: Record<ReviewStatus, string> = { published: "published", featured: "featured", hidden: "hid", pending: "sent back to moderation" };

export async function setReviewStatus(id: string, status: ReviewStatus): Promise<Review> {
  const staff = requireStaff(["support", "content"]);
  const review = (await getReviews()).find((r) => r.id === id);
  if (!review) throw new Error("This review no longer exists.");
  patchRow("reviews", id, { status }, {
    action: "review.status",
    target: `review:${id}`,
    summary: `${staff.fullName} ${VERB[status]} ${review.customer.fullName}’s review of ${review.work.number}`,
  });
  return review;
}
