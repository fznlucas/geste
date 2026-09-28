/** Reviews. The four "To moderate" are the AdminReviews board; the others feed "Real results". */
import { workId } from "./works";
import type { ReviewRow } from "./types";

export const reviews: ReviewRow[] = [
  { id: "rev-1", userId: "cus-hugo-petit", workId: workId(1), rating: 5, body: "Done in an afternoon with my daughter. Clear steps.", photoPath: "mock/work-01.jpg", status: "pending", createdAt: "2026-10-01T19:00:00Z" },
  { id: "rev-2", userId: "cus-emma-roux", workId: workId(5), rating: 4, body: "Layer 2 was tricky, the mud page saved me.", photoPath: null, status: "pending", createdAt: "2026-09-30T20:15:00Z" },
  { id: "rev-3", userId: "cus-chloe-garnier", workId: workId(3), rating: 5, body: "I did not believe I could paint this.", photoPath: "mock/work-03.jpg", status: "pending", createdAt: "2026-09-29T18:00:00Z" },
  { id: "rev-4", userId: "cus-tom-laurent", workId: workId(2), rating: 2, body: "Shopping list link was broken for the canvas.", photoPath: null, status: "pending", createdAt: "2026-10-01T10:05:00Z" },
  { id: "rev-5", userId: "cus-camille-martin", workId: workId(7), rating: 5, body: "Finished it in one Sunday. It is on my wall now, signed.", photoPath: "mock/work-07.jpg", status: "featured", createdAt: "2026-09-13T09:00:00Z" },
  { id: "rev-6", userId: "cus-lea-dubois", workId: workId(2), rating: 5, body: "My first painting since school. The drying timer kept me honest.", photoPath: "mock/work-02.jpg", status: "featured", createdAt: "2026-09-14T11:30:00Z" },
  { id: "rev-7", userId: "cus-tom-laurent", workId: workId(9), rating: 5, body: "Bought the budget list. I cannot see the difference.", photoPath: "mock/work-09.jpg", status: "published", createdAt: "2026-09-18T08:45:00Z" },
  { id: "rev-8", userId: "cus-nina-keller", workId: workId(11), rating: 4, body: "Long, but the layers make it feel possible.", photoPath: null, status: "published", createdAt: "2026-09-27T21:10:00Z" },
  { id: "rev-9", userId: "cus-yanis-benali", workId: workId(10), rating: 1, body: "test", photoPath: null, status: "hidden", createdAt: "2026-09-17T13:00:00Z" },
];
