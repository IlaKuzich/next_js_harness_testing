import { relations } from "drizzle-orm";

import { orderItemsTable, ordersTable } from "../orders/tables";
import { userTable } from "../users/tables";
import { returnItemsTable, returnsTable } from "./tables";

export const returnsRelations = relations(returnsTable, ({ many, one }) => ({
  items: many(returnItemsTable),
  order: one(ordersTable, {
    fields: [returnsTable.orderId],
    references: [ordersTable.id],
  }),
  user: one(userTable, {
    fields: [returnsTable.userId],
    references: [userTable.id],
  }),
}));

export const returnItemsRelations = relations(returnItemsTable, ({ one }) => ({
  orderItem: one(orderItemsTable, {
    fields: [returnItemsTable.orderItemId],
    references: [orderItemsTable.id],
  }),
  return: one(returnsTable, {
    fields: [returnItemsTable.returnId],
    references: [returnsTable.id],
  }),
}));
