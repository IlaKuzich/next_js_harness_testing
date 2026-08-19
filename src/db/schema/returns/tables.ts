import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { orderItemsTable, ordersTable } from "../orders/tables";
import { userTable } from "../users/tables";

export const returnStatusEnum = pgEnum("return_status", [
  "requested",
  "approved",
  "rejected",
  "refunded",
  "cancelled",
]);

export const returnsTable = pgTable("returns", {
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  refundAmount: numeric("refund_amount", {
    mode: "number",
    precision: 10,
    scale: 2,
  }).notNull(),
  status: returnStatusEnum("status").default("requested").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});

export const returnItemsTable = pgTable("return_items", {
  id: text("id").primaryKey(),
  orderItemId: text("order_item_id")
    .notNull()
    .references(() => orderItemsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  returnId: text("return_id")
    .notNull()
    .references(() => returnsTable.id, { onDelete: "cascade" }),
});
