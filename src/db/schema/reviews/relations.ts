import { relations } from "drizzle-orm";

import { userTable } from "../users/tables";
import { reviewsTable } from "./tables";

export const reviewsRelations = relations(reviewsTable, ({ one }) => ({
  user: one(userTable, {
    fields: [reviewsTable.userId],
    references: [userTable.id],
  }),
}));
