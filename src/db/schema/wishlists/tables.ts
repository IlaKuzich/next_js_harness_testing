import {
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { userTable } from "../users/tables";

// wishlist rows snapshot the product the same way order items do: products
// are static/demo data today (see src/app/products) so there is no products
// table to reference, and keeping a snapshot means the wishlist still renders
// even if the catalog entry later changes or disappears.
export const wishlistItemsTable = pgTable(
  "wishlist_items",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    productCategory: text("product_category").notNull(),
    productId: text("product_id").notNull(),
    productImage: text("product_image").notNull(),
    productName: text("product_name").notNull(),
    productPrice: numeric("product_price", {
      mode: "number",
      precision: 10,
      scale: 2,
    }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    // one row per user/product pair so "add" is idempotent and we never
    // show the same product twice on a wishlist
    unique("wishlist_items_user_product_unique").on(
      table.userId,
      table.productId,
    ),
  ],
);
