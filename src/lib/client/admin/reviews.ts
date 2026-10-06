"use client";

/** Review moderation (future `src/actions/admin/reviews.ts`: setReviewStatus). Support and Content moderate. */
import { getReviews, type Review, type ReviewStatus } from "@/lib/api";
import { allWorks } from "@/lib/api/local";
import { FEATURED_MAX } from "@/sim/config";
import { patchRow, requireStaff } from "../admin";

const VERB: Record<ReviewStatus, string> = { published: "published", featured: "featured", hidden: "hid", pending: "sent back to moderation" };

/** Featured reviews fill the "Real results" row of the Method page and the home: four photos. */
export const FEATURE_CAP = FEATURED_MAX;

/** Hiding a review whose photo is a work's real result: the caller asks first, then passes `confirmed`. */
export class ResultPhotoError extends Error {
  constructor(public workNumber: string) {
    super(`This photo is ${workNumber}'s real result. Hiding it removes it from the work page.`);
  }
}

/**
 * Moderates a review. Featuring a fifth sends the oldest featured one back to published (the Real
 * results row holds four) and returns it as `unfeatured`.
 */
export async function setReviewStatus(id: string, status: ReviewStatus, opts: { confirmed?: boolean } = {}): Promise<Review & { unfeatured?: Review }> {
  const staff = requireStaff(["support", "content"]);
  const all = await getReviews();
  const review = all.find((r) => r.id === id);
  if (!review) throw new Error("This review no longer exists.");
  if (review.status === status) return review;
  const featured = all.filter((r) => r.status === "featured" && r.id !== id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const unfeatured = status === "featured" && featured.length >= FEATURE_CAP ? featured[0] : undefined;
  const resultOf = review.photoPath ? allWorks().find((w) => w.resultPhotoPath === review.photoPath) : undefined;
  if (status === "hidden" && resultOf && !opts.confirmed) throw new ResultPhotoError(resultOf.number);
  patchRow("reviews", id, { status }, {
    action: "review.status",
    target: `review:${id}`,
    summary: `${staff.fullName} ${VERB[status]} ${review.customer.fullName}’s review of ${review.work.number}`,
  });
  if (unfeatured) {
    patchRow("reviews", unfeatured.id, { status: "published" }, {
      action: "review.status",
      target: `review:${unfeatured.id}`,
      summary: `${staff.fullName} unfeatured ${unfeatured.customer.fullName}’s review of ${unfeatured.work.number} (the Real results row holds ${FEATURE_CAP})`,
    });
  }
  if (status === "hidden" && resultOf) {
    patchRow("works", resultOf.id, { resultPhotoPath: null }, { action: "work.result_photo", target: `work:${resultOf.slug}`, summary: `${staff.fullName} removed ${resultOf.number}'s real result photo (review hidden)` });
  }
  return unfeatured ? { ...review, unfeatured } : review;
}
