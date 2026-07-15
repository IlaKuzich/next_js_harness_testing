import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { userTable } from "../users/tables";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  id: text("id").primaryKey(),
  shippingCity: text("shipping_city").notNull(),
  shippingCost: numeric("shipping_cost", {
    mode: "number",
    precision: 10,
    scale: 2,
  }).notNull(),
  shippingCountry: text("shipping_country").notNull(),
  shippingLine1: text("shipping_line1").notNull(),
  shippingLine2: text("shipping_line2"),
  shippingName: text("shipping_name").notNull(),
  shippingPostalCode: text("shipping_postal_code").notNull(),
  shippingState: text("shipping_state").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  subtotal: numeric("subtotal", {
    mode: "number",
    precision: 10,
    scale: 2,
  }).notNull(),
  tax: numeric("tax", { mode: "number", precision: 10, scale: 2 }).notNull(),
  total: numeric("total", {
    mode: "number",
    precision: 10,
    scale: 2,
  }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
});

export const orderItemsTable = pgTable("order_items", {
  id: text("id").primaryKey(),
  lineTotal: numeric("line_total", {
    mode: "number",
    precision: 10,
    scale: 2,
  }).notNull(),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productImage: text("product_image").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", {
    mode: "number",
    precision: 10,
    scale: 2,
  }).notNull(),
});
