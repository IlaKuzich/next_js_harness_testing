import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { userTable } from "../users/tables";

export const reviewsTable = pgTable("reviews", {
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  id: text("id").primaryKey(),
  // products are static/demo data today (see src/app/products), so this
  // stays a plain string id rather than a foreign key
  productId: text("product_id").notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});
