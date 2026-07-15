import { NextRequest, NextResponse } from "next/server";

import {
  createReview,
  deleteReview,
  getReviewsForProduct,
} from "~/api/reviews/service";
import { getCurrentUser } from "~/lib/auth";

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 2000;

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");

  if (!productId) {
    return NextResponse.json(
      { error: "productId query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const reviews = await getReviewsForProduct(productId);
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as null | Partial<{
    body: string;
    productId: string;
    rating: number;
    title: string;
  }>;

  if (
    !payload ||
    typeof payload.productId !== "string" ||
    typeof payload.title !== "string" ||
    typeof payload.body !== "string" ||
    typeof payload.rating !== "number"
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { body, productId, rating, title } = payload;

  if (!productId.trim() || !title.trim() || !body.trim()) {
    return NextResponse.json(
      { error: "productId, title, and body are required" },
      { status: 400 },
    );
  }

  if (title.length > MAX_TITLE_LENGTH || body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Title/body exceed the maximum length (${MAX_TITLE_LENGTH}/${MAX_BODY_LENGTH})` },
      { status: 400 },
    );
  }

  try {
    const review = await createReview({
      body,
      productId,
      rating,
      title,
      userId: user.id,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create review";
    console.error("Error creating review:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const reviewId = request.nextUrl.searchParams.get("id");

  if (!reviewId) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 },
    );
  }

  try {
    await deleteReview(reviewId, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete review";
    console.error("Error deleting review:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
