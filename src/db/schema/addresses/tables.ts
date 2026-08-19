import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { userTable } from "../users/tables";

export const addressesTable = pgTable("addresses", {
  city: text("city").notNull(),
  country: text("country").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  fullName: text("full_name").notNull(),
  id: text("id").primaryKey(),
  isDefault: boolean("is_default").default(false).notNull(),
  label: text("label").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  postalCode: text("postal_code").notNull(),
  state: text("state").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});
