import { and, desc, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import type { WishlistItem } from "~/db/schema/wishlists/types";

import { db } from "~/db";
import { wishlistItemsTable } from "~/db/schema";

// keeping a soft cap avoids a single account filling the table with an
// unbounded number of rows; it is a product decision, not a hard db limit
const MAX_WISHLIST_ITEMS = 200;

export interface AddToWishlistInput {
  productCategory: string;
  productId: string;
  productImage: string;
  productName: string;
  productPrice: number;
  userId: string;
}

export interface ToggleResult {
  added: boolean;
  item: null | WishlistItem;
}

/**
 * List a user's wishlist, newest first. Returns the snapshotted product
 * fields so callers can render cards without touching the catalog.
 */
export async function getWishlistForUser(
  userId: string,
): Promise<WishlistItem[]> {
  return db.query.wishlistItemsTable.findMany({
    orderBy: desc(wishlistItemsTable.createdAt),
    where: eq(wishlistItemsTable.userId, userId),
  });
}

/**
 * The set of product ids a user has saved, useful for hydrating a "hearted"
 * state across a product grid in a single round-trip.
 */
export async function getWishlistProductIds(
  userId: string,
): Promise<string[]> {
  const rows = await db.query.wishlistItemsTable.findMany({
    columns: { productId: true },
    where: eq(wishlistItemsTable.userId, userId),
  });

  return rows.map((row) => row.productId);
}

/** Whether a specific product is already on the user's wishlist. */
export async function isProductInWishlist(
  userId: string,
  productId: string,
): Promise<boolean> {
  const existing = await db.query.wishlistItemsTable.findFirst({
    where: and(
      eq(wishlistItemsTable.productId, productId),
      eq(wishlistItemsTable.userId, userId),
    ),
  });

  return existing !== undefined;
}

/** How many products the user currently has saved. */
export async function countWishlistItems(userId: string): Promise<number> {
  const rows = await db.query.wishlistItemsTable.findMany({
    columns: { id: true },
    where: eq(wishlistItemsTable.userId, userId),
  });

  return rows.length;
}

/**
 * Add a product to the wishlist. Idempotent: adding a product that is
 * already saved returns the existing row rather than creating a duplicate
 * (the unique constraint would reject it anyway). Throws when the user is
 * already at the item cap.
 */
export async function addToWishlist(
  input: AddToWishlistInput,
): Promise<WishlistItem> {
  const {
    productCategory,
    productId,
    productImage,
    productName,
    productPrice,
    userId,
  } = input;

  if (!productId.trim()) {
    throw new Error("productId is required");
  }

  if (productPrice < 0) {
    throw new Error("productPrice cannot be negative");
  }

  const existing = await db.query.wishlistItemsTable.findFirst({
    where: and(
      eq(wishlistItemsTable.productId, productId),
      eq(wishlistItemsTable.userId, userId),
    ),
  });

  if (existing) {
    return existing;
  }

  const count = await countWishlistItems(userId);
  if (count >= MAX_WISHLIST_ITEMS) {
    throw new Error(
      `Wishlist is full (maximum ${MAX_WISHLIST_ITEMS} items). Remove something first.`,
    );
  }

  const id = uuidv4();

  await db.insert(wishlistItemsTable).values({
    createdAt: new Date(),
    id,
    productCategory,
    productId,
    productImage,
    productName,
    productPrice,
    userId,
  });

  const created = await db.query.wishlistItemsTable.findFirst({
    where: eq(wishlistItemsTable.id, id),
  });

  if (!created) {
    throw new Error("Failed to load wishlist item after creation");
  }

  return created;
}

/**
 * Remove a product from the wishlist. Idempotent: removing something that
 * is not saved is a no-op. Returns true when a row was actually deleted.
 */
export async function removeFromWishlist(
  userId: string,
  productId: string,
): Promise<boolean> {
  const existing = await db.query.wishlistItemsTable.findFirst({
    where: and(
      eq(wishlistItemsTable.productId, productId),
      eq(wishlistItemsTable.userId, userId),
    ),
  });

  if (!existing) {
    return false;
  }

  await db
    .delete(wishlistItemsTable)
    .where(
      and(
        eq(wishlistItemsTable.productId, productId),
        eq(wishlistItemsTable.userId, userId),
      ),
    );

  return true;
}

/**
 * Toggle a product on the wishlist: add it when missing, remove it when
 * present. Convenient for a single "heart" button that both saves and
 * unsaves. `added` says which way the toggle went.
 */
export async function toggleWishlistItem(
  input: AddToWishlistInput,
): Promise<ToggleResult> {
  const alreadySaved = await isProductInWishlist(input.userId, input.productId);

  if (alreadySaved) {
    await removeFromWishlist(input.userId, input.productId);
    return { added: false, item: null };
  }

  const item = await addToWishlist(input);
  return { added: true, item };
}

/**
 * Empty a user's wishlist. Returns the number of rows removed so callers
 * can surface a "cleared N items" message.
 */
export async function clearWishlist(userId: string): Promise<number> {
  const rows = await db.query.wishlistItemsTable.findMany({
    columns: { id: true },
    where: eq(wishlistItemsTable.userId, userId),
  });

  if (rows.length === 0) {
    return 0;
  }

  await db.delete(wishlistItemsTable).where(
    inArray(
      wishlistItemsTable.id,
      rows.map((row) => row.id),
    ),
  );

  return rows.length;
}
