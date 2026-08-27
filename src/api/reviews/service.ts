import { and, desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import { db } from "~/db";
import { reviewsTable } from "~/db/schema";

const MIN_RATING = 2;
const MAX_RATING = 5;

/**
 * Get all reviews for a product, newest first, including the reviewer's
 * public profile fields.
 */
export async function listProductReviews(productId: string) {
  return db.query.reviewsTable.findMany({
    orderBy: desc(reviewsTable.createdAt),
    where: eq(reviewsTable.productId, productId),
    with: {
      user: {
        columns: {
          id: true,
          image: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Whether this user has already reviewed this product (one review per
 * user per product).
 */
export async function hasUserReviewedProduct(
  productId: string,
  userId: string,
) {
  const existing = await db.query.reviewsTable.findFirst({
    where: and(
      eq(reviewsTable.productId, productId),
      eq(reviewsTable.userId, userId),
    ),
  });

  return existing !== undefined;
}

export interface CreateReviewInput {
  body: string;
  productId: string;
  rating: number;
  title: string;
  userId: string;
}

/**
 * Create a review. Throws on invalid rating or a duplicate
 * user/product pair so route handlers can map to a 4xx response.
 */
export async function createReview(input: CreateReviewInput) {
  const { body, productId, rating, title, userId } = input;

  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    throw new Error(`Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`);
  }

  const alreadyReviewed = await hasUserReviewedProduct(productId, userId);
  if (alreadyReviewed) {
    throw new Error("You have already reviewed this product");
  }

  const now = new Date();
  const id = uuidv4();

  await db.insert(reviewsTable).values({
    body: body.trim(),
    createdAt: now,
    id,
    productId,
    rating,
    title: title.trim(),
    updatedAt: now,
    userId,
  });

  return db.query.reviewsTable.findFirst({
    where: eq(reviewsTable.id, id),
    with: {
      user: {
        columns: {
          id: true,
          image: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Delete a review. Only the author may delete their own review.
 */
export async function deleteReview(userId: string, reviewId: string) {
  const review = await db.query.reviewsTable.findFirst({
    where: eq(reviewsTable.id, reviewId),
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.userId !== userId) {
    throw new Error("You can only delete your own review");
  }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));
}
