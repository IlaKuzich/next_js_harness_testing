import { relations } from "drizzle-orm";

import { userTable } from "../users/tables";
import { wishlistItemsTable } from "./tables";

export const wishlistItemsRelations = relations(
  wishlistItemsTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [wishlistItemsTable.userId],
      references: [userTable.id],
    }),
  }),
);
