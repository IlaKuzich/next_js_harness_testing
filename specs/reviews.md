# reviews

product reviews and ratings. business logic lives in `src/api/reviews/service.ts`, exposed
over http at `src/app/api/reviews/route.ts`.

## data model

- `reviews` — one row per review, referencing the product and the author (`userId`).
  each review carries a `rating`, a `title`, and a `body`.

## rules

- **rating range** — an integer from `1` to `5` inclusive. anything else is rejected.
- **one per user per product** — a user can leave at most one review for a given product.
  `hasUserReviewedProduct(productId, userId)` backs this check, and `createReview` throws
  if a duplicate is attempted.
- **author-only delete** — `deleteReview(reviewId, userId)` only removes the review when
  the caller is its author; otherwise it throws.

`title` and `body` are trimmed on write.

## service functions

- `getReviewsForProduct(productId)` — newest first, each with the reviewer's public
  profile fields (`id`, `name`, `image`).
- `hasUserReviewedProduct(productId, userId)` — boolean duplicate check.
- `createReview(input)` — validates the rating and duplicate rule, inserts, and returns the
  created review with the reviewer's public profile.
- `deleteReview(reviewId, userId)` — author-only delete.

## endpoints

reviews are served from `src/app/api/reviews/route.ts`. validation errors from the service
(invalid rating, duplicate review, deleting someone else's review) are mapped to `4xx`
responses by the handler.
