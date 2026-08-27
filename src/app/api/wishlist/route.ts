import { NextRequest, NextResponse } from "next/server";

import {
  addToWishlist,
  clearWishlist,
  getWishlistForUser,
  getWishlistProductIds,
  removeFromWishlist,
  toggleWishlistItem,
} from "~/api/wishlist/service";
import { getCurrentUser } from "~/lib/auth";

const MAX_NAME_LENGTH = 200;

interface WishlistPayload {
  productCategory?: string;
  productId?: string;
  productImage?: string;
  productName?: string;
  productPrice?: number;
  // when true the endpoint toggles instead of always adding, so a single
  // heart button can both save and unsave without the client tracking state
  toggle?: boolean;
}

/**
 * GET /api/wishlist            -> the current user's full wishlist
 * GET /api/wishlist?ids=1      -> just the saved product ids (for grids)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const idsOnly = request.nextUrl.searchParams.get("ids") === "1";

  try {
    if (idsOnly) {
      const productIds = await getWishlistProductIds(user.id);
      return NextResponse.json({ productIds });
    }

    const items = await getWishlistForUser(user.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/wishlist -> add (or toggle) a product on the wishlist.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const payload = (await request
    .json()
    .catch(() => null)) as null | WishlistPayload;

  if (
    !payload ||
    typeof payload.productId !== "string" ||
    typeof payload.productName !== "string" ||
    typeof payload.productImage !== "string" ||
    typeof payload.productCategory !== "string" ||
    typeof payload.productPrice !== "number"
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!payload.productId.trim() || !payload.productName.trim()) {
    return NextResponse.json(
      { error: "productId and productName are required" },
      { status: 400 },
    );
  }

  if (payload.productName.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `productName exceeds the maximum length (${MAX_NAME_LENGTH})` },
      { status: 400 },
    );
  }

  if (!Number.isFinite(payload.productPrice) || payload.productPrice < 0) {
    return NextResponse.json(
      { error: "productPrice must be a non-negative number" },
      { status: 400 },
    );
  }

  const input = {
    productCategory: payload.productCategory,
    productId: payload.productId,
    productImage: payload.productImage,
    productName: payload.productName,
    productPrice: payload.productPrice,
    userId: user.id,
  };

  try {
    if (payload.toggle) {
      const result = await toggleWishlistItem(input);
      return NextResponse.json(result, { status: 200 });
    }

    const item = await addToWishlist(input);
    return NextResponse.json({ added: true, item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update wishlist";
    console.error("Error updating wishlist:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/wishlist?productId=x -> remove one product
 * DELETE /api/wishlist?all=1       -> clear the whole wishlist
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const params = request.nextUrl.searchParams;
  const clearAll = params.get("all") === "1";
  const productId = params.get("productId");

  try {
    if (clearAll) {
      const removed = await clearWishlist(user.id);
      return NextResponse.json({ removed, success: true });
    }

    if (!productId) {
      return NextResponse.json(
        { error: "productId query parameter is required" },
        { status: 400 },
      );
    }

    const removed = await removeFromWishlist(user.id, productId);
    return NextResponse.json({ removed, success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update wishlist";
    console.error("Error removing from wishlist:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
