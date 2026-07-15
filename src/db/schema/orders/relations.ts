import { relations } from "drizzle-orm";

import { userTable } from "../users/tables";
import { orderItemsTable, ordersTable } from "./tables";

export const ordersRelations = relations(ordersTable, ({ many, one }) => ({
  items: many(orderItemsTable),
  user: one(userTable, {
    fields: [ordersTable.userId],
    references: [userTable.id],
  }),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.orderId],
    references: [ordersTable.id],
  }),
}));
