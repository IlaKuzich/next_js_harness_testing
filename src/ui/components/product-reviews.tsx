"use client";

import { Loader2, Star } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { useCurrentUser } from "~/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "~/ui/primitives/avatar";
import { Button } from "~/ui/primitives/button";
import { Input } from "~/ui/primitives/input";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface ReviewAuthor {
  id: string;
  image: null | string;
  name: string;
}

interface Review {
  body: string;
  createdAt: string;
  id: string;
  rating: number;
  title: string;
  user: ReviewAuthor;
  userId: string;
}

interface ProductReviewsProps {
  productId: string;
}

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 2000;
const RATING_VALUES = [1, 2, 3, 4, 5] as const;

/* -------------------------------------------------------------------------- */
/*                             Star rating control                            */
/* -------------------------------------------------------------------------- */

function StarRatingInput({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  const [hovered, setHovered] = React.useState<null | number>(null);

  return (
    <div className="flex items-center gap-1" role="radiogroup">
      {RATING_VALUES.map((star) => {
        const filled = (hovered ?? value) >= star;
        return (
          <button
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className="cursor-pointer"
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            role="radio"
            type="button"
          >
            <Star
              className={`
                h-6 w-6
                ${filled ? "fill-primary text-primary" : "text-muted-foreground"}
              `}
            />
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Review item                                 */
/* -------------------------------------------------------------------------- */

function ReviewItem({
  onDelete,
  review,
}: {
  onDelete: (id: string) => void;
  review: Review;
}) {
  const { user } = useCurrentUser();
  const isAuthor = user?.id === review.userId;

  return (
    <div className="flex gap-4 py-4">
      <Avatar>
        <AvatarImage alt={review.user.name} src={review.user.image ?? undefined} />
        <AvatarFallback>{review.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium">{review.user.name}</p>
            <div aria-label={`Rating ${review.rating} out of 5`} className="flex items-center">
              {RATING_VALUES.map((star) => (
                <Star
                  className={`
                    h-4 w-4
                    ${
                      star <= review.rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }
                  `}
                  key={star}
                />
              ))}
            </div>
          </div>

          {isAuthor && (
            <Button onClick={() => onDelete(review.id)} size="sm" variant="ghost">
              Delete
            </Button>
          )}
        </div>

        <p className="mt-2 font-semibold">{review.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useCurrentUser();

  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/reviews?productId=${encodeURIComponent(productId)}`,
        );
        const data = (await response.json()) as { error?: string; reviews: Review[] };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load reviews");
        }

        if (!cancelled) setReviews(data.reviews);
      } catch (error) {
        console.error("Error loading reviews:", error);
        toast.error("Couldn't load reviews for this product");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const alreadyReviewed = React.useMemo(
    () => reviews.some((review) => review.userId === user?.id),
    [reviews, user?.id],
  );

  const averageRating = React.useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }, [reviews]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (rating === 0) {
        toast.error("Please select a star rating");
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/reviews", {
          body: JSON.stringify({ body, productId, rating, title }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await response.json()) as { error?: string; review: Review };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to submit review");
        }

        setReviews((prev) => [data.review, ...prev]);
        setRating(0);
        setTitle("");
        setBody("");
        toast.success("Review submitted, thanks!");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to submit review";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [body, productId, rating, title],
  );

  const handleDelete = React.useCallback(async (reviewId: string) => {
    try {
      const response = await fetch(
        `/api/reviews?id=${encodeURIComponent(reviewId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete review");
      }

      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      toast.success("Review deleted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete review";
      toast.error(message);
    }
  }, []);

  return (
    <section className="mt-10">
      <Separator className="mb-8" />

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customer Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span>
              {averageRating.toFixed(1)} · {reviews.length} review
              {reviews.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {user && !alreadyReviewed && (
        <form className="mb-8 space-y-4 rounded-lg border p-4" onSubmit={handleSubmit}>
          <div>
            <p className="mb-2 text-sm font-medium">Your rating</p>
            <StarRatingInput onChange={setRating} value={rating} />
          </div>

          <Input
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Review title"
            required
            value={title}
          />

          <textarea
            className={`
              flex min-h-24 w-full rounded-md border border-input bg-transparent
              px-3 py-2 text-sm shadow-xs outline-none
              focus-visible:border-ring focus-visible:ring-[3px]
              focus-visible:ring-ring/50
            `}
            maxLength={MAX_BODY_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share your thoughts about this product"
            required
            value={body}
          />

          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit review"
            )}
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="divide-y">
          {reviews.map((review) => (
            <ReviewItem key={review.id} onDelete={handleDelete} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}
